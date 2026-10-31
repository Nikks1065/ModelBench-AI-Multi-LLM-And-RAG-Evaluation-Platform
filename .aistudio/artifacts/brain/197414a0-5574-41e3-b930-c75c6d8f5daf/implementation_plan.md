# ModelBench AI — System Architecture & Implementation Plan

ModelBench AI is a multi-LLM experimentation, benchmarking, and intelligent orchestration platform. It enables engineers and researchers to dispatch a single prompt to multiple AI models in parallel, stream token responses concurrently, capture empirical performance metrics (TTFT, tokens/sec, latency, cost), evaluate answer quality via an independent AI Judge rubric, and select optimal models using explainable smart routing.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> This architectural plan is submitted for your formal review and approval before any code implementation begins. Please review the 10 core architectural deliverables below. Clicking **"Proceed"** approves the plan and commences Milestone 1.

- **Primary Runtime & Stack**: React (Vite) + Tailwind CSS + Framer Motion + Recharts frontend; Node.js + Express + Server-Sent Events (SSE) backend; Prisma ORM schema ready for PostgreSQL.
- **Provider Diversity Guarantee**: 4 distinct AI providers and 5 distinct models:
  1. Google Gemini (`gemini-2.5-flash`)
  2. Groq (`llama-3.3-70b-versatile`)
  3. Groq (`qwen-2.5-32b`)
  4. Cerebras (`llama3.1-8b` / `llama3.3-70b`)
  5. OpenRouter (`deepseek/deepseek-chat` or `deepseek/deepseek-r1:free`)
  6. AI Judge (Independent evaluator using structured schema: `gemini-2.5-flash`)
- **Key Offline/Interview Resiliency**: Full real API integration with graceful fallback simulation mode so that during NIT Trichy MCA placement demonstrations, the application operates even if a specific provider encounters rate-limiting or network latency.

---

## 1. Complete System Architecture

ModelBench AI employs a decoupled, event-driven architecture designed for high concurrency, fault isolation, and low-latency streaming.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENT LAYER (SPA)                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐ │
│  │ Prompt Studio    │  │ 5-Model Panels   │  │ Leaderboard &    │  │ Smart Router &  │ │
│  │ & Parameter Bar  │  │ & Live Streams   │  │ Performance Dash │  │ Prompt History  │ │
│  └─────────┬────────┘  └─────────▲────────┘  └─────────▲────────┘  └────────▲────────┘ │
└────────────┼─────────────────────┼─────────────────────┼────────────────────┼──────────┘
             │ HTTP POST           │ SSE Stream (Chunks) │ HTTP GET           │ HTTP GET
             ▼                     │                     │                    │
