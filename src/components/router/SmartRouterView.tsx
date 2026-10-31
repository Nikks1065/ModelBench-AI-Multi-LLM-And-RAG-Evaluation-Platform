import React, { useState, useEffect } from 'react';
import {
  GitFork,
  DollarSign,
  Zap,
  Award,
  Scale,
  ArrowRight,
  ShieldAlert,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import { RoutingPriority, RoutingRecommendation } from '../../types';

export const SmartRouterView: React.FC = () => {
  const [priority, setPriority] = useState<RoutingPriority>('BALANCED');
  const [recommendation, setRecommendation] = useState<RoutingRecommendation | null>(null);
  const [loading, setLoading] = useState(false);

  const priorities: Array<{
    id: RoutingPriority;
    label: string;
    icon: any;
    desc: string;
  }> = [
    {
      id: 'LOWEST_COST',
      label: 'Lowest Cost',
      icon: DollarSign,
      desc: 'Minimizes per-token expenses while preserving acceptable reliability.',
    },
    {
      id: 'LOWEST_LATENCY',
      label: 'Lowest Latency',
      icon: Zap,
      desc: 'Maximizes streaming throughput and minimizes time-to-first-token.',
    },
    {
      id: 'HIGHEST_QUALITY',
      label: 'Highest Quality',
      icon: Award,
      desc: 'Prioritizes reasoning depth, correctness, and adherence to instructions.',
    },
    {
      id: 'BALANCED',
      label: 'Balanced Pareto',
      icon: Scale,
      desc: 'Calculates the optimal sweet spot across quality, latency, and cost.',
    },
  ];

  const fetchRecommendation = async (p: RoutingPriority) => {
    setLoading(true);
    try {
      const res = await fetch('/api/router/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: p }),
      });
      const data = await res.json();
      if (data.recommendation) {
        setRecommendation(data.recommendation);
      }
    } catch (err) {
      console.error('Failed to get recommendation:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendation(priority);
  }, [priority]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-stone-800 pb-5">
        <div className="flex items-center gap-2.5">
          <GitFork className="h-6 w-6 text-amber-400" />
          <h2 className="text-xl font-bold tracking-tight text-stone-100">Smart Model Routing Engine</h2>
        </div>
        <p className="text-xs text-stone-400 mt-1">
          Algorithmic model selection engine that directs requests to the optimal model based on empirical benchmarks, cost formulas, and fallback resilience.
        </p>
      </div>

      {/* Priority Selection Cards - Obsidian & Amber */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {priorities.map((item) => {
          const Icon = item.icon;
          const isSelected = priority === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setPriority(item.id)}
              className={`flex flex-col text-left p-4 rounded-xl border transition-all ${
                isSelected
                  ? 'border-amber-500 bg-amber-950/30 ring-1 ring-amber-500/40 shadow-lg shadow-amber-950/40'
                  : 'border-stone-800 bg-[#121216] hover:border-stone-700 hover:bg-[#16161C]'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div
                  className={`p-2 rounded-lg ${
                    isSelected ? 'bg-amber-600 text-stone-950 font-bold' : 'bg-stone-800 text-stone-400'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                {isSelected && (
                  <span className="text-[10px] font-mono uppercase font-bold text-amber-300 bg-amber-950/80 border border-amber-700 px-1.5 py-0.5 rounded">
                    Active Target
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-sm text-stone-100">{item.label}</h3>
              <p className="text-[11px] text-stone-400 mt-1 leading-normal">{item.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Explainability Decision Card */}
      {recommendation && (
        <div className="rounded-xl border border-stone-800 bg-[#121216] p-6 shadow-2xl backdrop-blur-md space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-800/80 pb-4">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-semibold">
                Optimal Routing Decision
              </div>
              <h3 className="text-lg font-bold text-stone-100 mt-0.5 flex items-center gap-2">
                <span>{recommendation.recommendedModel.displayName}</span>
                <span className="text-xs font-mono font-normal uppercase text-stone-400 px-2 py-0.5 rounded bg-stone-800">
                  {recommendation.recommendedModel.providerId}
                </span>
              </h3>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-stone-400">Fallback Failover:</span>
              <div className="flex items-center gap-1.5 text-stone-200 bg-[#16161C] border border-stone-700 px-2.5 py-1 rounded-md">
                <ShieldAlert className="h-3.5 w-3.5 text-orange-400" />
                <span>{recommendation.fallbackModel.displayName}</span>
              </div>
            </div>
          </div>

          {/* Rationale explanation */}
          <div className="p-4 rounded-lg bg-[#0E0E12] border border-stone-800 text-xs text-stone-300 space-y-2">
            <div className="font-semibold text-stone-200 flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span>Routing Rationale:</span>
            </div>
            <p className="leading-relaxed text-stone-300 pl-5">{recommendation.reason}</p>
          </div>

          {/* Trade-off Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-lg bg-[#16161C] border border-stone-800">
              <span className="text-[10px] text-stone-400 font-medium uppercase block mb-1">
                Throughput vs Cost Profile
              </span>
              <p className="text-stone-300 leading-relaxed font-sans">
                {recommendation.tradeOffAnalysis.latencyVsCost}
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-[#16161C] border border-stone-800">
              <span className="text-[10px] text-stone-400 font-medium uppercase block mb-1">
                Evaluation Quality Benchmark
              </span>
              <p className="text-stone-300 leading-relaxed font-sans">
                {recommendation.tradeOffAnalysis.qualityAssessment}
              </p>
            </div>
          </div>

          {/* Relative Score Comparison Bars */}
          <div className="space-y-2 pt-2">
            <div className="text-xs font-semibold text-stone-300">
              Relative Composite Score (Normalized for {priority}):
            </div>
            <div className="space-y-2">
              {Object.entries(recommendation.scores)
                .sort(([, a], [, b]) => b - a)
                .map(([mId, score]) => {
                  const isTop = mId === recommendation.recommendedModel.id;
                  return (
                    <div key={mId} className="space-y-1">
                      <div className="flex justify-between text-[11px] text-stone-400 font-mono">
                        <span className={isTop ? 'text-amber-400 font-bold' : ''}>{mId}</span>
                        <span className={isTop ? 'text-amber-400 font-bold' : ''}>{score}/100</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-stone-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isTop
                              ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                              : 'bg-stone-600'
                          }`}
                          style={{ width: `${Math.max(5, score)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
