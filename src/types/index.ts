export type ProviderId = 'google' | 'groq' | 'cerebras' | 'openrouter';

export type TaskCategory = 'coding' | 'reasoning' | 'summarization' | 'creative' | 'general';

export type RoutingPriority = 'LOWEST_COST' | 'LOWEST_LATENCY' | 'HIGHEST_QUALITY' | 'BALANCED';

export interface Provider {
  id: ProviderId;
  name: string;
  baseUrl: string;
  apiDocsUrl: string;
  isConfigured: boolean;
  isActive: boolean;
}

export interface Model {
  id: string;
  providerId: ProviderId;
  displayName: string;
  family: string;
  contextWindow: number;
  inputCostPerM: number;
  outputCostPerM: number;
  isFreeTier: boolean;
  isActive: boolean;
  typicalTokPerSec: number;
  typicalTtftMs: number;
  description: string;
}

export interface ModelConfig {
  modelId: string;
  providerId: ProviderId;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface StreamChunk {
  modelId: string;
  delta: string;
  isFirstToken: boolean;
  tokensSoFar: number;
  timestamp: number;
  timeToFirstTokenMs?: number;
}

export interface ModelMetrics {
  timeToFirstTokenMs: number;
  totalDurationMs: number;
  tokensPerSecond: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  costSource: 'provider_reported' | 'calculated_pricing' | 'estimated';
  isEstimated: boolean;
}

export interface EvaluationCriteria {
  correctness: number; // 0-10
  relevance: number; // 0-10
  completeness: number; // 0-10
  instructionFollowing: number; // 0-10
  clarity: number; // 0-10
  overallWeightedScore: number; // 0-10
  reasoning: string;
  strengths: string[];
  weaknesses: string[];
}

export interface ModelResponse {
  id: string;
  runId: string;
  modelId: string;
  rawText: string;
  status: 'PENDING' | 'STREAMING' | 'SUCCESS' | 'FAILED' | 'TIMEOUT';
  errorMessage?: string;
  startedAt: number;
  finishedAt?: number;
  metrics?: ModelMetrics;
  evaluation?: EvaluationCriteria;
}

export interface ExperimentRun {
  id: string;
  experimentId: string;
  prompt: string;
  systemPrompt?: string;
  category: TaskCategory;
  temperature: number;
  maxTokens: number;
  triggeredAt: number;
  completedAt?: number;
  totalDurationMs?: number;
  status: 'RUNNING' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
  responses: Record<string, ModelResponse>;
  bestModelId?: string;
  judgeVerdict?: string;
  judgeExplanation?: string;
}

export interface PromptTemplate {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  tags: string[];
  templateText: string;
  systemPrompt?: string;
  temperature: number;
  maxTokens: number;
  createdAt: string;
  updatedAt: string;
  versionsCount: number;
}

export interface SSEMessage {
  event: 'init' | 'token' | 'model_complete' | 'model_error' | 'experiment_complete' | 'evaluation_complete' | 'keepalive';
  data: any;
}

export interface LeaderboardEntry {
  modelId: string;
  modelName: string;
  providerId: ProviderId;
  providerName: string;
  family: string;
  totalRuns: number;
  successRate: number; // 0 - 100%
  avgJudgeScore: number; // 0 - 10
  avgTimeToFirstTokenMs: number;
  avgTokensPerSec: number;
  avgTotalDurationMs: number;
  avgCostPerQueryUsd: number;
  inputCostPerM: number;
  outputCostPerM: number;
  winCount: number;
}

export interface RoutingRecommendation {
  priority: RoutingPriority;
  recommendedModel: Model;
  reason: string;
  scores: Record<string, number>;
  fallbackModel: Model;
  tradeOffAnalysis: {
    latencyVsCost: string;
    qualityAssessment: string;
  };
}