┌──────────────────────────────────┴─────────────────────┴────────────────────┴──────────┐
│                             BACKEND ORCHESTRATION SERVER                               │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Express REST & SSE Router (/api/orchestration, /api/evaluations, /api/models)    │  │
│  └───────────────────────────────────────┬──────────────────────────────────────────┘  │
│                                          │                                             │
│  ┌───────────────────────────────────────▼──────────────────────────────────────────┐  │
│  │                      Multi-Model Orchestration Engine                            │  │
│  │  ┌────────────────────┐  ┌─────────────────────┐  ┌───────────────────────────┐  │  │
│  │  │ Concurrency Pool   │  │ Abort Controller    │  │ Empirical Metric Tracker  │  │  │
│  │  │ & Queue Manager    │  │ & Per-Model Timeout │  │ (TTFT, Latency, Tok/s)    │  │  │
│  │  └────────────────────┘  └─────────────────────┘  └───────────────────────────┘  │  │
│  └───────────────────────────────────────┬──────────────────────────────────────────┘  │
│                                          │                                             │
│  ┌───────────────────────────────────────▼──────────────────────────────────────────┐  │
│  │                    Pluggable Provider Adapter Layer                              │  │
│  │  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌──────────────────────┐  │  │
│  │  │ GeminiAdapter │ │  GroqAdapter  │ │CerebrasAdapter│ │ OpenRouterAdapter    │  │  │
│  │  └───────┬───────┘ └───────┬───────┘ └───────┬───────┘ └──────────┬───────────┘  │  │
│  └──────────┼─────────────────┼─────────────────┼────────────────────┼──────────────┘  │
│             │                 │                 │                    │                 │
│  ┌──────────▼─────────────────▼─────────────────▼────────────────────▼──────────────┐  │
│  │             AI Judge Evaluation Service (Gemini 2.5 Structured JSON)             │  │
│  └───────────────────────────────────────┬──────────────────────────────────────────┘  │
└──────────────────────────────────────────┼─────────────────────────────────────────────┘
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              DATA PERSISTENCE & CACHE                                  │
│  ┌───────────────────────────────────────┐  ┌───────────────────────────────────────┐  │
│  │ PostgreSQL / Prisma ORM               │  │ In-Memory Fast Cache & Fallback Repo  │  │
│  │ (Experiments, Runs, Metrics, Prompts) │  │ (Active session state & live feeds)   │  │
│  └───────────────────────────────────────┘  └───────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Core Architecture Principles:
1. **Provider Isolation**: Every provider is wrapped in a strict, uniform `BaseAdapter` interface. A failure, timeout, or rate-limit error in one provider (e.g. OpenRouter) is completely isolated and does not abort the remaining 4 streams.
2. **Streaming Multiplexing**: A single SSE connection broadcasts structured JSON events tagged with `modelId`, enabling 5 response panels to render incoming deltas smoothly at up to 100+ tokens/sec without race conditions.
3. **Metric Decoupling**: Empirical metrics (Time-to-First-Token, wall-clock latency, streaming chunk timestamps) are measured locally on the server; provider-reported usage (prompt tokens, completion tokens) is extracted from API headers/payloads; cost is calculated via a dynamic pricing registry.
4. **Decoupled AI Judge**: The AI Judge is invoked strictly after model completion or as an on-demand evaluation job, preventing judge latency from blocking user response comparisons.

---

## 2. Comprehensive Architecture & Component Interaction Diagram

```
[User Browser]
      │
      │ 1. POST /api/orchestration/run { prompt, modelIds: [1,2,3,4,5], params }
      ▼
[Express REST Controller]
      │
      │ 2. Validate input & Generate experimentId (UUIDv4)
      │ 3. Initialize Experiment & ExperimentRun records in DB
      ├───────────────────────────────────────────────────────┐
      │ Returns: { experimentId, status: "INITIALIZED" }      │
      ▼                                                       │
[User Browser opens EventSource]                              │
      │                                                       │
      │ 4. GET /api/orchestration/stream/:experimentId        │
      ▼                                                       │
[SSE Stream Handler]                                          │
      │                                                       │
      │ 5. Register client SSE connection to Experiment Bus   │
      │                                                       │
      ▼                                                       ▼
[Multi-Model Orchestrator] <──────────────────────────────────┘
      │
      │ 6. Promise.allSettled with Concurrency Limit & AbortSignals
      ├─────────────────┬─────────────────┬──────────────────┬─────────────────┐
      │ Task 1          │ Task 2          │ Task 3           │ Task 4          │ Task 5
      ▼                 ▼                 ▼                  ▼                 ▼
[Gemini Adapter]  [Groq Llama]     [Groq Qwen]     [Cerebras]       [OpenRouter DeepSeek]
      │                 │                 │                  │                 │
      │ (Streaming chunks over HTTPS API) │                  │                 │
      ▼                 ▼                 ▼                  ▼                 ▼
[Empirical Metric Watcher (measures TTFT, chunk delta intervals, total clock time)]
      │
      │ 7. Server emits SSE Events: { type: "CHUNK", modelId, delta, ttftMs, tokensSoFar }
      ▼
[SSE Multiplexer] ──► [Client Browser 5-Panel Grid renders text + charts in real time]
      │
      │ 8. Providers Finish: Capture token counts & calculate estimated cost
      │ 9. Server emits SSE: { type: "MODEL_COMPLETE", modelId, metrics, status }
      │ 10. Persist ModelResponse & ModelMetric to DB
      │
      ▼ (All 5 Settled)
[SSE Event: EXPERIMENT_COMPLETE]
      │
      │ 11. (Optional / Triggered) POST /api/evaluations/judge
      ▼
[AI Judge Service] (Gemini 2.5 Flash Evaluation Prompt + Strict JSON Schema)
      │
      │ 12. Generates: Correctness, Relevance, Completeness, Following, Clarity (0-10)
      │ 13. Calculates Weighted Quality Score & persists Evaluation record
      ▼
[SSE Event / HTTP Response: EVALUATION_COMPLETE { scores, explanation, winner }]
```

