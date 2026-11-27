#!/usr/bin/env node
// M9 (Steg 4): skapar innehållstypen Guide (guide) och migrerar alla 40 guiderna ur Postgres
// (inklusive omvandling av body_html till Contentful Rich Text).
//
//   npm run cms:migrate
//
// Kräver i .env (se .env.example):
//   CONTENTFUL_SPACE_ID          – Settings > General settings > Space ID
//   CONTENTFUL_MANAGEMENT_TOKEN  – Settings > CMA tokens > Create personal access token
//   DATABASE_URL                 – Postgres med seedade guider (standard: localhost:5433)
//
// Skriptet är idempotent (går att köra om utan dubbletter): varje guide får det fasta id:t
// utpost-guide-<id> (1..40) och uppdateras på plats med X-Contentful-Version.
// Guider med published = true publiceras; guider med published = false lämnas som utkast (draft).
import { pool } from '../api/src/db/client.js';

const space = process.env.CONTENTFUL_SPACE_ID?.trim();
const token = process.env.CONTENTFUL_MANAGEMENT_TOKEN?.trim();
const environment = (process.env.CONTENTFUL_ENVIRONMENT ?? 'master').trim();

if (!space || !token) {
  console.error('Saknar CONTENTFUL_SPACE_ID eller CONTENTFUL_MANAGEMENT_TOKEN i .env – se .env.example.');
  process.exit(1);
}

const base = `https://api.contentful.com/spaces/${space}/environments/${environment}`;
const paus = (ms) => new Promise((r) => setTimeout(r, ms));

