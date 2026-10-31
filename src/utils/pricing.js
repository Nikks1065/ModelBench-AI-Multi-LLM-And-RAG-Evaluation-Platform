/**
 * ModelBench AI - Pricing & Cost Calculator (JavaScript)
 * Based on official per-million-token published rates.
 */

export const MODEL_PRICING_REGISTRY = {
  // Google Gemini
  'gemini-2.5-flash': {
    inputPerMillion: 0.075,
    outputPerMillion: 0.30,
    source: 'Google AI Pricing Guide (Prompts <= 128k)',
    lastUpdated: '2025-01-15',
  },
  'gemini-2.0-flash': {
    inputPerMillion: 0.10,
    outputPerMillion: 0.40,
    source: 'Google AI Pricing Guide',
    lastUpdated: '2025-01-15',
  },
  // Groq
  'llama-3.3-70b-versatile': {
    inputPerMillion: 0.59,
    outputPerMillion: 0.79,
    source: 'Groq Cloud Official Pricing',
    lastUpdated: '2025-02-01',
  },
  'qwen-2.5-32b': {
    inputPerMillion: 0.20,
    outputPerMillion: 0.20,
    source: 'Groq Cloud Official Pricing',
    lastUpdated: '2025-02-01',
  },
  // Cerebras
  'llama3.1-8b': {
    inputPerMillion: 0.10,
    outputPerMillion: 0.10,
    source: 'Cerebras Cloud Pricing',
    lastUpdated: '2025-01-20',
  },
  'llama3.3-70b': {
    inputPerMillion: 0.60,
    outputPerMillion: 0.60,
    source: 'Cerebras Cloud Pricing',
    lastUpdated: '2025-01-20',
  },
  // OpenRouter
  'deepseek/deepseek-chat': {
    inputPerMillion: 0.14,
    outputPerMillion: 0.28,
    source: 'OpenRouter / DeepSeek Official API',
    lastUpdated: '2025-01-28',
  },
  'deepseek/deepseek-r1:free': {
    inputPerMillion: 0.00,
    outputPerMillion: 0.00,
    source: 'OpenRouter Free Tier',
    lastUpdated: '2025-01-28',
  },
};

/**
 * Calculates estimated API cost in USD based on input & output token counts
 */
export function calculateEstimatedCost(modelId, promptTokens, completionTokens) {
  const pricing = MODEL_PRICING_REGISTRY[modelId] || {
    inputPerMillion: 0.20,
    outputPerMillion: 0.50,
    source: 'Fallback Default Pricing Average',
    lastUpdated: '2025-01-01',
  };

  const inputCostUsd = (promptTokens / 1_000_000) * pricing.inputPerMillion;
  const outputCostUsd = (completionTokens / 1_000_000) * pricing.outputPerMillion;
  const costUsd = inputCostUsd + outputCostUsd;

  return {
    costUsd,
    inputCostUsd,
    outputCostUsd,
    pricingSource: pricing.source,
  };
}

/**
 * Formats small micro-USD values cleanly (e.g. $0.000142)
 */
export function formatUsd(amount) {
  if (typeof amount !== 'number' || isNaN(amount) || amount === 0) return '$0.00000';
  if (amount < 0.00001) return `$${amount.toExponential(2)}`;
  if (amount < 0.01) return `$${amount.toFixed(6)}`;
  return `$${amount.toFixed(4)}`;
}

/**
 * Rough BPE token approximation utility (avg ~3.8 chars per token for English/Code)
 */
export function approximateTokenCount(text) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) return 0;
  const words = text.trim().split(/\s+/).length;
  const chars = text.length;
  return Math.max(1, Math.round(chars / 3.8 + words * 0.15));
}