---

## 3. Database ER Diagram & Relational Schema

Below is the normalized relational data model (matching Prisma ORM schema specifications):

```
┌──────────────────┐       1:N       ┌──────────────────┐
│       User       ├─────────────────┤      Prompt      │
├──────────────────┤                 ├──────────────────┤
│ id (PK, UUID)    │                 │ id (PK, UUID)    │
│ email (Unique)   │                 │ userId (FK)      │
│ name             │                 │ title            │
│ role (USER/ADMIN)│                 │ category         │
│ createdAt        │                 │ tags (Text[])    │
│ updatedAt        │                 │ createdAt        │
└──────────────────┘                 └─────────┬────────┘
                                               │ 1:N
                                               ▼
┌──────────────────┐       1:N       ┌──────────────────┐
│    Experiment    ├─────────────────┤  PromptVersion   │
├──────────────────┤                 ├──────────────────┤
│ id (PK, UUID)    │                 │ id (PK, UUID)    │
│ promptVersionId  │◄────────────────┤ promptId (FK)    │
│ title            │                 │ version (Int)    │
│ systemPrompt     │                 │ templateText     │
│ temperature      │                 │ variables (JSON) │
│ maxTokens        │                 │ createdAt        │
│ status           │                 └──────────────────┘
│ createdAt        │
└────────┬─────────┘
         │ 1:N
         ▼
┌──────────────────┐
│  ExperimentRun   │
├──────────────────┤
│ id (PK, UUID)    │
│ experimentId(FK) │
│ triggeredAt      │
│ completedAt      │
│ totalDurationMs  │
│ status           │
└────────┬─────────┘
         │ 1:N
         ▼
┌──────────────────┐       N:1       ┌──────────────────┐       N:1       ┌──────────────────┐
│  ModelResponse   ├─────────────────┤      Model       ├─────────────────┤     Provider     │
├──────────────────┤                 ├──────────────────┤                 ├──────────────────┤
│ id (PK, UUID)    │                 │ id (PK, String)  │                 │ id (PK, String)  │
│ runId (FK)       │                 │ providerId (FK)  │                 │ name             │
│ modelId (FK)     │                 │ displayName      │                 │ baseUrl          │
│ rawText          │                 │ family           │                 │ apiDocsUrl       │
│ status           │                 │ contextWindow    │                 │ rateLimitRpm     │
│ errorMessage     │                 │ inputCostPerM    │                 │ isActive         │
│ startedAt        │                 │ outputCostPerM   │                 └──────────────────┘
│ finishedAt       │                 │ isFreeTier       │
└──────┬─────┬─────┘                 │ isActive         │
       │     │                       └──────────────────┘
   1:1 │     │ 1:1
       │     └────────────────────────────────────────┐
       ▼                                              ▼
┌───────────────────────────────┐       ┌───────────────────────────────┐
│          ModelMetric          │       │          Evaluation           │
├───────────────────────────────┤       ├───────────────────────────────┤
│ id (PK, UUID)                 │       │ id (PK, UUID)                 │
│ responseId (FK, Unique)       │       │ responseId (FK, Unique)       │
│ timeToFirstTokenMs (Int)      │       │ judgeModelId                  │
│ totalDurationMs (Int)         │       │ correctness (Float 0-10)      │
│ tokensPerSecond (Float)       │       │ relevance (Float 0-10)        │
│ promptTokens (Int)            │       │ completeness (Float 0-10)     │
│ completionTokens (Int)        │       │ instructionFollowing (0-10)   │
│ totalTokens (Int)             │       │ clarity (Float 0-10)          │
│ estimatedCostUsd (Float)      │       │ overallWeightedScore (Float)  │
│ costSource (String)           │       │ reasoning (Text)              │
│ isEstimated (Boolean)         │       │ evaluatedAt                   │
└───────────────────────────────┘       └───────────────────────────────┘
```

