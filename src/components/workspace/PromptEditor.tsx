import React, { useState } from 'react';
import {
  Play,
  Square,
  Sliders,
  Sparkles,
  RotateCcw,
  Scale,
  Code,
  Brain,
  FileText,
  Palette,
  Flame,
} from 'lucide-react';
import { Model, TaskCategory } from '../../types';

interface PromptEditorProps {
  models: Model[];
  selectedModelIds: string[];
  onToggleModel: (modelId: string) => void;
  onSubmit: (params: {
    prompt: string;
    systemPrompt?: string;
    modelIds: string[];
    temperature: number;
    maxTokens: number;
    category: TaskCategory;
    runJudge: boolean;
  }) => void;
  onCancel: () => void;
  isStreaming: boolean;
}

const PRESET_PROMPTS = [
  {
    label: 'LRU Cache (Go)',
    category: 'coding' as TaskCategory,
    icon: Code,
    prompt: 'Implement a thread-safe Distributed LRU Cache in Go. Include eviction listener callback, sync.RWMutex locks, and unit tests verifying capacity constraints.',
    system: 'You are a principal systems engineer. Provide complete, production-grade code with error handling and zero placeholders.',
  },
  {
    label: 'Quantum Bell Test',
    category: 'reasoning' as TaskCategory,
    icon: Brain,
    prompt: 'Explain the Einstein-Podolsky-Rosen (EPR) paradox, Bell\'s theorem, and how the CHSH inequality mathematically proves quantum non-locality.',
    system: 'You are a theoretical physicist. Use rigorous mathematical notation, clear explanations, and experimental citations.',
  },
  {
    label: 'SQL Optimization',
    category: 'coding' as TaskCategory,
    icon: Code,
    prompt: 'Given a table `orders` with 10M rows joined on `customer_id` and filtered by `created_at` and `status`, write the EXPLAIN ANALYZE comparison and the optimal composite B-Tree or BRIN index strategy.',
    system: 'You are a senior PostgreSQL DBA. Explain planner cost estimations and sequential scan mitigations.',
  },
  {
    label: 'Raft vs Paxos',
    category: 'summarization' as TaskCategory,
    icon: FileText,
    prompt: 'Compare the Raft consensus algorithm with Multi-Paxos across leader election, log replication, membership changes, and mental complexity.',
    system: 'Provide an analytical, bulleted matrix comparing both protocols.',
  },
];

