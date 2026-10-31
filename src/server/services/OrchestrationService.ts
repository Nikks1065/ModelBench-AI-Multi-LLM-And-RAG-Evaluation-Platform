import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  ExperimentRun,
  ModelResponse,
  StreamChunk,
  TaskCategory,
  SSEMessage,
} from '../../types';
import { adapterRegistry, INITIAL_MODELS } from '../adapters';
import { judgeService } from './JudgeService';
import { storageService } from './StorageService';

export interface RunOptions {
  prompt: string;
  systemPrompt?: string;
  modelIds: string[];
  temperature?: number;
  maxTokens?: number;
  category?: TaskCategory;
  runJudge?: boolean;
}

export class OrchestrationService {
  private activeStreams: Map<string, EventEmitter> = new Map();
  private abortControllers: Map<string, AbortController> = new Map();

  /**
   * Initializes and executes multi-model parallel benchmark run
   */
  async startExperimentRun(options: RunOptions): Promise<{ experimentId: string; runId: string }> {
    const experimentId = uuidv4();
    const runId = uuidv4();
    const abortController = new AbortController();
    const emitter = new EventEmitter();

    this.activeStreams.set(experimentId, emitter);
    this.abortControllers.set(experimentId, abortController);

    const modelIds = options.modelIds && options.modelIds.length > 0
      ? options.modelIds
      : INITIAL_MODELS.map((m) => m.id);

    const initialResponses: Record<string, ModelResponse> = {};
    for (const mId of modelIds) {
      initialResponses[mId] = {
        id: uuidv4(),
        runId,
        modelId: mId,
        rawText: '',
        status: 'PENDING',
        startedAt: Date.now(),
      };
    }

    const run: ExperimentRun = {
      id: runId,
      experimentId,
      prompt: options.prompt,
      systemPrompt: options.systemPrompt,
      category: options.category || 'general',
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens ?? 1024,
      triggeredAt: Date.now(),
      status: 'RUNNING',
      responses: initialResponses,
    };

    // Save initial state to storage
    storageService.saveRun(run);

    // Fire asynchronous background worker
    this.executeParallelBatch(experimentId, run, options, abortController.signal).catch((err) => {
      console.error(`[OrchestrationService] Batch execution error on ${experimentId}:`, err);
    });

    return { experimentId, runId };
  }

  /**
   * Subscribes a client to SSE events for a specific experiment
   */
  subscribeToStream(experimentId: string, listener: (msg: SSEMessage) => void): () => void {
    let emitter = this.activeStreams.get(experimentId);
    if (!emitter) {
      emitter = new EventEmitter();
      this.activeStreams.set(experimentId, emitter);
    }

    const onMessage = (msg: SSEMessage) => listener(msg);
    emitter.on('event', onMessage);

    return () => {
      emitter?.off('event', onMessage);
    };
  }

  /**
   * Cancels an ongoing benchmark execution
   */
  cancelExperiment(experimentId: string): boolean {
    const controller = this.abortControllers.get(experimentId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(experimentId);

      const emitter = this.activeStreams.get(experimentId);
      if (emitter) {
        emitter.emit('event', {
          event: 'model_error',
          data: { error: 'Experiment cancelled by user request.' },
        });
      }
      return true;
    }
    return false;
  }

  private async executeParallelBatch(
    experimentId: string,
    run: ExperimentRun,
    options: RunOptions,
    signal: AbortSignal
  ): Promise<void> {
    const emitter = this.activeStreams.get(experimentId);

    // Emit init event
    emitter?.emit('event', {
      event: 'init',
      data: {
        experimentId,
        runId: run.id,
        models: Object.keys(run.responses),
        timestamp: Date.now(),
      },
    });

    const modelPromises = Object.keys(run.responses).map(async (modelId) => {
      const responseRecord = run.responses[modelId];
      responseRecord.status = 'STREAMING';

      try {
        const adapter = adapterRegistry.getAdapterForModel(modelId, INITIAL_MODELS);

        // Per-model timeout wrapper (30 seconds)
        const timeoutController = new AbortController();
        const timeoutId = setTimeout(() => timeoutController.abort(), 35000);

        const combinedAbort = () => {
          timeoutController.abort();
        };
        signal.addEventListener('abort', combinedAbort);

        const execResult = await adapter.executeStream(
          options.prompt,
          {
            modelId,
            providerId: INITIAL_MODELS.find((m) => m.id === modelId)!.providerId,
            temperature: options.temperature,
            maxTokens: options.maxTokens,
            systemPrompt: options.systemPrompt,
          },
          (chunk: StreamChunk) => {
            responseRecord.rawText += chunk.delta;
            emitter?.emit('event', {
              event: 'token',
              data: chunk,
            });
          },
          timeoutController.signal
        );

        clearTimeout(timeoutId);
        signal.removeEventListener('abort', combinedAbort);

        responseRecord.status = 'SUCCESS';
        responseRecord.finishedAt = Date.now();
        responseRecord.metrics = execResult.metrics;
        responseRecord.rawText = execResult.rawText;

        emitter?.emit('event', {
          event: 'model_complete',
          data: {
            modelId,
            metrics: execResult.metrics,
            text: execResult.rawText,
          },
        });
      } catch (err: any) {
        const isTimeout = err.name === 'AbortError' || err.message?.includes('aborted');
        responseRecord.status = isTimeout ? 'TIMEOUT' : 'FAILED';
        responseRecord.errorMessage = err.message || 'Unknown execution error';
        responseRecord.finishedAt = Date.now();

        emitter?.emit('event', {
          event: 'model_error',
          data: {
            modelId,
            status: responseRecord.status,
            error: responseRecord.errorMessage,
          },
        });
      }
    });

    // Await all parallel models (Provider failure isolation via Promise.allSettled)
    await Promise.allSettled(modelPromises);

    run.status = 'COMPLETED';
    run.completedAt = Date.now();
    run.totalDurationMs = run.completedAt - run.triggeredAt;

    // Optional / Automatic AI Judge evaluation
    if (options.runJudge !== false) {
      try {
        const judgeReport = await judgeService.evaluateRun(
          run.prompt,
          run.systemPrompt,
          run.responses
        );

        for (const [mId, evaluation] of Object.entries(judgeReport.evaluations)) {
          if (run.responses[mId]) {
            run.responses[mId].evaluation = evaluation;
          }
        }
        run.bestModelId = judgeReport.winnerModelId || undefined;
        run.judgeVerdict = judgeReport.verdict;
        run.judgeExplanation = judgeReport.judgeExplanation;

        emitter?.emit('event', {
          event: 'evaluation_complete',
          data: judgeReport,
        });
      } catch (judgeErr: any) {
        console.warn('[OrchestrationService] AI Judge evaluation failed:', judgeErr.message);
      }
    }

    // Save final run with metrics and judge results
    storageService.saveRun(run);

    emitter?.emit('event', {
      event: 'experiment_complete',
      data: {
        runId: run.id,
        experimentId,
        completedAt: run.completedAt,
        totalDurationMs: run.totalDurationMs,
      },
    });

    // Cleanup abort controllers
    this.abortControllers.delete(experimentId);
  }
}

export const orchestrationService = new OrchestrationService();
