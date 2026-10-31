import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Award,
  Zap,
  Clock,
  DollarSign,
  CheckCircle2,
  Filter,
  RefreshCw,
  Info,
} from 'lucide-react';
import { LeaderboardEntry, TaskCategory } from '../../types';

export const LeaderboardView: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [category, setCategory] = useState<TaskCategory | 'all'>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<keyof LeaderboardEntry>('avgJudgeScore');
  const [sortAsc, setSortAsc] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const url = category === 'all' ? '/api/leaderboard' : `/api/leaderboard?category=${category}`;
      const res = await fetch(url);
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [category]);

  const handleSort = (field: keyof LeaderboardEntry) => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(false);
    }
  };

  const filtered = leaderboard
    .filter((entry) => (providerFilter === 'all' ? true : entry.providerId === providerFilter))
    .sort((a, b) => {
      const valA = a[sortBy] ?? 0;
      const valB = b[sortBy] ?? 0;
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

  return (
    <div className="space-y-6">
      {/* Title & Filter Bar - Warm Amber & Stone */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Trophy className="h-6 w-6 text-amber-400" />
            <h2 className="text-xl font-bold tracking-tight text-stone-100">Dynamic Model Leaderboard</h2>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Empirical benchmark rankings based on real latency, throughput, cost efficiency, and AI Judge evaluations.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <div className="flex items-center gap-1 rounded-lg bg-[#141418] border border-stone-800 p-1 text-xs">
            {(['all', 'coding', 'reasoning', 'summarization'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1 rounded-md capitalize font-medium transition-colors ${
                  category === cat
                    ? 'bg-amber-600 text-stone-950 font-bold shadow-sm shadow-amber-950/30'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Provider Filter */}
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="rounded-lg border border-stone-800 bg-[#141418] px-3 py-1.5 text-xs text-stone-200 focus:border-amber-500 focus:outline-none"
          >
            <option value="all">All Providers</option>
            <option value="google">Google</option>
            <option value="groq">Groq</option>
            <option value="cerebras">Cerebras</option>
            <option value="openrouter">OpenRouter</option>
          </select>

          <button
            onClick={fetchLeaderboard}
            className="p-1.5 rounded-lg bg-[#141418] border border-stone-800 text-stone-400 hover:text-white transition-colors"
            title="Refresh Leaderboard"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="rounded-xl border border-stone-800 bg-[#121216] backdrop-blur-md overflow-hidden shadow-2xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-stone-800 bg-[#181820] text-[11px] text-stone-400 font-mono uppercase tracking-wider">
              <th className="py-3 px-4">Rank & Model</th>
              <th
                onClick={() => handleSort('avgJudgeScore')}
                className="py-3 px-4 cursor-pointer hover:text-amber-400"
              >
                Avg Quality {sortBy === 'avgJudgeScore' ? (sortAsc ? '▲' : '▼') : ''}
              </th>
              <th
                onClick={() => handleSort('avgTimeToFirstTokenMs')}
                className="py-3 px-4 cursor-pointer hover:text-amber-400"
              >
                Avg TTFT {sortBy === 'avgTimeToFirstTokenMs' ? (sortAsc ? '▲' : '▼') : ''}
              </th>
              <th
                onClick={() => handleSort('avgTokensPerSec')}
                className="py-3 px-4 cursor-pointer hover:text-amber-400"
              >
                Throughput {sortBy === 'avgTokensPerSec' ? (sortAsc ? '▲' : '▼') : ''}
              </th>
              <th
                onClick={() => handleSort('inputCostPerM')}
                className="py-3 px-4 cursor-pointer hover:text-amber-400"
              >
                Pricing (In/Out) {sortBy === 'inputCostPerM' ? (sortAsc ? '▲' : '▼') : ''}
              </th>
              <th
                onClick={() => handleSort('successRate')}
                className="py-3 px-4 cursor-pointer hover:text-amber-400"
              >
                Reliability {sortBy === 'successRate' ? (sortAsc ? '▲' : '▼') : ''}
              </th>
              <th
                onClick={() => handleSort('winCount')}
                className="py-3 px-4 text-right cursor-pointer hover:text-amber-400"
              >
                Wins {sortBy === 'winCount' ? (sortAsc ? '▲' : '▼') : ''}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800/60 font-sans">
            {filtered.map((entry, index) => {
              return (
                <tr
                  key={entry.modelId}
                  className="hover:bg-stone-800/40 transition-colors group"
                >
                  {/* Rank & Model */}
                  <td className="py-3.5 px-4 flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-amber-500 w-5">
                      #{index + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-stone-100 flex items-center gap-2">
                        <span>{entry.modelName}</span>
                        {index === 0 && (
                          <span className="text-[10px] uppercase font-bold text-amber-300 bg-amber-950/70 border border-amber-600/80 px-1.5 py-0.2 rounded shadow-sm">
                            #1 Elo
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-stone-400 flex items-center gap-1.5 mt-0.5">
                        <span className="uppercase">{entry.providerName}</span>
                        <span>·</span>
                        <span>{entry.family}</span>
                        <span>·</span>
                        <span className="font-mono">{entry.totalRuns} runs</span>
                      </div>
                    </div>
                  </td>

                  {/* Avg Judge Score */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <Award className="h-4 w-4 text-amber-400 shrink-0" />
                      <span className="font-mono text-sm font-bold text-stone-100 tabular-nums">
                        {entry.avgJudgeScore.toFixed(1)}
                      </span>
                      <span className="text-[10px] text-stone-500">/10</span>
                    </div>
                  </td>

                  {/* Avg TTFT */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 font-mono text-stone-300 tabular-nums">
                      <Clock className="h-3.5 w-3.5 text-orange-400" />
                      <span>{entry.avgTimeToFirstTokenMs}ms</span>
                    </div>
                  </td>

                  {/* Throughput */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 font-mono text-amber-300 tabular-nums font-semibold">
                      <Zap className="h-3.5 w-3.5 text-amber-400" />
                      <span>{entry.avgTokensPerSec.toFixed(1)} tok/s</span>
                    </div>
                  </td>

                  {/* Pricing */}
                  <td className="py-3.5 px-4 font-mono text-stone-300 tabular-nums">
                    <div>
                      ${entry.inputCostPerM.toFixed(2)} / ${entry.outputCostPerM.toFixed(2)}
                      <span className="text-[10px] text-stone-500 block font-sans">per 1M tokens</span>
                    </div>
                  </td>

                  {/* Reliability */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 font-mono text-emerald-400 tabular-nums">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{entry.successRate}%</span>
                    </div>
                  </td>

                  {/* Win Count */}
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-400 tabular-nums text-sm">
                    {entry.winCount}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Methodology & Notes */}
      <div className="p-4 rounded-xl border border-stone-800 bg-[#121216] text-xs text-stone-400 space-y-1.5">
        <div className="flex items-center gap-2 font-semibold text-stone-300">
          <Info className="h-4 w-4 text-amber-400" />
          <span>Evaluation & Metric Methodology</span>
        </div>
        <p className="leading-relaxed">
          - <strong>Empirical Latency</strong>: Time to first token (TTFT) and total response durations are measured using high-precision timers on the server.
          <br />
          - <strong>AI Judge Rubric</strong>: Each model's answers are blind-evaluated by an independent Gemini 2.5 Flash judge using a 5-dimension rubric (Correctness 25%, Relevance 20%, Completeness 20%, Instruction Following 20%, Clarity 15%).
          <br />
          - <strong>Cost Modeling</strong>: Documented input/output token pricing per 1M tokens from official provider pricing tables.
        </p>
      </div>
    </div>
  );
};
