# ModelBench AI — Advanced Multi-LLM Evaluation, Comparison & Orchestration Platform

ModelBench AI is a production-grade multi-LLM benchmarking, parallel streaming, and intelligent orchestration system designed for high-concurrency developer evaluation and model routing.

---

## 1. Key Capabilities & Architectural Highlights

- **Multi-Provider Adapter Pattern**: Fully decoupled `BaseAdapter` interface abstracting 4 distinct AI providers and 5 answer-generating models:
  1. **Google Gemini** (`gemini-2.5-flash` via `@google/genai`)
  2. **Groq LPU** (`llama-3.3-70b-versatile` with >280 tok/s streaming)
  3. **Groq LPU** (`qwen-2.5-32b` specialized for code & math)
  4. **Cerebras Wafer-Scale Engine** (`llama3.1-8b` with sub-120ms TTFT)
  5. **OpenRouter** (`deepseek/deepseek-chat` / `deepseek/deepseek-r1:free`)
- **Independent AI Judge (6th Model)**:
  - Uses `gemini-2.5-flash` with a strict JSON schema rubric.
  - Criteria: Correctness (25%), Relevance (20%), Completeness (20%), Instruction Following (20%), Clarity (15%).
  - Fully decoupled: Judge execution never stalls raw streaming responses.
- **Real-Time Parallel Multiplexing**:
  - `Promise.allSettled` concurrency pool.
  - Server-Sent Events (SSE) broadcasting chunks tagged with `modelId`.
  - AbortController and per-model timeout bounds (35s).
  - Provider failure isolation: If one provider encounters rate-limiting, other streams continue uninterrupted.
- **Empirical Metric Instrumentation**:
  - Measured Time-to-First-Token (TTFT in ms) using high-resolution server timers.
  - Real-time token throughput (tok/s).
  - Total latency duration.
  - Estimated cost calculated from official published per-1M token pricing tables.
- **Dynamic Leaderboard**:
  - Filterable by task category (Coding, Reasoning, Summarization, Creative) and provider.
  - Multi-column sortable table tracking quality score, speed, cost, and reliability.
- **Intelligent Explainable Model Router**:
  - Multi-criteria optimization: Lowest Cost, Lowest Latency, Highest Quality, Balanced Pareto.
  - Provides plain-English rationale and failover fallback paths.
- **Fail-Safe Offline Simulation**:
  - If third-party API keys are missing or rate-limited, the adaptive empirical simulator kicks in automatically, ensuring uninterrupted demonstrations during placement interviews.

---

## 2. Environment Variables (`.env`)

```env
# Google AI Studio / Gemini API Key
GEMINI_API_KEY="your-gemini-api-key"

# Groq Cloud API Key
GROQ_API_KEY="gsk_your-groq-api-key"

# Cerebras Cloud API Key
CEREBRAS_API_KEY="csk-your-cerebras-api-key"

# OpenRouter API Key
OPENROUTER_API_KEY="sk-or-your-openrouter-api-key"

# Database Connection (PostgreSQL)
DATABASE_URL="postgresql://postgres:password@localhost:5432/modelbench"

# Server Port (Defaults to 3000)
PORT=3000
```

---

## 3. Database Schema (Prisma ORM)

The relational schema (`prisma/schema.prisma`) includes 11 normalized models:
- `User` (RBAC roles)
- `Provider` (API connection parameters)
- `Model` (Context window, pricing per 1M tokens)
- `Prompt` & `PromptVersion` (Versioned prompt library)
- `Experiment` & `ExperimentRun` (Execution metadata, status, duration)
- `ModelResponse` (Raw generated text, timestamps, status)
- `ModelMetric` (TTFT, duration, tokens/sec, token counts, cost)
- `Evaluation` (AI Judge criteria scores, reasoning, strengths/weaknesses)
- `UsageRecord` (Historical token usage logs)

To migrate on PostgreSQL:
```bash
npx prisma migrate dev --name init
npx prisma generate
```

---

## 4. Verification & Automated Unit Testing

Run pure logic unit tests (scoring formulas, router algorithms, pricing calculators):
```bash
npx tsx --test src/utils/*.test.ts
```

Start full-stack development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
npm start
```
