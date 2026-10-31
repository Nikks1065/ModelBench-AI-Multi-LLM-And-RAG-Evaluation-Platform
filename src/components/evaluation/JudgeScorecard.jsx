import React, { useState } from 'react';
import {
  Award,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const JudgeScorecard = ({
  responses = {},
  models = [],
  bestModelId,
  judgeVerdict,
  judgeExplanation,
  onRetryJudge,
}) => {
  const [expandedModel, setExpandedModel] = useState(null);

  const evaluatedResponses = Object.values(responses).filter((r) => r.evaluation);

  if (evaluatedResponses.length === 0) {
    return null;
  }

  const bestModel = models.find((m) => m.id === bestModelId);

  return (
    <div className="rounded-xl border border-amber-800/60 bg-gradient-to-b from-[#161513] to-[#101014] p-5 shadow-2xl backdrop-blur-md">
      {/* Header Banner - Burnished Gold / Crown */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-900/40 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-stone-100">AI Judge Evaluation Verdict</h3>
              <span className="text-[10px] font-mono text-amber-300 bg-amber-950/70 border border-amber-700/70 px-2 py-0.5 rounded font-semibold">
                Gemini 2.5 Rubric Engine
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Standardized weighted multi-criteria evaluation across 5 quality dimensions
            </p>
          </div>
        </div>

        <button
          onClick={onRetryJudge}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1A1A22] hover:bg-stone-800 text-stone-300 hover:text-amber-300 border border-stone-700 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
          <span>Re-Evaluate</span>
        </button>
      </div>

      {/* Winner Spotlight Banner */}
      {bestModel && (
        <div className="mt-4 p-3.5 rounded-lg bg-amber-950/40 border border-amber-600/70 flex flex-wrap items-center justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-amber-400 animate-ping"></span>
            <div>
              <div className="text-xs font-bold text-amber-300">
                Top Rated: <span className="font-extrabold text-white">{bestModel.displayName}</span> ({bestModel.providerId?.toUpperCase()})
              </div>
              <div className="text-[11px] text-stone-300 mt-0.5 leading-relaxed">
                {judgeVerdict || 'Highest composite balance across instruction adherence, technical depth, and correctness.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Criteria Comparison Table */}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-stone-800 text-[11px] text-stone-400 font-mono uppercase tracking-wider">
              <th className="py-2.5 px-3">Model</th>
              <th className="py-2.5 px-3">Correctness (25%)</th>
              <th className="py-2.5 px-3">Relevance (20%)</th>
              <th className="py-2.5 px-3">Complete (20%)</th>
              <th className="py-2.5 px-3">Follow (20%)</th>
              <th className="py-2.5 px-3">Clarity (15%)</th>
              <th className="py-2.5 px-3 text-right">Weighted Score</th>
              <th className="py-2.5 px-3 text-center">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800/60 font-sans">
            {evaluatedResponses
              .sort(
                (a, b) =>
                  (b.evaluation?.overallWeightedScore || 0) - (a.evaluation?.overallWeightedScore || 0)
              )
              .map((resp) => {
                const model = models.find((m) => m.id === resp.modelId);
                const ev = resp.evaluation;
                const isWinner = resp.modelId === bestModelId;
                const isExpanded = expandedModel === resp.modelId;

                return (
                  <React.Fragment key={resp.modelId}>
                    <tr
                      className={`transition-colors ${
                        isWinner ? 'bg-amber-950/20 font-medium' : 'hover:bg-stone-850/40'
                      }`}
                    >
                      <td className="py-2.5 px-3 flex items-center gap-2">
                        {isWinner && <Award className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                        <span className="text-stone-100 font-semibold">{model?.displayName || resp.modelId}</span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-stone-300 tabular-nums">
                        {ev?.correctness?.toFixed(1) || '0.0'}/10
                      </td>
                      <td className="py-2.5 px-3 font-mono text-stone-300 tabular-nums">
                        {ev?.relevance?.toFixed(1) || '0.0'}/10
                      </td>
                      <td className="py-2.5 px-3 font-mono text-stone-300 tabular-nums">
                        {ev?.completeness?.toFixed(1) || '0.0'}/10
                      </td>
                      <td className="py-2.5 px-3 font-mono text-stone-300 tabular-nums">
                        {ev?.instructionFollowing?.toFixed(1) || '0.0'}/10
                      </td>
                      <td className="py-2.5 px-3 font-mono text-stone-300 tabular-nums">
                        {ev?.clarity?.toFixed(1) || '0.0'}/10
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400 tabular-nums text-sm">
                        {ev?.overallWeightedScore?.toFixed(2) || '0.00'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => setExpandedModel(isExpanded ? null : resp.modelId)}
                          className="p-1 rounded text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </td>
                    </tr>

                    {/* Drill-Down Reasoning Drawer */}
                    {isExpanded && (
                      <tr className="bg-[#0E0E12]">
                        <td colSpan={8} className="p-4 space-y-2 text-xs">
                          <div className="font-semibold text-stone-300">Judge Assessment:</div>
                          <p className="text-stone-400 leading-relaxed italic">{ev?.reasoning}</p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                            {ev?.strengths?.length > 0 && (
                              <div className="space-y-1">
                                <div className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> Key Strengths:
                                </div>
                                <ul className="list-disc list-inside text-stone-300 text-[11px] space-y-0.5">
                                  {ev.strengths.map((s, idx) => (
                                    <li key={idx}>{s}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {ev?.weaknesses?.length > 0 && (
                              <div className="space-y-1">
                                <div className="text-[11px] font-semibold text-orange-400 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" /> Potential Limitations:
                                </div>
                                <ul className="list-disc list-inside text-stone-300 text-[11px] space-y-0.5">
                                  {ev.weaknesses.map((w, idx) => (
                                    <li key={idx}>{w}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
          </tbody>
        </table>
      </div>

      {judgeExplanation && (
        <div className="mt-4 pt-3 border-t border-stone-800/80 text-[11px] text-stone-400 flex items-start gap-2">
          <HelpCircle className="h-3.5 w-3.5 text-stone-500 shrink-0 mt-0.5" />
          <span>{judgeExplanation}</span>
        </div>
      )}
    </div>
  );
};