// Ett anrop till CMA. Gratisnivån tillåter 7 skrivningar/sekund – 200 ms paus håller oss på högst 5/s.
// Vid 429 läser vi X-Contentful-RateLimit-Reset (sekunder), väntar och försöker igen.
const cma = async (method, path, { body, version, contentType } = {}) => {
  await paus(200);
  const res = await fetch(base + path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/vnd.contentful.management.v1+json',
      ...(version !== undefined ? { 'X-Contentful-Version': String(version) } : {}),
      ...(contentType ? { 'X-Contentful-Content-Type': contentType } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 404 && method === 'GET') return null;
  if (res.status === 429) {
    const waitSec = Number(res.headers.get('x-contentful-ratelimit-reset') || res.headers.get('retry-after') || 2);
    console.warn(`429 rate limit på ${method} ${path} – väntar ${waitSec}s och försöker igen...`);
    await paus(waitSec * 1000);
    return cma(method, path, { body, version, contentType });
  }
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${(await res.text()).slice(0, 400)}`);
  return res.status === 204 ? null : res.json();
};

// Innehållsmodellen för Guide: fälten säger vad innehållet ÄR, inte hur det ser ut.
// guideId (1..40) kopplar posten till raden i Postgres även när staging kallstartar och seedar om
// med nya slumpade sluggar (SEED_ON_START=1).
const guideType = {
  name: 'Guide',
  description: 'Redaktionell friluftsguide med rubriker, brödtext och punktlistor som strukturerad data.',
  displayField: 'title',
  fields: [
    {
      id: 'guideId',
      name: 'Guide-ID (1–40)',
      type: 'Integer',
      required: true,
      localized: false,
      validations: [{ range: { min: 1, max: 1000 } }],
    },
    {
      id: 'slug',
      name: 'Slug',
      type: 'Symbol',
      required: true,
      localized: false,
      validations: [{ regexp: { pattern: '^[a-z0-9-]+$' }, message: 'Små bokstäver, siffror och bindestreck' }],
    },
    {
      id: 'title',
      name: 'Titel',
      type: 'Symbol',
      required: true,
      localized: false,
      validations: [{ size: { max: 120 } }],
    },
    {
      id: 'body',
      name: 'Brödtext',
      type: 'RichText',
      required: true,
      localized: false,
      validations: [
        { enabledMarks: ['bold', 'italic'], message: 'Bara fet och kursiv text' },
        {
          enabledNodeTypes: ['heading-2', 'heading-3', 'unordered-list', 'list-item', 'hyperlink'],
          message: 'Rubriker (H2, H3), stycken, punktlistor och länkar',
        },
      ],
    },
  ],
};

const text = (value, marks = []) => ({ nodeType: 'text', value, marks: marks.map((type) => ({ type })), data: {} });
const stycke = (...content) => ({ nodeType: 'paragraph', data: {}, content });
const rubrik = (level, ...content) => ({ nodeType: `heading-${level}`, data: {}, content });
const punktlista = (...items) => ({
  nodeType: 'unordered-list',
  data: {},
  content: items.map((itemContent) => ({
    nodeType: 'list-item',
    data: {},
    content: [stycke(...itemContent)],
  })),
});
const dokument = (...content) => ({ nodeType: 'document', data: {}, content });

// Tolkar inline-HTML (<em>, <strong>, vanlig text) till Contentful text-noder med marks.
const parseInline = (html) => {
  const nodes = [];
  const pattern = /<(em|strong)>([\s\S]*?)<\/\1>|([^<]+)/g;
  for (const match of html.matchAll(pattern)) {
    if (match[1] === 'em' && match[2]) {
      nodes.push(text(match[2], ['italic']));
    } else if (match[1] === 'strong' && match[2]) {
      nodes.push(text(match[2], ['bold']));
    } else if (match[3]) {
      nodes.push(text(match[3]));
    }
  }
  return nodes.length > 0 ? nodes : [text('')];
};

// Omvandlar body_html ur Postgres (<h2>, <h3>, <p>, <ul><li>...</li></ul>) till Contentful Rich Text.
export const htmlToRichText = (html) => {
  const blocks = [];
  const blockPattern = /<(h2|h3|p|ul)>([\s\S]*?)<\/\1>/g;
  for (const match of String(html ?? '').matchAll(blockPattern)) {
    const [, tag, inner] = match;
    if (tag === 'h2') blocks.push(rubrik(2, ...parseInline(inner.trim())));
    else if (tag === 'h3') blocks.push(rubrik(3, ...parseInline(inner.trim())));
    else if (tag === 'p') blocks.push(stycke(...parseInline(inner.trim())));
    else if (tag === 'ul') {
      const items = [...inner.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => parseInline(m[1].trim()));
      if (items.length > 0) blocks.push(punktlista(...items));
    }
  }
  return dokument(...blocks);
};

try {
  const { rows: guides } = await pool.query('select * from guides order by id');
  if (guides.length === 0) {
    console.error('Inga guider i Postgres. Kör npm run seed först.');
    process.exit(1);
  }

  const locales = await cma('GET', '/locales');
  const locale = locales.items.find((l) => l.default).code;
  console.log(`Space ${space}, miljö ${environment}, språk ${locale}`);
  console.log(`Hittade ${guides.length} guider i Postgres att migrera.`);

  // 1. Skapa eller uppdatera innehållstypen guide och aktivera den.
  const befintligTyp = await cma('GET', '/content_types/guide');
  const typ = await cma('PUT', '/content_types/guide', { body: guideType, version: befintligTyp?.sys.version });
  await cma('PUT', '/content_types/guide/published', { version: typ.sys.version });
  console.log(`✓ innehållstypen Guide (${guideType.fields.length} fält)`);

  // 2. Migrera alla 40 guiderna med fasta id:n (utpost-guide-1 .. utpost-guide-40).
  let publicerade = 0;
  let utkast = 0;
  for (const g of guides) {
    const entryId = `utpost-guide-${g.id}`;
    const rawFields = {
      guideId: Number(g.id),
      slug: g.slug,
      title: g.title,
      body: htmlToRichText(g.body_html),
    };
    const fields = Object.fromEntries(Object.entries(rawFields).map(([falt, varde]) => [falt, { [locale]: varde }]));
    const finns = await cma('GET', `/entries/${entryId}`);
    const post = await cma('PUT', `/entries/${entryId}`, {
      body: { fields },
      version: finns?.sys.version,
      contentType: 'guide',
    });

    if (g.published) {
      await cma('PUT', `/entries/${entryId}/published`, { version: post.sys.version });
      publicerade++;
    } else if (finns?.sys.publishedVersion) {
      await cma('DELETE', `/entries/${entryId}/published`, { version: post.sys.version });
      utkast++;
    } else {
      utkast++;
    }
    console.log(`✓ [${g.id}/${guides.length}] ${g.published ? 'publicerad' : 'utkast    '}  ${entryId} (${g.title})`);
  }

  console.log(`\nKlart! Migrerade ${guides.length} guider till Contentful (${publicerade} publicerade, ${utkast} utkast).`);
} finally {
  await pool.end();
}