### Relational Constraints & Cascading:
- `PromptVersion` cascades on `Prompt` delete (`onDelete: Cascade`).
- `ExperimentRun` and `ModelResponse` cascade on `Experiment` delete.
- Indexes:
  - `ModelResponse(runId, modelId)`
  - `ModelMetric(responseId)`
  - `Evaluation(responseId)`
  - `Prompt(userId, category)`
  - `Experiment(createdAt DESC)`

---

## 4. API Endpoint Design

All endpoints reside under `/api/` and return standard JSON or `text/event-stream`.

### 4.1 Orchestration Endpoints
- `POST /api/orchestration/run`
  - **Body**: `{ prompt: string, systemPrompt?: string, modelIds: string[], temperature?: number, maxTokens?: number, category?: string }`
  - **Response (202 Accepted)**: `{ experimentId: string, runId: string, status: "PENDING", selectedModels: string[] }`
- `GET /api/orchestration/stream/:experimentId`
  - **Type**: Server-Sent Events (`text/event-stream`)
  - **Events Emitted**:
    - `EVENT: init` `{ experimentId, runId, models, timestamp }`
    - `EVENT: token` `{ modelId, delta, chunkIndex, ttftMs, currentTokenCount }`
    - `EVENT: model_complete` `{ modelId, status: "SUCCESS", metrics: { ttftMs, durationMs, tokensPerSecond, inputTokens, outputTokens, costUsd } }`
    - `EVENT: model_error` `{ modelId, status: "FAILED", error: string, durationMs }`
    - `EVENT: all_complete` `{ runId, finishedAt, summary: { fastestModel, mostCostEffective, highestThroughput } }`
- `POST /api/orchestration/cancel/:experimentId`
  - **Body**: `{ reason?: string }`
  - **Response (200 OK)**: `{ cancelled: true, experimentId: string }`

### 4.2 Evaluation & AI Judge Endpoints
- `POST /api/evaluations/judge`
  - **Body**: `{ experimentId: string, runId: string, modelResponseIds?: string[] }`
  - **Response (200 OK)**:
    ```json
    {
      "runId": "uuid",
      "evaluations": [
        {
          "modelId": "gemini-2.5-flash",
          "correctness": 9.5,
          "relevance": 10.0,
          "completeness": 9.0,
          "instructionFollowing": 10.0,
          "clarity": 9.5,
          "overallWeightedScore": 9.60,
          "reasoning": "Directly addressed constraints with verified syntax and concise explanation."
        }
      ],
      "bestModel": "gemini-2.5-flash",
      "verdict": "Clear winner in speed-to-quality ratio."
    }
    ```

### 4.3 Model Management & Registry Endpoints
- `GET /api/models`
  - **Response**: List of configured models with provider details, active status, context length, pricing rates per 1M tokens, and latency benchmark averages.
- `PATCH /api/models/:modelId/toggle`
  - **Body**: `{ isActive: boolean }`

### 4.4 Prompt Library & History Endpoints
- `GET /api/prompts` — List prompts with category, tags, and version counts.
- `POST /api/prompts` — Create prompt with initial version.
- `GET /api/experiments` — Paginated history of past benchmark runs with filters (by model, date, score).
- `GET /api/experiments/:id` — Full details, raw text, and metrics for a past run.

### 4.5 Leaderboard & Smart Routing Endpoints
- `GET /api/leaderboard`
  - **Query**: `?timeframe=all|30d|7d&category=all|coding|reasoning|creative`
  - **Response**: Aggregated table ranked by Overall Elo / Average Judge Score, Latency, Throughput, and Success Rate.
- `POST /api/router/recommend`
  - **Body**: `{ prompt: string, priority: "LOWEST_COST" | "LOWEST_LATENCY" | "HIGHEST_QUALITY" | "BALANCED", maxBudgetUsd?: number }`
  - **Response**: `{ recommendedModelId: string, reason: string, scoreBreakdown: object, fallbackModelId: string }`

---

## 5. Folder Structure

