/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar.jsx';
import { WorkspaceView } from './components/workspace/WorkspaceView.jsx';
import { DiffInspectorView } from './components/diff/DiffInspectorView.jsx';
import { LeaderboardView } from './components/leaderboard/LeaderboardView.jsx';
import { SmartRouterView } from './components/router/SmartRouterView.jsx';
import { PromptLibraryView } from './components/prompts/PromptLibraryView.jsx';
import { AnalyticsView } from './components/analytics/AnalyticsView.jsx';
import { SettingsView } from './components/settings/SettingsView.jsx';
import { ShieldCheck } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('workspace');
  const [models, setModels] = useState([]);
  const [activePrompt, setActivePrompt] = useState(null);
  const [activeRun, setActiveRun] = useState(null);
  const [activeResponses, setActiveResponses] = useState({});

  useEffect(() => {
    fetch('/api/models')
      .then((res) => res.json())
      .then((data) => setModels(data.models || []))
      .catch((err) => console.error('Error fetching initial models:', err));
  }, []);

  const handleLoadPrompt = (prompt) => {
    setActivePrompt(prompt);
    setActiveRun(null);
    setActiveTab('workspace');
  };

  const handleLoadRun = (run) => {
    setActiveRun(run);
    setActivePrompt(null);
    setActiveResponses(run.responses || {});
    setActiveTab('workspace');
  };

  const handleExport = (format) => {
    const resps = Object.values(activeResponses).filter((r) => r.status === 'SUCCESS');
    if (resps.length === 0) {
      alert('Please run a benchmark first before exporting results.');
      return;
    }

    let content = '';
    let mimeType = 'text/plain';
    let filename = `modelbench-run-${Date.now()}`;

    if (format === 'json') {
      content = JSON.stringify(resps, null, 2);
      mimeType = 'application/json';
      filename += '.json';
    } else if (format === 'csv') {
      const headers = ['ModelId', 'TTFT_ms', 'Duration_ms', 'TokensPerSec', 'Tokens', 'CostUSD', 'JudgeScore'];
      const rows = resps.map((r) => [
        r.modelId,
        r.metrics?.timeToFirstTokenMs || 0,
        r.metrics?.totalDurationMs || 0,
        r.metrics?.tokensPerSecond || 0,
        r.metrics?.completionTokens || 0,
        r.metrics?.estimatedCostUsd || 0,
        r.evaluation?.overallWeightedScore || 'N/A',
      ]);
      content = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      mimeType = 'text/csv';
      filename += '.csv';
    } else if (format === 'md') {
      content = `# ModelBench AI — Benchmark Evaluation Report\n\nGenerated: ${new Date().toISOString()}\n\n## Results Summary\n\n| Model | TTFT (ms) | Throughput (tok/s) | Tokens | Est. Cost ($) | Judge Quality (/10) |\n|---|---|---|---|---|---|\n`;
      for (const r of resps) {
        content += `| **${r.modelId}** | ${r.metrics?.timeToFirstTokenMs || 0}ms | ${r.metrics?.tokensPerSecond || 0} t/s | ${r.metrics?.completionTokens || 0} | $${r.metrics?.estimatedCostUsd?.toFixed(6) || 0} | ${r.evaluation?.overallWeightedScore?.toFixed(2) || 'N/A'} |\n`;
      }
      content += `\n\n## Generated Outputs\n\n`;
      for (const r of resps) {
        content += `### ${r.modelId}\n\n\`\`\`\n${r.rawText}\n\`\`\`\n\n`;
      }
      mimeType = 'text/markdown';
      filename += '.md';
    }

    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const activeModelCount = models.filter((m) => m.isActive).length;

  return (
    <div className="min-h-screen bg-[#0C0C0E] text-stone-100 flex flex-col font-sans selection:bg-amber-900/50 selection:text-white">
      {/* Top Navigation - Obsidian & Amber */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activeModelCount={activeModelCount}
        totalModelCount={models.length || 5}
        isStreaming={false}
        onExport={handleExport}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'workspace' && (
          <WorkspaceView
            initialPrompt={activePrompt?.templateText}
            initialRun={activeRun}
            onResponsesUpdate={setActiveResponses}
          />
        )}

        {activeTab === 'diff' && (
          <DiffInspectorView
            models={models}
            responses={activeResponses}
          />
        )}

        {activeTab === 'leaderboard' && <LeaderboardView />}

        {activeTab === 'router' && <SmartRouterView />}

        {activeTab === 'prompts' && (
          <PromptLibraryView
            onLoadPrompt={handleLoadPrompt}
            onLoadRun={handleLoadRun}
          />
        )}

        {activeTab === 'analytics' && <AnalyticsView />}

        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Footer / System Status - Warm Obsidian & Amber */}
      <footer className="border-t border-stone-800/80 bg-[#101014] py-4 text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-3 font-mono">
          <div className="flex items-center gap-3">
            <span className="text-stone-300 font-semibold">ModelBench AI Matrix</span>
            <span>·</span>
            <span>Google · Groq · Cerebras · OpenRouter</span>
            <span>·</span>
            <span className="text-emerald-400 flex items-center gap-1 font-medium">
              <ShieldCheck className="h-3.5 w-3.5" /> Fail-Safe Resilient
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-stone-400">
            <span>Server-Sent Events (SSE) Multiplexer</span>
            <span>·</span>
            <span>Gemini 2.5 Rubric Judge</span>
            <span>·</span>
            <span>PostgreSQL Prisma Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
