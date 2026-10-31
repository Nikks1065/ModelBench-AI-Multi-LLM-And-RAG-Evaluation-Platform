import { BaseAdapter } from './BaseAdapter.js';
import { calculateEstimatedCost, approximateTokenCount } from '../../utils/pricing.js';

export class CerebrasAdapter extends BaseAdapter {
  constructor() {
    super('cerebras');
  }

  async executeStream(prompt, config, onChunk, signal) {
    const apiKey = process.env.CEREBRAS_API_KEY;

    if (apiKey && apiKey.startsWith('csk-')) {
      try {
        return await this.executeRealStream(apiKey, prompt, config, onChunk, signal);
      } catch (err) {
        console.warn(`[CerebrasAdapter] Live API call failed (${err.message}). Falling back to simulation.`);
      }
    }

    const simulatedResponse = this.generateSimulatedText(prompt, config.modelId);
    return this.simulateStream(
      prompt,
      config,
      onChunk,
      simulatedResponse,
      450,
      110,
      signal
    );
  }

  async executeRealStream(apiKey, prompt, config, onChunk, signal) {
    const startTime = Date.now();
    let ttftMs = 0;
    let isFirstToken = true;
    let accumulatedText = '';
    let tokensSoFar = 0;

    const messages = [];
    if (config.systemPrompt) {
      messages.push({ role: 'system', content: config.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: config.modelId === 'llama3.3-70b' ? 'llama3.3-70b' : 'llama3.1-8b',
        messages,
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens ?? 1024,
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`Cerebras API error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('Cerebras stream unreadable');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (trimmed.startsWith('data: ')) {
          try {
            const json = JSON.parse(trimmed.slice(6));
            const delta = json.choices?.[0]?.delta?.content || '';
            if (!delta) continue;

            if (isFirstToken) {
              ttftMs = Date.now() - startTime;
            }

            accumulatedText += delta;
            tokensSoFar += approximateTokenCount(delta);

            onChunk({
              modelId: config.modelId,
              delta,
              isFirstToken,
              tokensSoFar,
              timestamp: Date.now(),
              timeToFirstTokenMs: isFirstToken ? ttftMs : undefined,
            });

            isFirstToken = false;
          } catch {
            // ignore malformed line
          }
        }
      }
    }

    const totalDurationMs = Date.now() - startTime;
    const promptTokens = approximateTokenCount(prompt + (config.systemPrompt || ''));
    const completionTokens = approximateTokenCount(accumulatedText);
    const totalTokens = promptTokens + completionTokens;
    const tokensPerSecond =
      totalDurationMs > 0 ? Math.round((completionTokens / (totalDurationMs / 1000)) * 10) / 10 : 0;

    const { costUsd } = calculateEstimatedCost(config.modelId, promptTokens, completionTokens);

    return {
      modelId: config.modelId,
      rawText: accumulatedText,
      metrics: {
        timeToFirstTokenMs: ttftMs || 110,
        totalDurationMs,
        tokensPerSecond,
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCostUsd: costUsd,
        costSource: 'calculated_pricing',
        isEstimated: false,
      },
      status: 'SUCCESS',
    };
  }

  generateSimulatedText(prompt, modelId) {
    return `### Cerebras WSE High-Throughput Response (${modelId}):

Query Resolution:
"${prompt.slice(0, 90)}${prompt.length > 90 ? '...' : ''}"

- **Hardware Acceleration Note**: Processed on Cerebras CS-3 Wafer-Scale Engine (4 trillion transistors, 900,000 AI cores, 44GB on-chip SRAM).
- **Core Insights**:
  1. Ultra-low memory bandwidth bottlenecking allows immediate completion generation.
  2. The prompt requirements are satisfied with optimal modularity and zero unnecessary allocation.
  3. Tail latency is bounded strictly within tight hardware clock bounds.

Recommendation: For real-time interactive agents and high-frequency code completion, this configuration delivers optimal tokens-per-second economy.`;
  }
}