```
├── .env.example
├── index.html
├── metadata.json
├── package.json
├── tsconfig.json
├── vite.config.ts
├── server.ts                       # Express backend server with Vite middleware integration
├── prisma/
│   ├── schema.prisma               # Complete Prisma relational schema
│   └── seed.ts                     # Database seed for providers, models, and benchmark prompts
├── src/
│   ├── main.tsx                    # React application entry point
│   ├── App.tsx                     # Main application layout, navigation, and router
│   ├── index.css                   # Tailwind v4 styles & design system tokens
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx          # Top bar with status, breadcrumbs, and quick actions
│   │   │   └── Sidebar.tsx         # Navigation sidebar (Workspace, Leaderboard, History, etc.)
│   │   ├── workspace/
│   │   │   ├── PromptEditor.tsx    # Prompt input, system prompt, temperature, parameter sliders
│   │   │   ├── ModelSelector.tsx   # Model toggle pills & provider badges
│   │   │   ├── ComparisonGrid.tsx  # 5-Model side-by-side streaming response grid
│   │   │   ├── ModelPanel.tsx      # Individual response card with telemetry HUD & copy action
│   │   │   └── MetricsSummary.tsx  # Live throughput, TTFT, and latency comparative bar charts
│   │   ├── evaluation/
│   │   │   ├── JudgeScoreModal.tsx # Detailed rubric breakdown modal (Correctness, Clarity, etc.)
│   │   │   └── EvaluationRadar.tsx # Radar chart comparing 5 models across 5 evaluation axes
│   │   ├── leaderboard/
│   │   │   ├── LeaderboardTable.tsx# Sortable model leaderboard with win rates & reliability
│   │   │   └── MetricFilterBar.tsx # Category & metric filter controls
│   │   ├── router/
│   │   │   └── SmartRouterCard.tsx # Routing decision engine & explainability card
│   │   └── prompts/
│   │       ├── PromptLibrary.tsx   # Saved prompts list, version selector, tag filters
│   │       └── PromptModal.tsx     # Save/edit prompt dialog
│   ├── hooks/
│   │   ├── useOrchestration.ts     # SSE stream management, state accumulation, abort controls
│   │   └── useLeaderboard.ts       # Query hook for aggregated stats
│   ├── lib/
│   │   ├── api.ts                  # Typed client fetch wrappers
│   │   └── pricing.ts              # Cost calculation metadata & formulas ($/1M tokens)
│   └── server/
│       ├── adapters/
│       │   ├── BaseAdapter.ts      # Abstract provider adapter interface
│       │   ├── GeminiAdapter.ts    # Google Gemini 2.5 Flash implementation
│       │   ├── GroqAdapter.ts      # Groq Llama & Qwen implementations
│       │   ├── CerebrasAdapter.ts  # Cerebras Wafer-Scale engine implementation
│       │   ├── OpenRouterAdapter.ts# OpenRouter DeepSeek implementation
│       │   └── index.ts            # Adapter registry & factory
│       ├── services/
│       │   ├── OrchestrationService.ts # Concurrency manager, metric tracker, and SSE bus
│       │   ├── EvaluationService.ts    # AI Judge structured rubric evaluator
│       │   ├── RoutingService.ts       # Cost, latency, and quality router
│       │   └── StorageService.ts       # Database repository with fallback in-memory cache
│       ├── controllers/
│       │   ├── orchestrationController.ts
│       │   ├── evaluationController.ts
│       │   ├── modelController.ts
│       │   └── promptController.ts
│       └── utils/
│           ├── logger.ts           # Structured log formatter
│           └── tokenizer.ts        # Fast fallback token counter & math utilities
```

---

## 6. Five-Model Provider Integration Plan

| # | Provider | Model ID | Family | Context | Input Cost / 1M | Output Cost / 1M | Free Tier Status | Key Strength |
|---|---|---|---|---|---|---|---|---|
| **1** | **Google** | `gemini-2.5-flash` | Gemini | 1,000,000 | $0.075 | $0.30 | Generous free tier via Google AI Studio | Huge context, ultra-smart reasoning, multimodal |
| **2** | **Groq** | `llama-3.3-70b-versatile` | LLaMA | 128,000 | $0.59 | $0.79 | Free tier on Groq Cloud Console | Extreme tokens/sec (>250 tok/s on LPUs) |
| **3** | **Groq** | `qwen-2.5-32b` | Qwen | 32,768 | $0.20 | $0.20 | Free tier on Groq Cloud Console | Distinct model family, exceptional code & logic |
| **4** | **Cerebras** | `llama3.1-8b` | LLaMA | 8,192 | $0.10 | $0.10 | Free tier via Cerebras Cloud | Wafer-Scale Engine, sub-second TTFT |
| **5** | **OpenRouter** | `deepseek/deepseek-chat` *(or `deepseek/deepseek-r1:free`)* | DeepSeek | 64,000 | $0.14 | $0.28 | Free/micro-cost tier on OpenRouter | High reasoning benchmarks, strong open weights |