export const PromptEditor: React.FC<PromptEditorProps> = ({
  models,
  selectedModelIds,
  onToggleModel,
  onSubmit,
  onCancel,
  isStreaming,
}) => {
  const [prompt, setPrompt] = useState(
    'Implement a thread-safe Distributed LRU Cache in Go. Include eviction listener callback, sync.RWMutex locks, and unit tests verifying capacity constraints.'
  );
  const [systemPrompt, setSystemPrompt] = useState(
    'You are a principal systems engineer. Provide complete, production-grade code with error handling and zero placeholders.'
  );
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [showParameters, setShowParameters] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [category, setCategory] = useState<TaskCategory>('coding');
  const [runJudge, setRunJudge] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || selectedModelIds.length === 0 || isStreaming) return;

    onSubmit({
      prompt: prompt.trim(),
      systemPrompt: systemPrompt.trim() || undefined,
      modelIds: selectedModelIds,
      temperature,
      maxTokens,
      category,
      runJudge,
    });
  };

  const handleSelectPreset = (preset: typeof PRESET_PROMPTS[0]) => {
    setPrompt(preset.prompt);
    setSystemPrompt(preset.system);
    setCategory(preset.category);
  };

  return (
    <div className="rounded-xl border border-stone-800/90 bg-[#121216]/95 p-4 shadow-xl backdrop-blur-md">
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Preset Prompt Buttons - Warm Amber & Stone */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800/80 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-stone-400 mr-1 flex items-center gap-1">
              <Flame className="h-3 w-3 text-amber-500" /> Standard Benchmarks:
            </span>
            {PRESET_PROMPTS.map((preset) => {
              const Icon = preset.icon;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-[#181820] hover:bg-stone-800 text-stone-300 hover:text-amber-200 border border-stone-850 hover:border-amber-700/60 transition-all"
                >
                  <Icon className="h-3 w-3 text-amber-400" />
                  <span>{preset.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSystemPrompt(!showSystemPrompt)}
              className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                showSystemPrompt
                  ? 'bg-amber-950/60 border-amber-700 text-amber-300 font-semibold'
                  : 'bg-[#181820] border-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              System Prompt
            </button>
            <button
              type="button"
              onClick={() => setShowParameters(!showParameters)}
              className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border transition-colors ${
                showParameters
                  ? 'bg-amber-950/60 border-amber-700 text-amber-300 font-semibold'
                  : 'bg-[#181820] border-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              <Sliders className="h-3 w-3" />
              <span>Parameters</span>
            </button>
          </div>
        </div>

        {/* Collapsible System Prompt */}
        {showSystemPrompt && (
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-amber-400">System Instruction / Persona</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={2}
              placeholder="Set model persona or global formatting instructions..."
              className="w-full rounded-lg border border-stone-800 bg-[#0E0E12] p-2.5 text-xs text-stone-200 placeholder-stone-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        )}

        {/* Collapsible Parameter Controls */}
        {showParameters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 rounded-lg bg-[#0E0E12] border border-stone-800 text-xs text-stone-300">
            <div>
              <div className="flex justify-between text-[11px] text-stone-400 mb-1">
                <span>Temperature</span>
                <span className="font-mono text-amber-400 font-semibold">{temperature.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-stone-400 mb-1">
                <span>Max Tokens</span>
                <span className="font-mono text-amber-400 font-semibold">{maxTokens}</span>
              </div>
              <input
                type="range"
                min="256"
                max="4096"
                step="128"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-[11px] text-stone-400 mb-1">Task Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="w-full rounded-md border border-stone-800 bg-[#16161C] px-2 py-1 text-xs text-stone-200 focus:border-amber-500 focus:outline-none"
              >
                <option value="coding">Coding & Algorithms</option>
                <option value="reasoning">Math & Complex Reasoning</option>
                <option value="summarization">Technical Summarization</option>
                <option value="creative">Creative & Brainstorming</option>
                <option value="general">General Knowledge</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-4">
              <input
                type="checkbox"
                id="runJudgeToggle"
                checked={runJudge}
                onChange={(e) => setRunJudge(e.target.checked)}
                className="rounded border-stone-700 bg-stone-900 text-amber-500 focus:ring-amber-500 cursor-pointer"
              />
              <label htmlFor="runJudgeToggle" className="text-[11px] text-stone-300 cursor-pointer select-none">
                Auto AI Judge Evaluation
              </label>
            </div>
          </div>
        )}

        {/* Primary Prompt Input */}
        <div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="Enter benchmark prompt to dispatch simultaneously to all 5 models..."
            className="w-full rounded-lg border border-stone-800 bg-[#0C0C10] p-3 text-xs leading-relaxed text-stone-100 placeholder-stone-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans"
          />
        </div>

        {/* Model Selection Bar & Submit Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Active Model Selector Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-stone-400 mr-1">Active Models ({selectedModelIds.length}):</span>
            {models.map((m) => {
              const isSelected = selectedModelIds.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onToggleModel(m.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                    isSelected
                      ? 'bg-[#181820] text-stone-100 border-amber-500/80 shadow-sm shadow-amber-950/20'
                      : 'bg-[#101014] text-stone-500 border-stone-800 hover:text-stone-300'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isSelected ? 'bg-amber-400 ring-2 ring-amber-400/30' : 'bg-stone-600'
                    }`}
                  />
                  <span>{m.displayName}</span>
                </button>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {isStreaming ? (
              <button
                type="button"
                onClick={onCancel}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-950/90 hover:bg-rose-900 text-rose-200 font-semibold text-xs border border-rose-700/80 transition-all shadow-md shadow-rose-950/50"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                <span>Cancel Benchmark</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!prompt.trim() || selectedModelIds.length === 0}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-amber-500 via-orange-600 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-stone-950 font-bold text-xs transition-all shadow-lg shadow-amber-950/40 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play className="h-3.5 w-3.5 fill-current text-stone-950" />
                <span>Benchmark {selectedModelIds.length} Models in Parallel</span>
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
