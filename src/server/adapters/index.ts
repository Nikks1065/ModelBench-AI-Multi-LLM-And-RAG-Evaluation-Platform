import { BaseAdapter } from './BaseAdapter';
import { GeminiAdapter } from './GeminiAdapter';
import { GroqAdapter } from './GroqAdapter';
import { CerebrasAdapter } from './CerebrasAdapter';
import { OpenRouterAdapter } from './OpenRouterAdapter';
import { Provider, Model, ProviderId } from '../../types';

export const INITIAL_PROVIDERS: Provider[] = [
  {
    id: 'google',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    apiDocsUrl: 'https://ai.google.dev/docs',
    isConfigured: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
    isActive: true,
  },
  {
    id: 'groq',
    name: 'Groq Cloud LPU',
    baseUrl: 'https://api.groq.com/openai/v1',
    apiDocsUrl: 'https://console.groq.com/docs',
    isConfigured: !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.startsWith('gsk_')),
    isActive: true,
  },
  {
    id: 'cerebras',
    name: 'Cerebras Wafer-Scale',
    baseUrl: 'https://api.cerebras.ai/v1',
    apiDocsUrl: 'https://cloud.cerebras.ai/docs',
    isConfigured: !!(process.env.CEREBRAS_API_KEY && process.env.CEREBRAS_API_KEY.startsWith('csk-')),
    isActive: true,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter / DeepSeek',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiDocsUrl: 'https://openrouter.ai/docs',
    isConfigured: !!(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.startsWith('sk-or-')),
    isActive: true,
  },
];

export const INITIAL_MODELS: Model[] = [
  {
    id: 'gemini-2.5-flash',
    providerId: 'google',
    displayName: 'Gemini 2.5 Flash',
    family: 'Gemini',
    contextWindow: 1048576,
    inputCostPerM: 0.075,
    outputCostPerM: 0.30,
    isFreeTier: true,
    isActive: true,
    typicalTokPerSec: 140,
    typicalTtftMs: 320,
    description: 'Next-gen multimodal reasoning with 1M context window and high instruction fidelity.',
  },
  {
    id: 'llama-3.3-70b-versatile',
    providerId: 'groq',
    displayName: 'LLaMA 3.3 70B',
    family: 'LLaMA',
    contextWindow: 128000,
    inputCostPerM: 0.59,
    outputCostPerM: 0.79,
    isFreeTier: true,
    isActive: true,
    typicalTokPerSec: 290,
    typicalTtftMs: 120,
    description: 'Flagship open weights model accelerated on Groq LPUs with sub-150ms TTFT.',
  },
  {
    id: 'qwen-2.5-32b',
    providerId: 'groq',
    displayName: 'Qwen 2.5 32B',
    family: 'Qwen',
    contextWindow: 32768,
    inputCostPerM: 0.20,
    outputCostPerM: 0.20,
    isFreeTier: true,
    isActive: true,
    typicalTokPerSec: 250,
    typicalTtftMs: 160,
    description: 'Specialized for advanced mathematics, complex coding, and structured reasoning.',
  },
  {
    id: 'llama3.1-8b',
    providerId: 'cerebras',
    displayName: 'Cerebras LLaMA 3.1 8B',
    family: 'LLaMA',
    contextWindow: 8192,
    inputCostPerM: 0.10,
    outputCostPerM: 0.10,
    isFreeTier: true,
    isActive: true,
    typicalTokPerSec: 460,
    typicalTtftMs: 110,
    description: 'Wafer-Scale Engine acceleration delivering world-record token streaming speeds (>450 tok/s).',
  },
  {
    id: 'deepseek/deepseek-chat',
    providerId: 'openrouter',
    displayName: 'DeepSeek Chat V3',
    family: 'DeepSeek',
    contextWindow: 64000,
    inputCostPerM: 0.14,
    outputCostPerM: 0.28,
    isFreeTier: false,
    isActive: true,
    typicalTokPerSec: 95,
    typicalTtftMs: 420,
    description: 'OpenRouter-hosted DeepSeek V3 offering state-of-the-art coding and chain-of-thought analysis.',
  },
];

class AdapterRegistry {
  private adapters: Map<ProviderId, BaseAdapter> = new Map();

  constructor() {
    this.adapters.set('google', new GeminiAdapter());
    this.adapters.set('groq', new GroqAdapter());
    this.adapters.set('cerebras', new CerebrasAdapter());
    this.adapters.set('openrouter', new OpenRouterAdapter());
  }

  getAdapter(providerId: ProviderId): BaseAdapter {
    const adapter = this.adapters.get(providerId);
    if (!adapter) {
      throw new Error(`No adapter registered for provider: ${providerId}`);
    }
    return adapter;
  }

  getAdapterForModel(modelId: string, modelsList: Model[]): BaseAdapter {
    const model = modelsList.find((m) => m.id === modelId);
    if (!model) {
      throw new Error(`Unknown model: ${modelId}`);
    }
    return this.getAdapter(model.providerId);
  }
}

export const adapterRegistry = new AdapterRegistry();
export { BaseAdapter, GeminiAdapter, GroqAdapter, CerebrasAdapter, OpenRouterAdapter };