### Uniform Adapter Interface Contract (`BaseAdapter`):
```typescript
export interface ModelConfig {
  modelId: string;
  providerId: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface StreamChunk {
  delta: string;
  isFirstToken: boolean;
  timestamp: number;
}

export interface ModelExecutionResult {
  modelId: string;
  rawText: string;
  timeToFirstTokenMs: number;
  totalDurationMs: number;
  tokensPerSecond: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  status: 'SUCCESS' | 'FAILED' | 'TIMEOUT';
  error?: string;
}

export abstract class BaseAdapter {
  abstract readonly providerId: string;
  abstract executeStream(
    prompt: string,
    config: ModelConfig,
    onChunk: (chunk: StreamChunk) => void,
    signal?: AbortSignal
  ): Promise<ModelExecutionResult>;
}
```

---

## 7. AI Judge Architecture & Evaluation Engine

The AI Judge operates as an independent quality auditor using `gemini-2.5-flash` with a strict JSON schema and verifiable rubric.

### 7.1 Evaluation Rubric & Weights
1. **Correctness (Weight: 25%)**: Factual accuracy, absence of hallucinations, algorithmic precision.
2. **Relevance (Weight: 20%)**: Direct alignment with user intent without conversational fluff.
3. **Completeness (Weight: 20%)**: Exhaustive treatment of edge cases and specified requirements.
4. **Instruction Following (Weight: 20%)**: Strict adherence to formatting constraints (JSON, code-only, word limits).
5. **Clarity (Weight: 15%)**: Readability, structure, code comments, and typographic presentation.

$$\text{Overall Score} = (0.25 \times C) + (0.20 \times R) + (0.20 \times Co) + (0.20 \times I) + (0.15 \times Cl)$$

### 7.2 Structured Judge Prompt & JSON Schema Contract
The Judge system prompt instructs the evaluator to compare all 5 candidate outputs side by side against the initial prompt. The evaluator returns:
```json
{
  "evaluations": [
    {
      "modelId": "string",
      "correctness": 9.2,
      "relevance": 9.5,
      "completeness": 8.8,
      "instructionFollowing": 10.0,
      "clarity": 9.4,
      "weightedScore": 9.35,
      "strengths": ["Fast execution", "Followed JSON schema without preamble"],
      "weaknesses": ["Missed edge case on empty array input"],
      "verdictSummary": "Highest precision and clean output formatting."
    }
  ],
  "rankedModelIds": ["gemini-2.5-flash", "llama-3.3-70b-versatile", "..."],
  "judgeExplanation": "Detailed comparative analysis across all candidate responses."
}
```

---

## 8. Parallel Execution and Streaming Flow

```
[Prompt Submission]
       │
       ▼
[Validate Input & Build AbortControllers]
       │
       ▼
[Run Promise.allSettled across 5 Adapters]
 ├──► Worker 1: Gemini Adapter (fetch stream)
 ├──► Worker 2: Groq Llama Adapter (fetch stream)
 ├──► Worker 3: Groq Qwen Adapter (fetch stream)
 ├──► Worker 4: Cerebras Adapter (fetch stream)
 └──► Worker 5: OpenRouter Adapter (fetch stream)
       │
       │ (For each incoming chunk)
       ▼
[Empirical Metric Watcher]
 ├── If first chunk: record TTFT (Date.now() - startTime)
 ├── Increment token counter
 ├── Calculate instantaneous tokens/sec
 └── Push SSE Event: { event: "CHUNK", modelId, delta, ttftMs, tokensSoFar }
       │
       │ (When each worker resolves)
       ▼
[Calculate Final Metrics]
 ├── Total duration (finishTime - startTime)
 ├── Extract usage or approximate via standard BPE tokenizer
 ├── Compute Cost: (promptTokens * inputRate + completionTokens * outputRate) / 1,000,000
 └── Push SSE Event: { event: "MODEL_DONE", modelId, metrics }
       │
       │ (When all 5 workers finish or timeout)
       ▼
[Push SSE Event: EXPERIMENT_DONE]
 └── Trigger AI Judge async evaluation
```

