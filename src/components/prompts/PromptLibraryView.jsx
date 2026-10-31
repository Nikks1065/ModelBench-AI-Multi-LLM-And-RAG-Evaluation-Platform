import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  History,
  Play,
  Plus,
  Trash2,
  Layers,
  ArrowRight,
  Award,
} from 'lucide-react';

export const PromptLibraryView = ({
  onLoadPrompt,
  onLoadRun,
}) => {
  const [activeSubTab, setActiveSubTab] = useState('templates');
  const [prompts, setPrompts] = useState([]);
  const [runs, setRuns] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState('coding');
  const [newTags, setNewTags] = useState('');

  const fetchPrompts = async () => {
    try {
      const res = await fetch('/api/prompts');
      const data = await res.json();
      setPrompts(data.prompts || []);
    } catch (err) {
      console.error('Failed to fetch prompts:', err);
    }
  };

  const fetchRuns = async () => {
    try {
      const res = await fetch('/api/experiments');
      const data = await res.json();
      setRuns(data.runs || []);
    } catch (err) {
      console.error('Failed to fetch runs:', err);
    }
  };

  useEffect(() => {
    fetchPrompts();
    fetchRuns();
  }, []);

  const handleCreatePrompt = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newText.trim()) return;

    try {
      const res = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          templateText: newText,
          category: newCategory,
          tags: newTags.split(',').map((t) => t.trim()).filter(Boolean),
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewTitle('');
        setNewText('');
        setNewTags('');
        fetchPrompts();
      }
    } catch (err) {
      console.error('Failed to save prompt:', err);
    }
  };

  const handleDeletePrompt = async (id) => {
    try {
      await fetch(`/api/prompts/${id}`, { method: 'DELETE' });
      fetchPrompts();
    } catch (err) {
      console.error('Failed to delete prompt:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Sub-tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <BookOpen className="h-6 w-6 text-amber-400" />
            <h2 className="text-xl font-bold tracking-tight text-stone-100">Prompts & Experiment Runs</h2>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Manage versioned benchmark prompts, tags, and reproduce past multi-model runs with full metadata.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-[#141418] border border-stone-800 p-1 text-xs">
            <button
              onClick={() => setActiveSubTab('templates')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeSubTab === 'templates'
                  ? 'bg-amber-600 text-stone-950 font-bold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Prompt Templates ({prompts.length})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                activeSubTab === 'history'
                  ? 'bg-amber-600 text-stone-950 font-bold'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span>Run History ({runs.length})</span>
            </button>
          </div>

          {activeSubTab === 'templates' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-stone-950 shadow-md shadow-amber-950/40 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Prompt</span>
            </button>
          )}
        </div>
      </div>

      {/* Subtab 1: Prompt Templates */}
      {activeSubTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {prompts.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-stone-800 bg-[#121216] p-5 shadow-lg backdrop-blur-sm flex flex-col justify-between hover:border-stone-700 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-stone-100 text-sm leading-snug">{p.title}</h3>
                  <button
                    onClick={() => handleDeletePrompt(p.id)}
                    aria-label={`Delete prompt ${p.title}`}
                    className="p-1 rounded text-stone-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <p className="text-xs text-stone-400 line-clamp-2">{p.description || p.templateText}</p>

                {/* Tags */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-800/60 font-semibold">
                    {p.category}
                  </span>
                  {p.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-mono text-stone-400 bg-[#181820] px-2 py-0.5 rounded border border-stone-800"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-stone-800/70 flex items-center justify-between text-xs">
                <span className="font-mono text-stone-500 text-[11px]">
                  v{p.versionsCount || 1} · {new Date(p.createdAt).toLocaleDateString()}
                </span>
                <button
                  onClick={() => onLoadPrompt(p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181820] hover:bg-stone-800 text-amber-400 hover:text-amber-300 font-semibold transition-colors border border-stone-800 hover:border-amber-700/60"
                >
                  <Play className="h-3 w-3 fill-current" />
                  <span>Run in Workspace</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Subtab 2: Run History */}
      {activeSubTab === 'history' && (
        <div className="space-y-3">
          {runs.length === 0 ? (
            <div className="p-8 text-center text-stone-500 text-xs border border-dashed border-stone-800 rounded-xl">
              No previous experiment runs recorded yet. Submit your first benchmark in the Workspace!
            </div>
          ) : (
            runs.map((r) => {
              const respList = Object.values(r.responses || {});
              const successfulResps = respList.filter((resp) => resp.status === 'SUCCESS');

              return (
                <div
                  key={r.id}
                  className="rounded-xl border border-stone-800 bg-[#121216] p-4 hover:border-stone-700 transition-colors flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-stone-800 text-stone-300 font-medium">
                        {r.category}
                      </span>
                      <span className="text-[11px] font-mono text-stone-400">
                        {new Date(r.triggeredAt).toLocaleString()}
                      </span>
                      {r.bestModelId && (
                        <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber-300 bg-amber-950/60 border border-amber-800/80 px-1.5 py-0.5 rounded">
                          <Award className="h-3 w-3" /> Winner: {r.bestModelId}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-200 line-clamp-1 font-medium">{r.prompt}</p>
                    <div className="text-[11px] text-stone-400 font-mono">
                      {successfulResps.length} models responded · Total Duration: {r.totalDurationMs ? `${r.totalDurationMs}ms` : '—'}
                    </div>
                  </div>

                  <button
                    onClick={() => onLoadRun(r)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181820] hover:bg-stone-800 text-stone-200 font-medium text-xs transition-colors border border-stone-800 hover:border-amber-700/60"
                  >
                    <span>Inspect Results</span>
                    <ArrowRight className="h-3.5 w-3.5 text-amber-400" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Add Prompt Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-stone-700 bg-[#141418] p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Save Benchmark Prompt Template</h3>
            <form onSubmit={handleCreatePrompt} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Distributed Consensus Verification"
                  className="w-full rounded-lg border border-stone-800 bg-[#0E0E12] px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Prompt Template</label>
                <textarea
                  required
                  rows={4}
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Enter prompt text..."
                  className="w-full rounded-lg border border-stone-800 bg-[#0E0E12] p-3 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full rounded-lg border border-stone-800 bg-[#0E0E12] px-2 py-2 text-xs text-white"
                  >
                    <option value="coding">Coding</option>
                    <option value="reasoning">Reasoning</option>
                    <option value="summarization">Summarization</option>
                    <option value="creative">Creative</option>
                    <option value="general">General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    placeholder="go, raft, distributed"
                    className="w-full rounded-lg border border-stone-800 bg-[#0E0E12] px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-stone-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
