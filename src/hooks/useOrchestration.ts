import { useState, useRef, useCallback } from 'react';
import { ModelResponse, TaskCategory, ExperimentRun } from '../types';

export interface RunState {
  experimentId: string | null;
  runId: string | null;
  status: 'IDLE' | 'STARTING' | 'STREAMING' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
  prompt: string;
  responses: Record<string, ModelResponse>;
  bestModelId?: string;
  judgeVerdict?: string;
  judgeExplanation?: string;
  totalDurationMs?: number;
  error?: string;
}

export function useOrchestration() {
  const [state, setState] = useState<RunState>({
    experimentId: null,
    runId: null,
    status: 'IDLE',
    prompt: '',
    responses: {},
  });

  const eventSourceRef = useRef<EventSource | null>(null);

  const cancelRun = useCallback(async () => {
    if (state.experimentId) {
      try {
        await fetch(`/api/orchestration/cancel/${state.experimentId}`, { method: 'POST' });
      } catch (err) {
        console.error('Cancel request error:', err);
      }
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setState((prev) => ({ ...prev, status: 'CANCELLED' }));
  }, [state.experimentId]);

  const runExperiment = useCallback(
    async (params: {
      prompt: string;
      systemPrompt?: string;
      modelIds: string[];
      temperature: number;
      maxTokens: number;
      category?: TaskCategory;
      runJudge?: boolean;
    }) => {
      // Close any active event source
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      const initialResponses: Record<string, ModelResponse> = {};
      for (const mId of params.modelIds) {
        initialResponses[mId] = {
          id: `resp-${mId}`,
          runId: '',
          modelId: mId,
          rawText: '',
          status: 'PENDING',
          startedAt: Date.now(),
        };
      }

      setState({
        experimentId: null,
        runId: null,
        status: 'STARTING',
        prompt: params.prompt,
        responses: initialResponses,
      });

      try {
        const res = await fetch('/api/orchestration/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${res.status}`);
        }

        const data = await res.json();
        const { experimentId, runId } = data;

        setState((prev) => ({
          ...prev,
          experimentId,
          runId,
          status: 'STREAMING',
        }));

        // Connect to SSE stream
        const eventSource = new EventSource(`/api/orchestration/stream/${experimentId}`);
        eventSourceRef.current = eventSource;

        eventSource.addEventListener('token', (e: MessageEvent) => {
          try {
            const chunk = JSON.parse(e.data);
            setState((prev) => {
              const currentResp = prev.responses[chunk.modelId];
              if (!currentResp) return prev;

              return {
                ...prev,
                responses: {
                  ...prev.responses,
                  [chunk.modelId]: {
                    ...currentResp,
                    status: 'STREAMING',
                    rawText: currentResp.rawText + chunk.delta,
                    metrics: currentResp.metrics
                      ? {
                          ...currentResp.metrics,
                          timeToFirstTokenMs:
                            currentResp.metrics.timeToFirstTokenMs || chunk.timeToFirstTokenMs || 0,
                          completionTokens: chunk.tokensSoFar,
                        }
                      : {
                          timeToFirstTokenMs: chunk.timeToFirstTokenMs || 0,
                          totalDurationMs: 0,
                          tokensPerSecond: 0,
                          promptTokens: 0,
                          completionTokens: chunk.tokensSoFar,
                          totalTokens: chunk.tokensSoFar,
                          estimatedCostUsd: 0,
                          costSource: 'calculated_pricing',
                          isEstimated: true,
                        },
                  },
                },
              };
            });
          } catch (err) {
            console.error('Error parsing token chunk:', err);
          }
        });

        eventSource.addEventListener('model_complete', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            setState((prev) => {
              const currentResp = prev.responses[data.modelId];
              if (!currentResp) return prev;

              return {
                ...prev,
                responses: {
                  ...prev.responses,
                  [data.modelId]: {
                    ...currentResp,
                    status: 'SUCCESS',
                    rawText: data.text || currentResp.rawText,
                    metrics: data.metrics,
                    finishedAt: Date.now(),
                  },
                },
              };
            });
          } catch (err) {
            console.error('Error parsing model_complete:', err);
          }
        });

        eventSource.addEventListener('model_error', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            if (data.modelId) {
              setState((prev) => {
                const currentResp = prev.responses[data.modelId];
                if (!currentResp) return prev;
                return {
                  ...prev,
                  responses: {
                    ...prev.responses,
                    [data.modelId]: {
                      ...currentResp,
                      status: data.status || 'FAILED',
                      errorMessage: data.error,
                      finishedAt: Date.now(),
                    },
                  },
                };
              });
            }
          } catch (err) {
            console.error('Error parsing model_error:', err);
          }
        });

        eventSource.addEventListener('evaluation_complete', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            setState((prev) => {
              const updatedResponses = { ...prev.responses };
              for (const [mId, evaluation] of Object.entries(data.evaluations || {})) {
                if (updatedResponses[mId]) {
                  updatedResponses[mId] = {
                    ...updatedResponses[mId],
                    evaluation: evaluation as any,
                  };
                }
              }

              return {
                ...prev,
                responses: updatedResponses,
                bestModelId: data.winnerModelId,
                judgeVerdict: data.verdict,
                judgeExplanation: data.judgeExplanation,
              };
            });
          } catch (err) {
            console.error('Error parsing evaluation_complete:', err);
          }
        });

        eventSource.addEventListener('experiment_complete', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            setState((prev) => ({
              ...prev,
              status: 'COMPLETED',
              totalDurationMs: data.totalDurationMs,
            }));
            eventSource.close();
            eventSourceRef.current = null;
          } catch (err) {
            console.error('Error parsing experiment_complete:', err);
          }
        });

        eventSource.onerror = (err) => {
          console.warn('SSE stream closed or encountered error:', err);
          eventSource.close();
          eventSourceRef.current = null;
          setState((prev) => (prev.status === 'STREAMING' ? { ...prev, status: 'COMPLETED' } : prev));
        };
      } catch (err: any) {
        setState((prev) => ({
          ...prev,
          status: 'FAILED',
          error: err.message || 'Failed to start benchmark experiment.',
        }));
      }
    },
    []
  );

  const retryJudge = useCallback(async () => {
    if (!state.runId) return;
    try {
      const res = await fetch('/api/evaluations/judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId: state.runId }),
      });
      if (!res.ok) throw new Error('Evaluation request failed');
      const data = await res.json();
      const report = data.report;

      setState((prev) => {
        const updatedResponses = { ...prev.responses };
        for (const [mId, evaluation] of Object.entries(report.evaluations || {})) {
          if (updatedResponses[mId]) {
            updatedResponses[mId] = {
              ...updatedResponses[mId],
              evaluation: evaluation as any,
            };
          }
        }
        return {
          ...prev,
          responses: updatedResponses,
          bestModelId: report.winnerModelId,
          judgeVerdict: report.verdict,
          judgeExplanation: report.judgeExplanation,
        };
      });
    } catch (err: any) {
      console.error('Failed to rerun judge:', err);
    }
  }, [state.runId]);

  return {
    state,
    runExperiment,
    cancelRun,
    retryJudge,
    loadRunIntoWorkspace: (run: ExperimentRun) => {
      setState({
        experimentId: run.experimentId,
        runId: run.id,
        status: run.status === 'COMPLETED' ? 'COMPLETED' : 'IDLE',
        prompt: run.prompt,
        responses: run.responses,
        bestModelId: run.bestModelId,
        judgeVerdict: run.judgeVerdict,
        judgeExplanation: run.judgeExplanation,
        totalDurationMs: run.totalDurationMs,
      });
    },
  };
}