---

## 9. Free / Low-Cost API Setup Instructions

To enable live production requests across all providers, configure these environment variables in `.env`:

```env
# 1. Google Gemini (Free tier available)
# Obtain at: https://aistudio.google.com/app/apikey
GEMINI_API_KEY="your-gemini-api-key"

# 2. Groq Cloud (Free tier available with high token limits)
# Obtain at: https://console.groq.com/keys
GROQ_API_KEY="your-groq-api-key"

# 3. Cerebras Cloud (Free tier for developer evaluation)
# Obtain at: https://cloud.cerebras.ai/
CEREBRAS_API_KEY="your-cerebras-api-key"

# 4. OpenRouter (Free models and $1-5 credit tiers)
# Obtain at: https://openrouter.ai/keys
OPENROUTER_API_KEY="your-openrouter-api-key"

# 5. Database Connection (PostgreSQL or local SQLite for development)
DATABASE_URL="postgresql://user:password@localhost:5432/modelbench"
```

> [!NOTE]
> **Zero-Disruption Fallback**: If an API key is not present in `.env`, the adapter automatically activates a high-fidelity **Empirical Realistic Simulator** that models real-world tokens/second, token latency variations, and realistic responses for that provider. This guarantees that your presentation or evaluation run never crashes due to an expired API quota during an NIT Trichy MCA interview.

---

## 10. Development Milestones & Phased Execution Plan

- **Milestone 1: Backend Foundation, Data Models & Common Adapter Protocol**
  - Setup Express server with Vite middleware integration in `server.ts`.
  - Create the abstract `BaseAdapter` interface and token calculation utilities.
  - Setup database repositories and in-memory persistence stores.
  - Write unit tests for pricing calculations and tokenizer math via `node:test`.

- **Milestone 2: Multi-Provider Adapters & Isolation Implementation**
  - Implement `GeminiAdapter`, `GroqAdapter` (Llama & Qwen), `CerebrasAdapter`, and `OpenRouterAdapter`.
  - Implement timeout wrappers and provider failure isolation.
  - Implement realistic fallback simulation when keys are unconfigured.

- **Milestone 3: Parallel Orchestration Engine & Server-Sent Events (SSE)**
  - Implement parallel execution pool (`Promise.allSettled`).
  - Create SSE broadcast bus for real-time token streaming.
  - Test streaming endpoints and cancellation hooks.

- **Milestone 4: AI Judge Evaluation Engine**
  - Implement the structured AI Judge evaluator using Gemini with the 5-point rubric.
  - Implement mathematical weighted scoring and JSON response validator.

- **Milestone 5: Workspace Frontend — 5-Model Side-by-Side Comparison UI**
  - Build the developer-focused dark UI layout (deep charcoal `#0B0F19`, electric violet `#7C3AED`, and cyan `#06B6D4` accents).
  - Create the prompt input bar, parameter sliders (temperature, max tokens), and model toggle selectors.
  - Build the 5-panel streaming grid with live TTFT counters, tokens/sec speedometer, and token count meters.

- **Milestone 6: Performance Analytics & Dynamic Model Leaderboard**
  - Build comparative latency and throughput Recharts visualizations.
  - Build the dynamic leaderboard ranking models by cost, speed, and judge quality score.
  - Add task category filtering (Coding, Math/Reasoning, Summarization, Creative).

- **Milestone 7: Explainable Smart Model Routing Engine**
  - Build the multi-criteria router (Lowest Cost, Lowest Latency, Highest Quality, Balanced).
  - Add interactive "Route My Prompt" preview displaying the explainability breakdown and provider fallbacks.

- **Milestone 8: Prompt Management, Experiment History & Reproducibility**
  - Implement Prompt Library with tagging and versioning.
  - Build Experiment History drawer with one-click re-run and side-by-side historical comparison.

- **Milestone 9: End-to-End Verification, Unit Testing & Placement Presentation Polish**
  - Execute unit tests with `npx --yes tsx --test`.
  - Run browser verification in headless Chromium using `playwright-cli` to inspect user journeys.
  - Document complete installation and interview talking points in README.
