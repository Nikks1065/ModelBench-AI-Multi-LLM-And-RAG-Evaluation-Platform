/**
 * AI Judge Rubric & Weighted Scoring Engine (JavaScript)
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
};

export function clampScore(val) {
  if (typeof val !== 'number' || isNaN(val)) return 5.0;
  return Math.min(10.0, Math.max(0.0, Math.round(val * 10) / 10));
}

export function calculateWeightedJudgeScore(input) {
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

export function determineWinnerModel(evaluations) {
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
