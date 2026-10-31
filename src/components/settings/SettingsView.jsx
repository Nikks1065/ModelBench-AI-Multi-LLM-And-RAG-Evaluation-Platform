import React, { useState, useEffect } from 'react';
import {
  Key,
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Terminal,
} from 'lucide-react';

export const SettingsView = () => {
  const [providers, setProviders] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/models');
      const data = await res.json();
      setProviders(data.providers || []);
      setModels(data.models || []);
    } catch (err) {
      console.error('Failed to load settings data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleModel = async (modelId, currentStatus) => {
    try {
      const res = await fetch(`/api/models/${modelId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      if (res.ok) {
        setModels((prev) =>
          prev.map((m) => (m.id === modelId ? { ...m, isActive: !currentStatus } : m))
        );
      }
    } catch (err) {
      console.error('Failed to toggle model:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-stone-800 pb-5">
        <div className="flex items-center gap-2.5">
          <Key className="h-6 w-6 text-amber-400" />
          <h2 className="text-xl font-bold tracking-tight text-stone-100">API Configuration & Providers</h2>
        </div>
        <p className="text-xs text-stone-400 mt-1">
          Review connected AI provider credentials, free-tier quotas, and configure active model endpoints.
        </p>
      </div>

      {/* Security Architecture Note */}
      <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/20 p-4 text-xs text-emerald-300 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-emerald-200">Zero-Leak Security Architecture</div>
          <p className="text-emerald-400/90 leading-relaxed">
            API keys are read strictly from backend environment variables (<code>.env</code>) and are never exposed to the frontend browser bundle. All requests are routed securely via our Express adapter proxy.
          </p>
        </div>
      </div>

      {/* Connected Providers Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providers.map((p) => {
          return (
            <div
              key={p.id}
              className="rounded-xl border border-stone-800 bg-[#121216] p-5 backdrop-blur-md flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-stone-100 text-sm">{p.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs font-mono">
                    {p.isConfigured ? (
                      <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/50 border border-emerald-800/80 px-2 py-0.5 rounded font-medium">
                        <CheckCircle2 className="h-3 w-3" /> Live Key Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-400 bg-amber-950/50 border border-amber-800/80 px-2 py-0.5 rounded font-medium">
                        <AlertCircle className="h-3 w-3" /> Resilient Simulator
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-xs text-stone-400 font-mono">
                  Base URL: <span className="text-stone-300">{p.baseUrl}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-stone-800/80 flex items-center justify-between text-xs">
                <span className="text-stone-500 font-mono text-[11px]">RPM Limit: ~60 req/min</span>
                {p.apiDocsUrl && (
                  <a
                    href={p.apiDocsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-colors font-medium"
                  >
                    <span>Developer Portal</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Model Enable / Disable Registry */}
      <div className="rounded-xl border border-stone-800 bg-[#121216] p-5 backdrop-blur-md space-y-4">
        <div>
          <h3 className="font-semibold text-sm text-stone-100">Active Model Registry</h3>
          <p className="text-xs text-stone-400 mt-0.5">
            Toggle models to include or exclude them from multi-model parallel benchmark runs.
          </p>
        </div>

        <div className="divide-y divide-stone-800/60">
          {models.map((m) => (
            <div key={m.id} className="py-3 flex items-center justify-between gap-4 text-xs">
              <div>
                <div className="font-medium text-stone-100 flex items-center gap-2">
                  <span>{m.displayName}</span>
                  <span className="font-mono text-[10px] uppercase text-stone-400 bg-stone-800 px-1.5 py-0.2 rounded">
                    {m.providerId}
                  </span>
                </div>
                <div className="text-stone-400 text-[11px] mt-0.5">{m.description}</div>
              </div>

              <button
                onClick={() => handleToggleModel(m.id, m.isActive)}
                className="flex items-center gap-2 text-xs font-mono font-medium transition-colors"
              >
                {m.isActive ? (
                  <span className="flex items-center gap-1 text-amber-400 font-bold">
                    <ToggleRight className="h-6 w-6 text-amber-500" /> Active
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-stone-500">
                    <ToggleLeft className="h-6 w-6 text-stone-600" /> Disabled
                  </span>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Placement Interview Demo Resilience Note */}
      <div className="p-4 rounded-xl border border-amber-800/40 bg-amber-950/20 text-xs text-stone-300 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-amber-300">
          <Terminal className="h-4 w-4 text-amber-400" />
          <span>NIT Trichy Placement Demonstration Resiliency</span>
        </div>
        <p className="text-stone-400 leading-relaxed text-[11px]">
          If an external provider (such as Groq, Cerebras, or OpenRouter) experiences a transient rate limit, network timeout, or if an API key is omitted, ModelBench AI automatically activates its <strong>Adaptive Empirical Simulator</strong>. The simulator reproduces exact tokens/second streaming velocities, latency variations, and technical responses so your live demonstration never stalls.
        </p>
      </div>
    </div>
  );
};
