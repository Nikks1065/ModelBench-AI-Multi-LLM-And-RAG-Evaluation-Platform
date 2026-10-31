import React, { useState } from 'react';
import {
  Copy,
  Check,
  Maximize2,
  Clock,
  Zap,
  DollarSign,
  Coins,
  AlertTriangle,
  Award,
} from 'lucide-react';
import { formatUsd } from '../../utils/pricing.js';

export const ModelPanel = ({
  model,
  response,
  isWinner,
  onExpand,
}) => {
  const [copied, setCopied] = useState(false);

  const status = response?.status || 'PENDING';
  const rawText = response?.rawText || '';
  const metrics = response?.metrics;
  const evaluation = response?.evaluation;

  const handleCopy = () => {
    if (!rawText) return;
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getProviderBadge = (pId) => {
    switch (pId) {
      case 'google':
        return 'text-rose-400 border-rose-900/60 bg-rose-950/30';
      case 'groq':
        return 'text-amber-400 border-amber-900/60 bg-amber-950/30';
      case 'cerebras':
        return 'text-emerald-400 border-emerald-900/60 bg-emerald-950/30';
      case 'openrouter':
        return 'text-violet-400 border-violet-900/60 bg-violet-950/30';
      default:
        return 'text-stone-400 border-stone-800 bg-stone-900/50';
    }
  };

  return (
    <div
      className={`flex flex-col rounded-xl border transition-all duration-200 overflow-hidden ${
        isWinner
          ? 'border-amber-500/80 bg-gradient-to-b from-[#181613] to-[#121215] shadow-lg shadow-amber-950/30 ring-1 ring-amber-500/30'
          : 'border-stone-800/80 bg-[#121216]/90 hover:border-stone-700'
      }`}
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-stone-800/80 bg-[#16161C] px-3.5 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${getProviderBadge(
              model.providerId
            )}`}
          >
            {model.providerId}
          </span>
          <span className="font-semibold text-xs text-stone-100 truncate" title={model.displayName}>
            {model.displayName}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {evaluation && (
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-950/70 text-amber-300 border border-amber-700/60"
              title={`Judge Score: ${evaluation.overallWeightedScore}/10 (${evaluation.reasoning})`}
            >
              <Award className="h-3 w-3 text-amber-400" />
              <span>{evaluation.overallWeightedScore.toFixed(1)}</span>
            </div>
          )}

          {isWinner && (
            <span className="text-[10px] uppercase font-bold text-amber-300 bg-amber-900/40 border border-amber-600/80 px-1.5 py-0.5 rounded shadow-sm">
              Winner
            </span>
          )}

          <button
            onClick={handleCopy}
            disabled={!rawText}
            aria-label={`Copy response from ${model.displayName}`}
            className="p-1 rounded text-stone-400 hover:text-white hover:bg-stone-800 transition-colors disabled:opacity-30"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => response && onExpand(model, response)}
            disabled={!rawText}
            aria-label={`Expand response from ${model.displayName}`}
            className="p-1 rounded text-stone-400 hover:text-white hover:bg-stone-800 transition-colors disabled:opacity-30"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Streaming Response Content Body */}
      <div className="relative flex-1 p-3.5 text-xs text-stone-200 overflow-y-auto max-h-[360px] min-h-[220px] font-sans selection:bg-amber-900/50 selection:text-white">
        {status === 'STREAMING' && !rawText && (
          <div className="flex items-center gap-2 text-stone-500 italic py-6 justify-center">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping"></span>
            <span>Awaiting first token...</span>
          </div>
        )}

        {status === 'PENDING' && (
          <div className="flex items-center justify-center h-full text-stone-600 text-[11px] font-mono">
            Awaiting prompt execution
          </div>
        )}

        {status === 'FAILED' && (
          <div className="flex flex-col items-center justify-center h-full text-rose-400 p-4 text-center">
            <AlertTriangle className="h-5 w-5 mb-2" />
            <p className="font-medium text-xs">Model stream failed</p>
            <p className="text-[11px] text-stone-400 mt-1">{response?.errorMessage || 'Connection timeout or rate limit exceeded.'}</p>
          </div>
        )}

        {rawText && (
          <div className="whitespace-pre-wrap leading-relaxed font-sans text-stone-200">
            {rawText}
            {status === 'STREAMING' && (
              <span className="inline-block w-1.5 h-3.5 bg-amber-400 animate-pulse ml-0.5 align-middle"></span>
            )}
          </div>
        )}
      </div>

      {/* Telemetry Metrics HUD Footer */}
      <div className="grid grid-cols-2 gap-1.5 border-t border-stone-800/80 bg-[#101014] p-2.5 text-[11px] text-stone-400 font-mono">
        <div className="flex items-center justify-between px-2 py-1 rounded bg-[#16161C] border border-stone-800/60">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-orange-400 shrink-0" />
            <span className="text-[10px] text-stone-400 uppercase">TTFT</span>
          </div>
          <span className="font-semibold text-stone-200 tabular-nums">
            {metrics?.timeToFirstTokenMs ? `${metrics.timeToFirstTokenMs}ms` : '—'}
          </span>
        </div>

        <div className="flex items-center justify-between px-2 py-1 rounded bg-[#16161C] border border-stone-800/60">
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span className="text-[10px] text-stone-400 uppercase">Speed</span>
          </div>
          <span className="font-semibold text-stone-200 tabular-nums">
            {metrics?.tokensPerSecond ? `${metrics.tokensPerSecond} t/s` : '—'}
          </span>
        </div>

        <div className="flex items-center justify-between px-2 py-1 rounded bg-[#16161C] border border-stone-800/60">
          <div className="flex items-center gap-1.5">
            <Coins className="h-3.5 w-3.5 text-stone-300 shrink-0" />
            <span className="text-[10px] text-stone-400 uppercase">Tokens</span>
          </div>
          <span className="font-semibold text-stone-200 tabular-nums">
            {metrics?.completionTokens ? metrics.completionTokens : '—'}
          </span>
        </div>

        <div className="flex items-center justify-between px-2 py-1 rounded bg-[#16161C] border border-stone-800/60">
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span className="text-[10px] text-stone-400 uppercase">Cost</span>
          </div>
          <span className="font-semibold text-emerald-300 tabular-nums">
            {metrics ? formatUsd(metrics.estimatedCostUsd) : '—'}
          </span>
        </div>
      </div>
    </div>
  );
};
