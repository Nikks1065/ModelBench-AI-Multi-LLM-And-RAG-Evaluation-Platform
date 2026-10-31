/**
 * AI Judge Rubric & Weighted Scoring Engine
 * 
 * Criteria & Weights:
 * - Correctness: 25% (0.25)
 * - Relevance: 20% (0.20)
 * - Completeness: 20% (0.20)
 * - Instruction Following: 20% (0.20)
 * - Clarity: 15% (0.15)
 */

export const JUDGE_WEIGHTS = {
  correctness: 0.25,
  relevance: 0.20,
  completeness: 0.20,
  instructionFollowing: 0.20,
  clarity: 0.15,
} as const;

export interface RawJudgeEvaluationInput {
  correctness: number;
  relevance: number;
  completeness: number;
  instructionFollowing: number;
  clarity: number;
  reasoning?: string;
  strengths?: string[];
  weaknesses?: string[];
}

export interface ValidatedJudgeScore {
  correctness: number;
  relevance: number;
  completeness: number;
  instructionFollowing: number;
  clarity: number;
  overallWeightedScore: number;
  reasoning: string;
  strengths: string[];
  weaknesses: string[];
  isValid: boolean;
}

/**
 * Bounds a score strictly between 0.0 and 10.0 and rounds to 1 decimal place.
 */
export function clampScore(val: number): number {
  if (typeof val !== 'number' || isNaN(val)) return 5.0;
  return Math.min(10.0, Math.max(0.0, Math.round(val * 10) / 10));
}

/**
 * Computes the verified overall weighted score according to the formula:
 * Score = (0.25 * C) + (0.20 * R) + (0.20 * Comp) + (0.20 * Inst) + (0.15 * Clar)
 */
export function calculateWeightedJudgeScore(input: RawJudgeEvaluationInput): ValidatedJudgeScore {
  const correctness = clampScore(input.correctness);
  const relevance = clampScore(input.relevance);
  const completeness = clampScore(input.completeness);
  const instructionFollowing = clampScore(input.instructionFollowing);
  const clarity = clampScore(input.clarity);

  const rawWeighted =
    correctness * JUDGE_WEIGHTS.correctness +
    relevance * JUDGE_WEIGHTS.relevance +
    completeness * JUDGE_WEIGHTS.completeness +
    instructionFollowing * JUDGE_WEIGHTS.instructionFollowing +
    clarity * JUDGE_WEIGHTS.clarity;

  // Round weighted score to 2 decimal places
  const overallWeightedScore = Math.round(rawWeighted * 100) / 100;

  return {
    correctness,
    relevance,
    completeness,
    instructionFollowing,
    clarity,
    overallWeightedScore,
    reasoning: input.reasoning?.trim() || 'No explicit evaluation reasoning provided.',
    strengths: Array.isArray(input.strengths) ? input.strengths : [],
    weaknesses: Array.isArray(input.weaknesses) ? input.weaknesses : [],
    isValid: true,
  };
}

/**
 * Selects the best performing model from a batch of evaluations
 */
export function determineWinnerModel(
  evaluations: Record<string, ValidatedJudgeScore>
): {
  winnerModelId: string | null;
  highestScore: number;
  rankings: Array<{ modelId: string; score: number }>;
} {
  const entries = Object.entries(evaluations);
  if (entries.length === 0) {
    return { winnerModelId: null, highestScore: 0, rankings: [] };
  }

  const sorted = entries
    .map(([modelId, ev]) => ({
      modelId,
      score: ev.overallWeightedScore,
    }))
    .sort((a, b) => b.score - a.score);

  return {
    winnerModelId: sorted[0]?.modelId || null,
    highestScore: sorted[0]?.score || 0,
    rankings: sorted,
  };
}
