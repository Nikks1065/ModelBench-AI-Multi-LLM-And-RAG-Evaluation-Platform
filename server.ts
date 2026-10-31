import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { orchestrationService } from './src/server/services/OrchestrationService';
import { judgeService } from './src/server/services/JudgeService';
import { storageService } from './src/server/services/StorageService';
import { TaskCategory, RoutingPriority, SSEMessage } from './src/types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dev server must strictly run on port 3000 for AI Studio iframe proxy
const PORT = 3000;
const app = express();

app.use(express.json());

// --- Orchestration Routes ---
app.post('/api/orchestration/run', async (req: Request, res: Response) => {
  try {
    const { prompt, systemPrompt, modelIds, temperature, maxTokens, category, runJudge } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'Prompt is required and must be non-empty.' });
    }

    const result = await orchestrationService.startExperimentRun({
      prompt: prompt.trim(),
      systemPrompt: systemPrompt?.trim(),
      modelIds: Array.isArray(modelIds) ? modelIds : [],
      temperature: typeof temperature === 'number' ? temperature : 0.7,
      maxTokens: typeof maxTokens === 'number' ? maxTokens : 1024,
      category: category as TaskCategory,
      runJudge: runJudge !== false,
    });

    return res.status(202).json({
      success: true,
      experimentId: result.experimentId,
      runId: result.runId,
      status: 'INITIALIZED',
    });
  } catch (err: any) {
    console.error('[API] /api/orchestration/run error:', err);
    return res.status(500).json({ error: err.message || 'Internal orchestration error.' });
  }
});

// SSE Streaming Route
app.get('/api/orchestration/stream/:experimentId', (req: Request, res: Response) => {
  const { experimentId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering
  res.flushHeaders();

  // Send immediate initial ping
  res.write(`event: connected\ndata: ${JSON.stringify({ experimentId, timestamp: Date.now() })}\n\n`);

  const unsubscribe = orchestrationService.subscribeToStream(experimentId, (msg: SSEMessage) => {
    res.write(`event: ${msg.event}\ndata: ${JSON.stringify(msg.data)}\n\n`);
  });

  // Keep-alive heartbeat every 15 seconds
  const heartbeat = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

app.post('/api/orchestration/cancel/:experimentId', (req: Request, res: Response) => {
  const { experimentId } = req.params;
  const cancelled = orchestrationService.cancelExperiment(experimentId);
  return res.json({ success: true, cancelled, experimentId });
});

// --- AI Judge Evaluation Route ---
app.post('/api/evaluations/judge', async (req: Request, res: Response) => {
  try {
    const { runId } = req.body;
    if (!runId) {
      return res.status(400).json({ error: 'runId is required.' });
    }

    const run = storageService.getRun(runId);
    if (!run) {
      return res.status(404).json({ error: 'Experiment run not found.' });
    }

    const report = await judgeService.evaluateRun(run.prompt, run.systemPrompt, run.responses);

    // Update run in storage
    for (const [mId, evalData] of Object.entries(report.evaluations)) {
      if (run.responses[mId]) {
        run.responses[mId].evaluation = evalData;
      }
    }
    run.bestModelId = report.winnerModelId || undefined;
    run.judgeVerdict = report.verdict;
    run.judgeExplanation = report.judgeExplanation;
    storageService.saveRun(run);

    return res.json({ success: true, report });
  } catch (err: any) {
    console.error('[API] /api/evaluations/judge error:', err);
    return res.status(500).json({ error: err.message || 'Judge evaluation failed.' });
  }
});

// --- Models & Providers Routes ---
app.get('/api/models', (_req: Request, res: Response) => {
  const models = storageService.getModels();
  const providers = storageService.getProviders();
  return res.json({ models, providers });
});

app.patch('/api/models/:modelId/toggle', (req: Request, res: Response) => {
  const { modelId } = req.params;
  const { isActive } = req.body;
  const updated = storageService.toggleModel(modelId, Boolean(isActive));
  if (!updated) {
    return res.status(404).json({ error: 'Model not found.' });
  }
  return res.json({ success: true, model: updated });
});

// --- Prompts Library Routes ---
app.get('/api/prompts', (_req: Request, res: Response) => {
  const prompts = storageService.getPrompts();
  return res.json({ prompts });
});

app.post('/api/prompts', (req: Request, res: Response) => {
  const { title, description, category, tags, templateText, systemPrompt, temperature, maxTokens } = req.body;
  if (!title || !templateText) {
    return res.status(400).json({ error: 'Title and templateText are required.' });
  }

  const newPrompt = {
    id: `prompt-${Date.now()}`,
    title,
    description: description || '',
    category: category || 'general',
    tags: Array.isArray(tags) ? tags : [],
    templateText,
    systemPrompt: systemPrompt || '',
    temperature: typeof temperature === 'number' ? temperature : 0.7,
    maxTokens: typeof maxTokens === 'number' ? maxTokens : 1024,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    versionsCount: 1,
  };

  storageService.savePrompt(newPrompt);
  return res.status(201).json({ success: true, prompt: newPrompt });
});

app.delete('/api/prompts/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const deleted = storageService.deletePrompt(id);
  return res.json({ success: true, deleted });
});

// --- Experiments History Routes ---
app.get('/api/experiments', (_req: Request, res: Response) => {
  const runs = storageService.getAllRuns();
  return res.json({ runs });
});

app.get('/api/experiments/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const run = storageService.getRun(id);
  if (!run) {
    return res.status(404).json({ error: 'Run not found.' });
  }
  return res.json({ run });
});

// --- Leaderboard Routes ---
app.get('/api/leaderboard', (req: Request, res: Response) => {
  const category = req.query.category as TaskCategory | undefined;
  const leaderboard = storageService.getLeaderboard(category);
  return res.json({ leaderboard });
});

// --- Smart Model Routing Routes ---
app.post('/api/router/recommend', (req: Request, res: Response) => {
  const { priority } = req.body;
  const recommendation = storageService.getSmartRecommendation(
    (priority as RoutingPriority) || 'BALANCED'
  );
  return res.json({ success: true, recommendation });
});

// --- Vite Server Mount ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ModelBench AI] Full-stack server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[ModelBench AI] Fatal server startup failure:', err);
  process.exit(1);
});
