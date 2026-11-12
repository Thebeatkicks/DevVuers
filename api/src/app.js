import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { authRouter } from './routes/auth.js';
import { guidesRouter } from "./routes/guides.ts";
import { toursRouter } from './routes/tours.js';
import { photosRouter } from './routes/photos.js';
import { mongo } from './db/mongo.js';
import { pool } from './db/client.js';
import { yoga } from './graphql/server.js';

// Bygger appen och exporterar den utan att lyssna på en port – index.js startar servern,
// och testerna (routes.test.js) startar den på en ledig port själva.
export const app = express();

app.use(cors());

// GraphQL (M4): en endpoint bredvid REST-routerna. Ligger före express.json() – yoga läser sin egen body.
app.use(yoga.graphqlEndpoint, yoga);

app.use(express.json({ limit: '50mb' }));

app.get('/api/health', async (req, res) => {
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
});

app.use('/api/auth', authRouter);
app.use('/api/guides', guidesRouter);
app.use('/api/tours', toursRouter);
app.use('/api/photos', photosRouter);
