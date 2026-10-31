import React, { useState } from 'react';
import { SplitSquareVertical, ArrowLeftRight } from 'lucide-react';
import { formatUsd } from '../../utils/pricing.js';

export const DiffInspectorView = ({
  models = [],
  responses = {},
}) => {
  const completedResponses = Object.values(responses).filter(
    (r) => r.status === 'SUCCESS' && r.rawText
  );

  const availableModelIds = completedResponses.map((r) => r.modelId);
  const [modelAId, setModelAId] = useState(availableModelIds[0] || 'gemini-2.5-flash');
  const [modelBId, setModelBId] = useState(
    availableModelIds[1] || availableModelIds[0] || 'llama-3.3-70b-versatile'
  );

  const modelA = models.find((m) => m.id === modelAId);
  const modelB = models.find((m) => m.id === modelBId);

  const respA = responses[modelAId];
  const respB = responses[modelBId];

  if (completedResponses.length === 0) {
    return (
      <div className="rounded-xl border border-stone-800 bg-[#121216] p-8 text-center space-y-3">
        <SplitSquareVertical className="h-8 w-8 text-amber-500 mx-auto" />
        <h3 className="text-base font-semibold text-stone-200">No Benchmark Responses Ready for Diff</h3>
        <p className="text-xs text-stone-400 max-w-md mx-auto">
          Execute a prompt in the Workspace first. Once at least two models generate responses, you can compare their outputs, code structures, and token diffs side by side here.
        </p>
      </div>
    );
  }

  const textA = respA?.rawText || '';
  const textB = respB?.rawText || '';

  const wordsA = textA.split(/\s+/).filter(Boolean);
  const wordsB = textB.split(/\s+/).filter(Boolean);

  const lengthDelta = wordsA.length - wordsB.length;
  const latencyDelta =
    (respA?.metrics?.timeToFirstTokenMs || 0) - (respB?.metrics?.timeToFirstTokenMs || 0);

  return (
    <div className="space-y-5">
      {/* Header & Model Selectors */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <SplitSquareVertical className="h-6 w-6 text-amber-400" />
            <h2 className="text-xl font-bold tracking-tight text-stone-100">Side-by-Side Model Diff Inspector</h2>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Compare token structures, code completeness, formatting nuances, and latency disparities between two candidate models.
          </p>
        </div>

        {/* Model Selector Bar */}
        <div className="flex items-center gap-3 bg-[#16161C] border border-stone-800 p-2 rounded-xl text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono text-stone-400 text-[10px] uppercase">Model A:</span>
            <select
              value={modelAId}
              onChange={(e) => setModelAId(e.target.value)}
              className="bg-[#0E0E12] border border-stone-700 text-stone-200 rounded-md px-2 py-1 text-xs focus:border-amber-500 focus:outline-none"
            >
              {availableModelIds.map((mId) => (
                <option key={mId} value={mId}>
                  {models.find((m) => m.id === mId)?.displayName || mId}
                </option>
              ))}
            </select>
          </div>

          <ArrowLeftRight className="h-4 w-4 text-amber-500 shrink-0" />

          <div className="flex items-center gap-2">
            <span className="font-mono text-stone-400 text-[10px] uppercase">Model B:</span>
            <select
              value={modelBId}
              onChange={(e) => setModelBId(e.target.value)}
              className="bg-[#0E0E12] border border-stone-700 text-stone-200 rounded-md px-2 py-1 text-xs focus:border-amber-500 focus:outline-none"
            >
              {availableModelIds.map((mId) => (
                <option key={mId} value={mId}>
                  {models.find((m) => m.id === mId)?.displayName || mId}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Comparative Delta Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-[#141418] border border-stone-800 text-xs">
          <span className="text-[10px] font-mono uppercase text-stone-500 block">Word Count Delta</span>
          <div className="font-mono font-bold text-stone-200 text-sm mt-0.5">
            {wordsA.length} vs {wordsB.length}
            <span className="text-[11px] text-amber-400 ml-1">
              ({lengthDelta > 0 ? `+${lengthDelta}` : lengthDelta} words)
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#141418] border border-stone-800 text-xs">
          <span className="text-[10px] font-mono uppercase text-stone-500 block">TTFT Latency Delta</span>
          <div className="font-mono font-bold text-stone-200 text-sm mt-0.5">
            {respA?.metrics?.timeToFirstTokenMs || 0}ms vs {respB?.metrics?.timeToFirstTokenMs || 0}ms
            <span className="text-[11px] text-amber-400 ml-1">
              ({latencyDelta > 0 ? `+${latencyDelta}ms` : `${latencyDelta}ms`})
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#141418] border border-stone-800 text-xs">
          <span className="text-[10px] font-mono uppercase text-stone-500 block">Throughput Speed</span>
          <div className="font-mono font-bold text-stone-200 text-sm mt-0.5">
            {respA?.metrics?.tokensPerSecond || 0} vs {respB?.metrics?.tokensPerSecond || 0} tok/s
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#141418] border border-stone-800 text-xs">
          <span className="text-[10px] font-mono uppercase text-stone-500 block">AI Judge Quality</span>
          <div className="font-mono font-bold text-amber-400 text-sm mt-0.5">
            {respA?.evaluation?.overallWeightedScore?.toFixed(2) || '—'} vs{' '}
            {respB?.evaluation?.overallWeightedScore?.toFixed(2) || '—'}
          </div>
        </div>
      </div>

      {/* Side-by-Side Dual Editor Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Panel A */}
        <div className="rounded-xl border border-stone-800 bg-[#121216] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#181820] border-b border-stone-800">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-400"></span>
              <span className="font-semibold text-xs text-white">{modelA?.displayName || modelAId}</span>
              <span className="text-[10px] font-mono text-stone-400 uppercase">({modelA?.providerId})</span>
            </div>
            <span className="text-[11px] font-mono text-stone-400">
              {formatUsd(respA?.metrics?.estimatedCostUsd || 0)}
            </span>
          </div>
          <div className="p-4 text-xs font-sans text-stone-200 leading-relaxed whitespace-pre-wrap flex-1 max-h-[550px] overflow-y-auto selection:bg-amber-900/50">
            {textA || 'No response data available.'}
          </div>
        </div>

        {/* Panel B */}
        <div className="rounded-xl border border-stone-800 bg-[#121216] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#181820] border-b border-stone-800">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-orange-400"></span>
              <span className="font-semibold text-xs text-white">{modelB?.displayName || modelBId}</span>
              <span className="text-[10px] font-mono text-stone-400 uppercase">({modelB?.providerId})</span>
            </div>
            <span className="text-[11px] font-mono text-stone-400">
              {formatUsd(respB?.metrics?.estimatedCostUsd || 0)}
            </span>
          </div>
          <div className="p-4 text-xs font-sans text-stone-200 leading-relaxed whitespace-pre-wrap flex-1 max-h-[550px] overflow-y-auto selection:bg-orange-900/50">
            {textB || 'No response data available.'}
          </div>
        </div>
      </div>
    </div>
  );
};
