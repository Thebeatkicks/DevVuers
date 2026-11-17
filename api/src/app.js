import express from 'express';
import cors from 'cors';
import { ZodError } from 'zod';
import { config } from './config.js';
import { authRouter } from './routes/auth.js';
import { guidesRouter } from './routes/guides.ts';
import { toursRouter } from './routes/tours.js';
import { photosRouter } from './routes/photos.js';
import { mongo } from './db/mongo.js';
import { pool } from './db/client.js';
import { yoga } from './graphql/server.js';
import { wrap } from './lib/wrap.js';

export const app = express();

app.use(cors()); 

app.use(yoga.graphqlEndpoint, yoga);

app.use(express.json({ limit: '1mb' }));

app.get(
  '/api/health',
  wrap(async (req, res) => {
    const check = async (fn) => {
      try {
        await fn();
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err.message };
      }
    };
    const postgres = await check(() => pool.query('SELECT 1'));
    const mongoDb = await check(async () => {
      await mongo.connect();
      await mongo.db().command({ ping: 1 });
    });
    const ok = postgres.ok && mongoDb.ok;
    res.status(ok ? 200 : 500).json({ ok, sha: config.gitSha, postgres, mongoDb });
  }),
);

app.use('/api/auth', authRouter);
app.use('/api/guides', guidesRouter);
app.use('/api/tours', toursRouter);
app.use('/api/photos', photosRouter);

app.use((err, req, res, next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'ogiltig indata',
      issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'ogiltig JSON' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'för stor request' });
  console.error(`${req.method} ${req.originalUrl}: ${err.message}`);
  res.status(500).json({ error: 'internt fel' });
});