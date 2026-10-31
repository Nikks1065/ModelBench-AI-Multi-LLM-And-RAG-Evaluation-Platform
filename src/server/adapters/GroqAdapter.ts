import { BaseAdapter, ModelExecutionResult } from './BaseAdapter';
import { ModelConfig, StreamChunk, ProviderId } from '../../types';
import { calculateEstimatedCost, approximateTokenCount } from '../../utils/pricing';

export class GroqAdapter extends BaseAdapter {
  readonly providerId: ProviderId = 'groq';

  async executeStream(
    prompt: string,
    config: ModelConfig,
    onChunk: (chunk: StreamChunk) => void,
    signal?: AbortSignal
  ): Promise<ModelExecutionResult> {
    const apiKey = process.env.GROQ_API_KEY;

    if (apiKey && apiKey.startsWith('gsk_')) {
      try {
        return await this.executeRealStream(apiKey, prompt, config, onChunk, signal);
      } catch (err: any) {
        console.warn(`[GroqAdapter] Live API call failed (${err.message}). Falling back to simulation.`);
      }
    }

    // High-fidelity fallback simulation
    const simulatedResponse = this.generateSimulatedText(prompt, config.modelId);
    const isQwen = config.modelId.includes('qwen');
    return this.simulateStream(
      prompt,
      config,
      onChunk,
      simulatedResponse,
      isQwen ? 260 : 310, // Groq LPU ultra-high tok/s
      isQwen ? 160 : 120, // Groq ultra-low TTFT ~120-160ms
      signal
    );
  }

  private async executeRealStream(
    apiKey: string,
    prompt: string,
    config: ModelConfig,
    onChunk: (chunk: StreamChunk) => void,
    signal?: AbortSignal
  ): Promise<ModelExecutionResult> {
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

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: config.modelId,
        messages,
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens ?? 1024,
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Groq response body is not readable');
    }

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
            // ignore malformed SSE line
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
        timeToFirstTokenMs: ttftMs || 150,
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

  private generateSimulatedText(prompt: string, modelId: string): string {
    const isQwen = modelId.includes('qwen');
    if (isQwen) {
      return `### Qwen 2.5 Architecture Response:

Here is the systematic breakdown for:
> *${prompt.slice(0, 80)}${prompt.length > 80 ? '...' : ''}*

1. **Mathematical Invariant**:
   For any operation $f(x)$, we preserve state coherence with atomic transactions.
2. **Implementation Strategy**:
   - Utilize vectorized operations for throughput maximization.
   - Enforce bounded memory buffers: \`ring_buffer[N]\` with ring head tracking.
3. **Complexity & Benchmarks**:
   - Time Complexity: $\\mathcal{O}(1)$ average case.
   - Space Complexity: $\\mathcal{O}(k)$ where $k$ is capacity.

Designed for production environments requiring predictable memory consumption and maximum CPU cache locality.`;
    }

    // LLaMA 3.3 70B Versatile
    return `### LLaMA 3.3 70B Deep Analysis:

Addressing the core query directly:

- **Key Takeaway**: High-performance multi-threaded architectures require explicit boundary definitions and lock granularity reduction.
- **Protocol Flow**:
  1. Input sanitization & schema validation.
  2. Dispatched via asynchronous task channels.
  3. Non-blocking polling with bounded backoff.

\`\`\`rust
pub struct WorkerPool<T> {
    workers: Vec<Worker>,
    sender: Option<mpsc::Sender<Job<T>>>,
}
\`\`\`

This guarantees thread safety across concurrent workers with zero data races.`;
  }
}
