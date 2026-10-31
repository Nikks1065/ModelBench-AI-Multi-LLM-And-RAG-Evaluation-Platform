import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateEstimatedCost, formatUsd, approximateTokenCount } from './pricing.js';

test('calculateEstimatedCost correctly multiplies per-million rates for Gemini Flash', () => {
  const result = calculateEstimatedCost('gemini-2.5-flash', 1_000_000, 1_000_000);
  assert.equal(Math.round(result.inputCostUsd * 1000) / 1000, 0.075);
  assert.equal(Math.round(result.outputCostUsd * 1000) / 1000, 0.30);
  assert.equal(Math.round(result.costUsd * 1000) / 1000, 0.375);
});

test('calculateEstimatedCost handles small token counts without underflow', () => {
  const result = calculateEstimatedCost('llama-3.3-70b-versatile', 500, 200);
  assert.ok(result.costUsd > 0);
  assert.ok(result.costUsd < 0.001);
});

test('formatUsd formats values into clean currencies', () => {
  assert.equal(formatUsd(0), '$0.00000');
  assert.equal(formatUsd(0.000155), '$0.000155');
  assert.equal(formatUsd(1.23456), '$1.2346');
});

test('approximateTokenCount calculates expected token range', () => {
  const sample = "The quick brown fox jumps over the lazy dog.";
  const count = approximateTokenCount(sample);
  assert.ok(count >= 8 && count <= 15);
  assert.equal(approximateTokenCount(''), 0);
});
