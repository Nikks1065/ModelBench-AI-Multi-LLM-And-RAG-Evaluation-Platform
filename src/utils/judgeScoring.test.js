import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateWeightedJudgeScore, determineWinnerModel, clampScore } from './judgeScoring.js';

test('clampScore keeps values strictly within 0.0 to 10.0 range', () => {
  assert.equal(clampScore(12.5), 10.0);
  assert.equal(clampScore(-2.0), 0.0);
  assert.equal(clampScore(8.44), 8.4);
});

test('calculateWeightedJudgeScore applies formula accurately', () => {
  const perfect = calculateWeightedJudgeScore({
    correctness: 10,
    relevance: 10,
    completeness: 10,
    instructionFollowing: 10,
    clarity: 10,
  });
  assert.equal(perfect.overallWeightedScore, 10.0);

  const mixed = calculateWeightedJudgeScore({
    correctness: 8.0,
    relevance: 9.0,
    completeness: 7.0,
    instructionFollowing: 10.0,
    clarity: 8.0,
  });
  assert.equal(mixed.overallWeightedScore, 8.4);
});

test('determineWinnerModel picks model with highest weighted score', () => {
  const modelA = calculateWeightedJudgeScore({
    correctness: 8,
    relevance: 8,
    completeness: 8,
    instructionFollowing: 8,
    clarity: 8,
  });
  const modelB = calculateWeightedJudgeScore({
    correctness: 9.5,
    relevance: 9,
    completeness: 9.5,
    instructionFollowing: 9.5,
    clarity: 9,
  });

  const winnerResult = determineWinnerModel({
    'model-a': modelA,
    'model-b': modelB,
  });

  assert.equal(winnerResult.winnerModelId, 'model-b');
  assert.ok(winnerResult.highestScore > 9.0);
});
