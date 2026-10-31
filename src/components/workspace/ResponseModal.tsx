import React, { useState } from 'react';
import { X, Copy, Check, Download, Award, Zap, Clock, DollarSign } from 'lucide-react';
import { Model, ModelResponse } from '../../types';
import { formatUsd } from '../../utils/pricing';

interface ResponseModalProps {
  model: Model | null;
  response: ModelResponse | null;
  onClose: () => void;
}

export const ResponseModal: React.FC<ResponseModalProps> = ({
  model,
  response,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!model || !response) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(response.rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([response.rawText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${model.id}-benchmark-response.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-fade-in">
      <div className="flex h-[85vh] w-full max-w-4xl flex-col rounded-2xl border border-stone-700 bg-[#121216] shadow-2xl overflow-hidden">
        {/* Header - Warm Amber & Stone */}
        <div className="flex items-center justify-between border-b border-stone-800 bg-[#16161C] px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs uppercase px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/80 font-semibold">
              {model.providerId}
            </span>
            <h3 className="font-bold text-white text-base">{model.displayName}</h3>
            {response.evaluation && (
              <span className="flex items-center gap-1 text-xs font-mono font-bold text-amber-300 bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded">
                <Award className="h-3.5 w-3.5 text-amber-400" />
                {response.evaluation.overallWeightedScore.toFixed(1)}/10
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? 'Copied' : 'Copy Text'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-stone-950 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Download .md</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors ml-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Telemetry Bar */}
        {response.metrics && (
          <div className="grid grid-cols-4 gap-2 border-b border-stone-800/80 bg-[#0E0E12] px-6 py-2.5 text-xs font-mono text-stone-400">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-400" />
              <span>TTFT: <strong className="text-stone-100">{response.metrics.timeToFirstTokenMs}ms</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              <span>Throughput: <strong className="text-stone-100">{response.metrics.tokensPerSecond} tok/s</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span>Tokens: <strong className="text-stone-100">{response.metrics.completionTokens}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              <span>Cost: <strong className="text-emerald-300">{formatUsd(response.metrics.estimatedCostUsd)}</strong></span>
            </div>
          </div>
        )}

        {/* Response Content */}
        <div className="flex-1 overflow-y-auto p-6 text-sm text-stone-200 font-sans leading-relaxed whitespace-pre-wrap selection:bg-amber-900/50 selection:text-white">
          {response.rawText}
        </div>
      </div>
    </div>
  );
};
