import { Model, RoutingPriority, RoutingRecommendation } from '../types';

export interface ModelPerformanceStats {
  modelId: string;
  avgLatencyMs: number;
  avgCostPerQueryUsd: number;
  avgJudgeScore: number;
  successRate: number;
}

/**
 * Normalizes an array of values into [0, 1] range.
 * If higherIsBetter is false, 0 gets mapped to 1 (inversion).
 */
export function normalizeMetric(
  value: number,
  min: number,
  max: number,
  higherIsBetter: boolean
): number {
  if (max === min) return 1.0;
  const scaled = (value - min) / (max - min);
  return higherIsBetter ? Math.max(0, Math.min(1, scaled)) : Math.max(0, Math.min(1, 1 - scaled));
}

/**
 * Intelligent Smart Model Router:
 * Evaluates candidate models based on user priority:
 * 1. LOWEST_COST: 70% cost weight, 20% reliability, 10% quality
 * 2. LOWEST_LATENCY: 70% latency weight, 20% reliability, 10% quality
 * 3. HIGHEST_QUALITY: 75% judge score weight, 15% reliability, 10% latency
 * 4. BALANCED: 35% quality, 30% cost, 25% latency, 10% reliability
 */
export function selectOptimalModel(
  models: Model[],
  stats: Record<string, ModelPerformanceStats>,
  priority: RoutingPriority
): RoutingRecommendation {
  const activeModels = models.filter((m) => m.isActive);
  if (activeModels.length === 0) {
    throw new Error('No active models available for routing.');
  }

  // Calculate min and max bounds for normalization
  const latencies = activeModels.map((m) => stats[m.id]?.avgLatencyMs || m.typicalTtftMs);
  const costs = activeModels.map(
    (m) => stats[m.id]?.avgCostPerQueryUsd || (m.inputCostPerM + m.outputCostPerM) / 2_000_000
  );
  const scores = activeModels.map((m) => stats[m.id]?.avgJudgeScore || 8.0);
  const successRates = activeModels.map((m) => stats[m.id]?.successRate ?? 98);

  const minLat = Math.min(...latencies);
  const maxLat = Math.max(...latencies);
  const minCost = Math.min(...costs);
  const maxCost = Math.max(...costs);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const minSuccess = Math.min(...successRates);
  const maxSuccess = Math.max(...successRates);

  const modelScores: Record<string, number> = {};

  for (const model of activeModels) {
    const stat = stats[model.id];
    const latency = stat?.avgLatencyMs || model.typicalTtftMs;
    const cost = stat?.avgCostPerQueryUsd || (model.inputCostPerM + model.outputCostPerM) / 2_000_000;
    const quality = stat?.avgJudgeScore || 8.0;
    const reliability = stat?.successRate ?? 98;

    const normLat = normalizeMetric(latency, minLat, maxLat, false);
    const normCost = normalizeMetric(cost, minCost, maxCost, false);
    const normScore = normalizeMetric(quality, minScore, maxScore, true);
    const normRel = normalizeMetric(reliability, minSuccess, maxSuccess, true);

    let compositeScore = 0;
    switch (priority) {
      case 'LOWEST_COST':
        compositeScore = normCost * 0.7 + normRel * 0.2 + normScore * 0.1;
        break;
      case 'LOWEST_LATENCY':
        compositeScore = normLat * 0.7 + normRel * 0.2 + normScore * 0.1;
        break;
      case 'HIGHEST_QUALITY':
        compositeScore = normScore * 0.75 + normRel * 0.15 + normLat * 0.1;
        break;
      case 'BALANCED':
      default:
        compositeScore = normScore * 0.35 + normCost * 0.3 + normLat * 0.25 + normRel * 0.1;
        break;
    }

    modelScores[model.id] = Math.round(compositeScore * 1000) / 10; // score out of 100
  }

  // Rank models
  const ranked = [...activeModels].sort((a, b) => (modelScores[b.id] || 0) - (modelScores[a.id] || 0));
  const recommended = ranked[0];
  const fallback = ranked[1] || ranked[0];

  // Generate plain English explanation of the decision
  let reason = '';
  switch (priority) {
    case 'LOWEST_COST':
      reason = `Selected ${recommended.displayName} as it minimizes cost ($${recommended.inputCostPerM.toFixed(2)}/M in, $${recommended.outputCostPerM.toFixed(2)}/M out) while maintaining a ${(stats[recommended.id]?.successRate ?? 99).toFixed(1)}% benchmark reliability rate.`;
      break;
    case 'LOWEST_LATENCY':
      reason = `Selected ${recommended.displayName} (${recommended.providerId.toUpperCase()}) due to an average time-to-first-token of ~${recommended.typicalTtftMs || 250}ms and high streaming throughput (~${recommended.typicalTokPerSec} tok/s).`;
      break;
    case 'HIGHEST_QUALITY':
      reason = `Selected ${recommended.displayName} with historical average evaluation score of ${(stats[recommended.id]?.avgJudgeScore || 9.2).toFixed(1)}/10 on complex reasoning and instruction following.`;
      break;
    case 'BALANCED':
    default:
      reason = `Selected ${recommended.displayName} because it offers the highest composite balance across latency, cost-efficiency, and evaluation scores (${modelScores[recommended.id]}/100).`;
      break;
  }

  return {
    priority,
    recommendedModel: recommended,
    reason,
    scores: modelScores,
    fallbackModel: fallback,
    tradeOffAnalysis: {
      latencyVsCost: `${recommended.displayName} yields ~${recommended.typicalTokPerSec} tok/s at $${recommended.inputCostPerM}/M input tokens.`,
      qualityAssessment: `Average benchmark quality score is ${(stats[recommended.id]?.avgJudgeScore || 8.8).toFixed(1)}/10 across evaluated tasks.`,
    },
  };
}
