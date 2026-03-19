/**
 * Express application entry point.
 * Loads env vars, configures middleware, mounts the API router,
 * and serves the compiled React frontend in production.
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import chalk from 'chalk';
import checkRouter from './routes/check';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);
const isProd = process.env.NODE_ENV === 'production';

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------
app.use('/api', checkRouter);

// ---------------------------------------------------------------------------
// Serve compiled React frontend in production
// ---------------------------------------------------------------------------
if (isProd) {
  const dist = path.resolve(__dirname, '../../frontend/dist');
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(chalk.green.bold(`\n🚀  APA7 Checker running on http://localhost:${PORT}`));
  console.log(chalk.dim(`   Mode : ${isProd ? 'production' : 'development'}`));
  if (!process.env.OPENAI_API_KEY) {
    console.warn(
      chalk.yellow('   ⚠️   OPENAI_API_KEY not set — GPT validation will fall back to regex mode')
    );
  }
});

export default app;
