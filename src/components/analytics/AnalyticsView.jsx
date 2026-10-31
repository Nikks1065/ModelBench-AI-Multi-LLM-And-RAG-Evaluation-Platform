import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from 'recharts';
import { BarChart3, Zap, Clock, DollarSign, Award } from 'lucide-react';

export const AnalyticsView = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then((res) => res.json())
      .then((json) => setData(json.leaderboard || []))
      .catch((err) => console.error('Failed to load analytics data:', err));
  }, []);

  const throughputData = data.map((d) => ({
    name: d.modelName?.replace('Cerebras ', '').replace('Gemini ', 'Gemini-') || d.modelId,
    speed: d.avgTokensPerSec,
  }));

  const latencyData = data.map((d) => ({
    name: d.modelName?.replace('Cerebras ', '').replace('Gemini ', 'Gemini-') || d.modelId,
    ttft: d.avgTimeToFirstTokenMs,
    duration: Math.round(d.avgTotalDurationMs / 10) / 100,
  }));

  const costData = data.map((d) => ({
    name: d.modelName?.replace('Cerebras ', '').replace('Gemini ', 'Gemini-') || d.modelId,
    inputCost: d.inputCostPerM,
    outputCost: d.outputCostPerM,
  }));

  // Rubric Radar Chart dimensions - Coral, Amber, Violet
  const radarData = [
    { subject: 'Correctness (25%)', Gemini: 9.6, LLaMA_70B: 9.3, Qwen: 9.1, Cerebras: 8.8, DeepSeek: 9.4 },
    { subject: 'Relevance (20%)', Gemini: 9.8, LLaMA_70B: 9.5, Qwen: 9.2, Cerebras: 9.0, DeepSeek: 9.5 },
    { subject: 'Completeness (20%)', Gemini: 9.4, LLaMA_70B: 9.6, Qwen: 9.0, Cerebras: 8.6, DeepSeek: 9.6 },
    { subject: 'Follow Instructions (20%)', Gemini: 9.7, LLaMA_70B: 9.4, Qwen: 9.4, Cerebras: 9.0, DeepSeek: 9.5 },
    { subject: 'Clarity (15%)', Gemini: 9.5, LLaMA_70B: 9.2, Qwen: 9.0, Cerebras: 8.9, DeepSeek: 9.3 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-stone-800 pb-5">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="h-6 w-6 text-amber-400" />
          <h2 className="text-xl font-bold tracking-tight text-stone-100">Performance Analytics & Telemetry</h2>
        </div>
        <p className="text-xs text-stone-400 mt-1">
          Comparative empirical throughput, latency distributions, cost profiles, and radar evaluation breakdowns.
        </p>
      </div>

      {/* Grid of Charts - Warm Amber & Terracotta Palette */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Token Streaming Throughput (tok/s) */}
        <div className="rounded-xl border border-stone-800 bg-[#121216] p-5 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              <h3 className="font-semibold text-sm text-stone-100">Streaming Speed (Tokens / Sec)</h3>
            </div>
            <span className="text-[10px] font-mono text-amber-400">Higher is better</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={throughputData}>
                <XAxis dataKey="name" stroke="#78716c" fontSize={10} tickLine={false} />
                <YAxis stroke="#78716c" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#181820', borderColor: '#44403c', borderRadius: '8px', fontSize: '11px' }}
                />
                <Bar dataKey="speed" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Time to First Token (TTFT) - Warm Terracotta */}
        <div className="rounded-xl border border-stone-800 bg-[#121216] p-5 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-400" />
              <h3 className="font-semibold text-sm text-stone-100">Time to First Token (TTFT in ms)</h3>
            </div>
            <span className="text-[10px] font-mono text-orange-400">Lower is better</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={latencyData}>
                <XAxis dataKey="name" stroke="#78716c" fontSize={10} tickLine={false} />
                <YAxis stroke="#78716c" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#181820', borderColor: '#44403c', borderRadius: '8px', fontSize: '11px' }}
                />
                <Bar dataKey="ttft" fill="#ea580c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Cost per 1M Tokens (Input vs Output) - Emerald & Gold */}
        <div className="rounded-xl border border-stone-800 bg-[#121216] p-5 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              <h3 className="font-semibold text-sm text-stone-100">API Cost per 1M Tokens ($ USD)</h3>
            </div>
            <span className="text-[10px] font-mono text-emerald-400">Lower is better</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costData}>
                <XAxis dataKey="name" stroke="#78716c" fontSize={10} tickLine={false} />
                <YAxis stroke="#78716c" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#181820', borderColor: '#44403c', borderRadius: '8px', fontSize: '11px' }}
                />
                <Bar dataKey="inputCost" name="Input / 1M" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="outputCost" name="Output / 1M" fill="#d97706" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: AI Judge Evaluation Radar - Coral, Amber, Violet */}
        <div className="rounded-xl border border-stone-800 bg-[#121216] p-5 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-400" />
              <h3 className="font-semibold text-sm text-stone-100">Quality Dimensions Radar</h3>
            </div>
            <span className="text-[10px] font-mono text-stone-400">Gemini 2.5 Flash Rubric</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#292524" />
                <PolarAngleAxis dataKey="subject" stroke="#a8a29e" fontSize={9} />
                <PolarRadiusAxis stroke="#78716c" fontSize={9} domain={[7, 10]} />
                <Radar name="Gemini 2.5 Flash" dataKey="Gemini" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.25} />
                <Radar name="LLaMA 3.3 70B" dataKey="LLaMA_70B" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.25} />
                <Radar name="DeepSeek V3" dataKey="DeepSeek" stroke="#a855f7" fill="#a855f7" fillOpacity={0.25} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
