import React from 'react';
import {
  Cpu,
  Trophy,
  GitFork,
  BookOpen,
  BarChart3,
  Key,
  Flame,
  Activity,
  SplitSquareVertical,
  Download,
} from 'lucide-react';

export type ActiveTab = 'workspace' | 'diff' | 'leaderboard' | 'router' | 'prompts' | 'analytics' | 'settings';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  activeModelCount: number;
  totalModelCount: number;
  isStreaming: boolean;
  onExport?: (format: 'json' | 'csv' | 'md') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  activeModelCount,
  totalModelCount,
  isStreaming,
  onExport,
}) => {
  const tabs = [
    { id: 'workspace' as ActiveTab, label: 'Workspace', icon: Cpu },
    { id: 'diff' as ActiveTab, label: 'Diff Inspector', icon: SplitSquareVertical },
    { id: 'leaderboard' as ActiveTab, label: 'Leaderboard', icon: Trophy },
    { id: 'router' as ActiveTab, label: 'Smart Router', icon: GitFork },
    { id: 'prompts' as ActiveTab, label: 'Prompts & Runs', icon: BookOpen },
    { id: 'analytics' as ActiveTab, label: 'Analytics', icon: BarChart3 },
    { id: 'settings' as ActiveTab, label: 'API Keys', icon: Key },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-stone-800/80 bg-[#0C0C0E]/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand identity - Warm Amber & Copper Gold */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700 shadow-sm shadow-amber-500/20">
            <Flame className="h-4 w-4 text-stone-950 fill-stone-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold tracking-tight text-stone-100">ModelBench</span>
              <span className="text-[11px] font-bold tracking-wider uppercase text-amber-400 bg-amber-950/60 border border-amber-800/70 px-1.5 py-0.2 rounded">
                AI Matrix
              </span>
            </div>
            <div className="text-[10px] text-stone-400">Multi-LLM Benchmarking & Intelligent Orchestrator</div>
          </div>
        </div>

        {/* Navigation tabs - Clean stone and amber active indicator */}
        <nav className="flex items-center gap-1 rounded-lg bg-[#141418] p-1 border border-stone-800/80">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition-all rounded-md ${
                  isActive
                    ? 'bg-stone-800 text-amber-300 shadow-sm shadow-amber-950/30 font-semibold'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-amber-400' : 'text-stone-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Telemetry pulse & quick export */}
        <div className="flex items-center gap-3 text-xs">
          {onExport && (
            <div className="hidden md:flex items-center gap-1 bg-[#141418] border border-stone-800 rounded-md p-0.5 text-[11px]">
              <span className="text-stone-500 px-1.5 text-[10px] uppercase font-mono">Export:</span>
              <button
                onClick={() => onExport('json')}
                className="px-1.5 py-0.5 text-stone-400 hover:text-amber-300 transition-colors font-mono"
                title="Export Run as JSON"
              >
                JSON
              </button>
              <span className="text-stone-700">·</span>
              <button
                onClick={() => onExport('csv')}
                className="px-1.5 py-0.5 text-stone-400 hover:text-amber-300 transition-colors font-mono"
                title="Export Run as CSV"
              >
                CSV
              </button>
              <span className="text-stone-700">·</span>
              <button
                onClick={() => onExport('md')}
                className="px-1.5 py-0.5 text-stone-400 hover:text-amber-300 transition-colors font-mono"
                title="Export Markdown Report"
              >
                MD
              </button>
            </div>
          )}

          {isStreaming ? (
            <div className="flex items-center gap-2 text-amber-400 bg-amber-950/40 border border-amber-800/60 px-2.5 py-1 rounded-md animate-pulse">
              <Activity className="h-3.5 w-3.5 animate-spin" />
              <span className="font-mono text-[11px] font-semibold">STREAMING 5x</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-stone-400 bg-[#141418] border border-stone-800 px-2.5 py-1 rounded-md">
              <span className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20"></span>
              <span className="font-mono text-[11px] text-stone-300">
                {activeModelCount}/{totalModelCount} Models Active
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
