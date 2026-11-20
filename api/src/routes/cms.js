import { Router } from 'express';
import crypto from 'node:crypto';
import { config } from '../config.js';
import { clearCmsCache } from '../cms/contentful.js';

export const cmsRouter = Router();

const sameSecret = (given) => {
  const a = Buffer.from(String(given ?? ''));
  const b = Buffer.from(config.cmsWebhookSecret);
  return b.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
};

cmsRouter.post('/webhook', (req, res) => {
  if (!sameSecret(req.headers['x-utpost-webhook-secret'])) {
    return res.status(401).json({
      error: 'fel eller ingen webhook-hemlighet',
    });
  }

  clearCmsCache();
  console.log(
    `cms: webhook (${req.headers['x-contentful-topic'] ?? 'okänt ämne'}) – cachen tömd`,
  );
  res.status(204).end();
});