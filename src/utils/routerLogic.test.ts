import test from 'node:test';
import assert from 'node:assert/strict';
import { selectOptimalModel, normalizeMetric } from './routerLogic';
import { Model } from '../types';

const mockModels: Model[] = [
  {
    id: 'cheap-model',
    providerId: 'google',
    displayName: 'Cheap Flash',
    family: 'gemini',
    contextWindow: 128000,
    inputCostPerM: 0.05,
    outputCostPerM: 0.15,
    isFreeTier: true,
    isActive: true,
    typicalTokPerSec: 120,
    typicalTtftMs: 350,
    description: 'Budget fast model',
  },
  {
    id: 'fast-model',
    providerId: 'groq',
    displayName: 'Fast LPU',
    family: 'llama',
    contextWindow: 128000,
    inputCostPerM: 0.50,
    outputCostPerM: 0.80,
    isFreeTier: true,
    isActive: true,
    typicalTokPerSec: 320,
    typicalTtftMs: 120,
    description: 'Ultra-low latency model',
  },
  {
    id: 'smart-model',
    providerId: 'openrouter',
    displayName: 'Smart Reasoning',
    family: 'deepseek',
    contextWindow: 64000,
    inputCostPerM: 0.30,
    outputCostPerM: 0.60,
    isFreeTier: false,
    isActive: true,
    typicalTokPerSec: 80,
    typicalTtftMs: 500,
    description: 'High benchmark model',
  },
];

const mockStats = {
  'cheap-model': {
    modelId: 'cheap-model',
    avgLatencyMs: 350,
    avgCostPerQueryUsd: 0.00005,
    avgJudgeScore: 8.2,
    successRate: 99.5,
  },
  'fast-model': {
    modelId: 'fast-model',
    avgLatencyMs: 120,
    avgCostPerQueryUsd: 0.00045,
    avgJudgeScore: 8.5,
    successRate: 98.0,
  },
  'smart-model': {
    modelId: 'smart-model',
    avgLatencyMs: 600,
    avgCostPerQueryUsd: 0.00030,
    avgJudgeScore: 9.6,
    successRate: 97.0,
  },
};

test('normalizeMetric handles higherIsBetter flags appropriately', () => {
  // Lower latency is better (higherIsBetter = false)
  const bestLat = normalizeMetric(100, 100, 1000, false);
  const worstLat = normalizeMetric(1000, 100, 1000, false);
  assert.equal(bestLat, 1.0);
  assert.equal(worstLat, 0.0);

  // Higher score is better (higherIsBetter = true)
  const bestScore = normalizeMetric(10, 0, 10, true);
  const worstScore = normalizeMetric(0, 0, 10, true);
  assert.equal(bestScore, 1.0);
  assert.equal(worstScore, 0.0);
});

test('selectOptimalModel recommends cheapest model on LOWEST_COST priority', () => {
  const result = selectOptimalModel(mockModels, mockStats, 'LOWEST_COST');
  assert.equal(result.recommendedModel.id, 'cheap-model');
  assert.ok(result.reason.includes('minimizes cost'));
});

test('selectOptimalModel recommends fastest model on LOWEST_LATENCY priority', () => {
  const result = selectOptimalModel(mockModels, mockStats, 'LOWEST_LATENCY');
  assert.equal(result.recommendedModel.id, 'fast-model');
});

test('selectOptimalModel recommends highest quality model on HIGHEST_QUALITY priority', () => {
  const result = selectOptimalModel(mockModels, mockStats, 'HIGHEST_QUALITY');
  assert.equal(result.recommendedModel.id, 'smart-model');
});
