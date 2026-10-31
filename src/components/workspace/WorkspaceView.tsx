import React, { useState, useEffect } from 'react';
import { PromptEditor } from './PromptEditor';
import { ModelPanel } from './ModelPanel';
import { ResponseModal } from './ResponseModal';
import { JudgeScorecard } from '../evaluation/JudgeScorecard';
import { Model, ModelResponse, TaskCategory, ExperimentRun } from '../../types';
import { useOrchestration } from '../../hooks/useOrchestration';
import { Clock, Zap, DollarSign, Award, Layers } from 'lucide-react';
import { formatUsd } from '../../utils/pricing';

interface WorkspaceViewProps {
  initialPrompt?: string;
  initialRun?: ExperimentRun | null;
  onResponsesUpdate?: (responses: Record<string, ModelResponse>) => void;
}

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  initialPrompt,
  initialRun,
  onResponsesUpdate,
}) => {
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [expandedModel, setExpandedModel] = useState<Model | null>(null);
  const [expandedResponse, setExpandedResponse] = useState<ModelResponse | null>(null);

  const { state, runExperiment, cancelRun, retryJudge, loadRunIntoWorkspace } =
    useOrchestration();

  useEffect(() => {
    fetch('/api/models')
      .then((res) => res.json())
      .then((data) => {
        const loadedModels: Model[] = data.models || [];
        setModels(loadedModels);
        setSelectedModelIds(loadedModels.filter((m) => m.isActive).map((m) => m.id));
      })
      .catch((err) => console.error('Failed to load models:', err));
  }, []);

  useEffect(() => {
    if (initialRun) {
      loadRunIntoWorkspace(initialRun);
    }
  }, [initialRun]);

  useEffect(() => {
    if (onResponsesUpdate) {
      onResponsesUpdate(state.responses);
    }
  }, [state.responses, onResponsesUpdate]);

  const handleToggleModel = (mId: string) => {
    setSelectedModelIds((prev) =>
      prev.includes(mId) ? prev.filter((id) => id !== mId) : [...prev, mId]
    );
  };

  const handleExpand = (model: Model, response: ModelResponse) => {
    setExpandedModel(model);
    setExpandedResponse(response);
  };

  // Compute live summary aggregates
  const completedResponses = Object.values(state.responses).filter(
    (r) => r.status === 'SUCCESS' && r.metrics
  );

  const totalCost = completedResponses.reduce(
    (acc, curr) => acc + (curr.metrics?.estimatedCostUsd || 0),
    0
  );

  const avgTtft =
    completedResponses.length > 0
      ? Math.round(
          completedResponses.reduce(
            (acc, curr) => acc + (curr.metrics?.timeToFirstTokenMs || 0),
            0
          ) / completedResponses.length
        )
      : 0;

  const fastestThroughputModel = [...completedResponses].sort(
    (a, b) => (b.metrics?.tokensPerSecond || 0) - (a.metrics?.tokensPerSecond || 0)
  )[0];

  const selectedModelsList = models.filter((m) => selectedModelIds.includes(m.id));

  return (
    <div className="space-y-6">
      {/* Prompt Editor & Parameter Controls */}
      <PromptEditor
        models={models}
        selectedModelIds={selectedModelIds}
        onToggleModel={handleToggleModel}
        onSubmit={runExperiment}
        onCancel={cancelRun}
        isStreaming={state.status === 'STREAMING'}
      />

      {/* Aggregate Live Comparative Metrics Header - Amber & Emerald */}
      {completedResponses.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-stone-800 bg-[#121216] p-3.5 backdrop-blur-sm flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-950/60 border border-orange-800/80 text-orange-400">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[10px] text-stone-400 font-mono uppercase">Avg TTFT</div>
              <div className="font-mono text-sm font-bold text-stone-100 tabular-nums">{avgTtft}ms</div>
            </div>
          </div>

          <div className="rounded-xl border border-stone-800 bg-[#121216] p-3.5 backdrop-blur-sm flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-800/80 text-amber-400">
              <Zap className="h-4 w-4" />
            </div>
            <div className="truncate">
              <div className="text-[10px] text-stone-400 font-mono uppercase">Top Throughput</div>
              <div className="font-mono text-sm font-bold text-amber-300 truncate tabular-nums">
                {fastestThroughputModel
                  ? `${fastestThroughputModel.metrics?.tokensPerSecond} t/s`
                  : '—'}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-stone-800 bg-[#121216] p-3.5 backdrop-blur-sm flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-400">
              <DollarSign className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[10px] text-stone-400 font-mono uppercase">Total Run Cost</div>
              <div className="font-mono text-sm font-bold text-emerald-400 tabular-nums">{formatUsd(totalCost)}</div>
            </div>
          </div>

          <div className="rounded-xl border border-stone-800 bg-[#121216] p-3.5 backdrop-blur-sm flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-800/80 text-amber-400">
              <Award className="h-4 w-4" />
            </div>
            <div className="truncate">
              <div className="text-[10px] text-stone-400 font-mono uppercase">Judge Winner</div>
              <div className="font-mono text-sm font-bold text-amber-300 truncate">
                {state.bestModelId || 'Evaluating...'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5-Model Side-by-Side Response Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-stone-400 px-1">
          <div className="flex items-center gap-2 font-medium">
            <Layers className="h-4 w-4 text-amber-400" />
            <span className="text-stone-200">Parallel Model Response Panels ({selectedModelsList.length} Active)</span>
          </div>
          <span className="font-mono text-[11px] text-stone-400">
            {state.status === 'STREAMING'
              ? 'Streaming in progress...'
              : state.status === 'COMPLETED'
              ? `All responses completed in ${state.totalDurationMs || 0}ms`
              : 'Submit a benchmark to stream'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {selectedModelsList.map((model) => {
            const resp = state.responses[model.id];
            const isWinner = state.bestModelId === model.id;
            return (
              <ModelPanel
                key={model.id}
                model={model}
                response={resp}
                isWinner={isWinner}
                onExpand={handleExpand}
              />
            );
          })}
        </div>
      </div>

      {/* AI Judge Evaluation Scorecard */}
      <JudgeScorecard
        responses={state.responses}
        models={models}
        bestModelId={state.bestModelId}
        judgeVerdict={state.judgeVerdict}
        judgeExplanation={state.judgeExplanation}
        onRetryJudge={retryJudge}
      />

      {/* Full-Screen Response Inspection Modal */}
      <ResponseModal
        model={expandedModel}
        response={expandedResponse}
        onClose={() => {
          setExpandedModel(null);
          setExpandedResponse(null);
        }}
      />
    </div>
  );
};
