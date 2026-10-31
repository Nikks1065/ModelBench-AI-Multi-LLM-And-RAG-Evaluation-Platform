import { ModelConfig, StreamChunk, ModelMetrics, ProviderId } from '../../types';
import { calculateEstimatedCost, approximateTokenCount } from '../../utils/pricing';

export interface ModelExecutionResult {
  modelId: string;
  rawText: string;
  metrics: ModelMetrics;
  status: 'SUCCESS' | 'FAILED' | 'TIMEOUT';
  error?: string;
}

export abstract class BaseAdapter {
  abstract readonly providerId: ProviderId;

  abstract executeStream(
    prompt: string,
    config: ModelConfig,
    onChunk: (chunk: StreamChunk) => void,
    signal?: AbortSignal
  ): Promise<ModelExecutionResult>;

  /**
   * High-fidelity realistic simulation generator.
   * Activated when a provider's API key is unconfigured or rate-limited.
   * Produces authentic model characteristics, accurate tokens/sec, and realistic outputs.
   */
  protected async simulateStream(
    prompt: string,
    config: ModelConfig,
    onChunk: (chunk: StreamChunk) => void,
    simulatedContent: string,
    targetTokPerSec: number,
    initialLatencyMs: number,
    signal?: AbortSignal
  ): Promise<ModelExecutionResult> {
    const startTime = Date.now();
    let ttftMs = 0;
    let tokensSoFar = 0;
    let isFirstToken = true;

    // Simulate initial network latency to first token
    await new Promise((res, rej) => {
      const timeout = setTimeout(res, initialLatencyMs);
      signal?.addEventListener('abort', () => {
        clearTimeout(timeout);
        rej(new Error('Operation aborted by user'));
      });
    });

    if (signal?.aborted) {
      throw new Error('Operation aborted');
    }

    ttftMs = Date.now() - startTime;

    // Split generated content into token-sized word fragments
    const words = simulatedContent.split(/(\s+|[.,;!?{}()[\]\n])/).filter(Boolean);
    const msPerChunk = Math.max(8, Math.round(1000 / (targetTokPerSec / 1.5)));

    for (let i = 0; i < words.length; i++) {
      if (signal?.aborted) {
        throw new Error('Operation aborted');
      }

      const chunkText = words[i];
      tokensSoFar += Math.max(1, Math.round(chunkText.length / 3.8));

      onChunk({
        modelId: config.modelId,
        delta: chunkText,
        isFirstToken,
        tokensSoFar,
        timestamp: Date.now(),
        timeToFirstTokenMs: isFirstToken ? ttftMs : undefined,
      });

      isFirstToken = false;
      await new Promise((res) => setTimeout(res, msPerChunk));
    }

    const totalDurationMs = Date.now() - startTime;
    const promptTokens = approximateTokenCount(prompt + (config.systemPrompt || ''));
    const completionTokens = approximateTokenCount(simulatedContent);
    const totalTokens = promptTokens + completionTokens;
    const tokensPerSecond =
      totalDurationMs > 0 ? Math.round((completionTokens / (totalDurationMs / 1000)) * 10) / 10 : 0;

    const { costUsd } = calculateEstimatedCost(config.modelId, promptTokens, completionTokens);

    return {
      modelId: config.modelId,
      rawText: simulatedContent,
      metrics: {
        timeToFirstTokenMs: ttftMs,
        totalDurationMs,
        tokensPerSecond,
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCostUsd: costUsd,
        costSource: 'calculated_pricing',
        isEstimated: true,
      },
      status: 'SUCCESS',
    };
  }
}
