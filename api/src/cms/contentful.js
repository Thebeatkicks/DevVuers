import { config } from '../config.js';

// M9 (skuld 10): redaktionens innehåll bor i ett headless CMS – här Contentful. Den här filen är
// det ENDA stället i Utpost som vet det. Resolvers frågar efter notiser och guidernas brödtext
// och får dem i schemats form; byter ni CMS är det den här filen som skrivs om, inte schemat
// och inte klienten.
//
// Contentful har två läs-API:er med samma adresser men olika värd och olika nyckel:
//   cdn.contentful.com      + delivery-token  → bara det som är PUBLICERAT
//   preview.contentful.com  + preview-token   → senaste versionen av allt, även UTKAST
// Två tillstånd, två nycklar. Båda nycklarna stannar här på servern (.env) – klienten ser dem aldrig.
const HOSTS = { published: 'https://cdn.contentful.com', preview: 'https://preview.contentful.com' };

// Utan space och nyckel är CMS:et avstängt: appen fungerar, den har bara inga notiser eller CMS-texter.
// Så kör pipelinen (inga CMS-hemligheter i testerna) och den som inte har satt upp ett space än.
export const cmsConfigured = () => Boolean(config.cmsSpaceId && config.cmsDeliveryToken);

const entries = async (contentType, { preview = false } = {}) => {
  const host = preview ? HOSTS.preview : HOSTS.published;
  const token = preview ? config.cmsPreviewToken : config.cmsDeliveryToken;
  const url =
    `${host}/spaces/${config.cmsSpaceId}/environments/${config.cmsEnvironment}/entries` +
    `?content_type=${contentType}&order=-sys.updatedAt&limit=100`;
  // Nyckeln går i en header, inte i adressen – adresser hamnar i loggar.
  // Fem sekunder räcker: hellre en startsida utan notiser än en startsida som hänger.
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`Contentful svarade ${res.status}`);
  return (await res.json()).items;
};

// En länk som redaktören skrivit in ska gå till en webbadress eller en sida hos oss. Allt annat
// (javascript:, data:) blir ingen länk alls – href är också ett ställe där skript kan smita in (M8, A05).
const safeHref = (uri) => (typeof uri === 'string' && /^(https?:\/\/|\/)/.test(uri) ? uri : null);

const extractRuns = (nodes, href = null) => {
  const has = (node, mark) => (node.marks ?? []).some((m) => m.type === mark);
  return (nodes ?? []).flatMap((node) => {
    if (node.nodeType === 'text') {
      return node.value ? [{ text: node.value, bold: has(node, 'bold'), italic: has(node, 'italic'), href }] : [];
    }
    if (node.nodeType === 'hyperlink') return extractRuns(node.content, safeHref(node.data?.uri));
    if (node.nodeType === 'paragraph' || node.nodeType === 'list-item') return extractRuns(node.content, href);
    return [];
  });
};

// Rich text i Contentful är inte HTML utan ett träd av noder. För notiser används enbart stycken:
// stycken av textbitar med märken (fet, kursiv) och länkar.
export const toParagraphs = (document) =>
  (document?.content ?? [])
    .filter((node) => node.nodeType === 'paragraph')
    .map((node) => ({ runs: extractRuns(node.content) }))
    .filter((paragraph) => paragraph.runs.length > 0);

// Guiderna har även rubriker (heading-2, heading-3) och punktlistor (unordered-list med list-item)
// utöver stycken (paragraph). Varje block får en kind ('p', 'h2', 'h3', 'li') och sina textbitar (runs).
export const toGuideBlocks = (document) =>
  (document?.content ?? []).flatMap((node) => {
    if (node.nodeType === 'paragraph') {
      const runs = extractRuns(node.content);
      return runs.length > 0 ? [{ kind: 'p', runs }] : [];
    }
    if (node.nodeType === 'heading-2') {
      const runs = extractRuns(node.content);
      return runs.length > 0 ? [{ kind: 'h2', runs }] : [];
    }
    if (node.nodeType === 'heading-3') {
      const runs = extractRuns(node.content);
      return runs.length > 0 ? [{ kind: 'h3', runs }] : [];
    }
    if (node.nodeType === 'unordered-list') {
      return (node.content ?? [])
        .filter((item) => item.nodeType === 'list-item')
        .map((item) => ({ kind: 'li', runs: extractRuns(item.content) }))
        .filter((block) => block.runs.length > 0);
    }
    return [];
  });

// Contentfuls post → schemats Notice. Fälten heter som redaktionen kallar dem (rubrik, niva);
// schemat håller sig till engelska som resten av API:et. Ett utkast kan sakna fält – därav ??.
const toNotice = (entry, status = 'published') => ({
  id: entry.sys.id,
  title: entry.fields?.rubrik ?? '',
  level: entry.fields?.niva ?? 'info',
  body: toParagraphs(entry.fields?.text),
  guideSlug: entry.fields?.guideSlug ?? null,
  status,
});

const toCmsGuide = (entry) => ({
  id: entry.sys.id,
  guideId: entry.fields?.guideId ?? null,
  slug: entry.fields?.slug ?? null,
  title: entry.fields?.title ?? null,
  body: toGuideBlocks(entry.fields?.body),
});

// Cachen: Contentful räknar varje anrop (gratisnivån har ett tak per månad), och en notis eller
// guide ändras några gånger i veckan – inte 50 gånger i sekunden. Därför hämtar vi högst en gång
// i minuten och svarar ur minnet däremellan. Webhooken (/api/cms/webhook) tömmer båda cacherna.
let cache = { at: 0, notices: null };
let pending = null;
let guideCache = { at: 0, guides: null };
let pendingGuides = null;

export const clearCmsCache = () => {
  cache = { at: 0, notices: null };
  guideCache = { at: 0, guides: null };
};

const fetchNotices = async () => {
  try {
    const notices = (await entries('notis')).map((entry) => toNotice(entry));
    console.log(`cms: hämtade ${notices.length} publicerade notiser från Contentful`);
    cache = { at: Date.now(), notices };
    return notices;
  } catch (err) {
    // CMS:et är ett system till som kan vara nere. Då svarar vi med det vi senast hämtade,
    // eller utan notiser – men resten av sidan ska fortfarande gå att läsa.
    console.error(`cms: kunde inte hämta notiser (${err.message}) – svarar med ${cache.notices ? 'det senast hämtade' : 'en tom lista'}`);
    return cache.notices ?? [];
  }
};

export const publishedNotices = async () => {
  if (!cmsConfigured()) return [];
  if (cache.notices && Date.now() - cache.at < config.cmsCacheSeconds * 1000) return cache.notices;
  // En lista med 40 guider frågar efter notiser 40 gånger på samma gång (Guide.notices). Med kall
  // cache ska det bli ETT anrop till Contentful, inte 40: alla som frågar medan anropet pågår
  // väntar på samma svar.
  pending ??= fetchNotices().finally(() => {
    pending = null;
  });
  return pending;
};

const fetchGuides = async () => {
  try {
    const guides = (await entries('guide')).map((entry) => toCmsGuide(entry));
    console.log(`cms: hämtade ${guides.length} publicerade guider från Contentful`);
    guideCache = { at: Date.now(), guides };
    return guides;
  } catch (err) {
    console.error(`cms: kunde inte hämta guider (${err.message}) – svarar med ${guideCache.guides ? 'det senast hämtade' : 'en tom lista'}`);
    return guideCache.guides ?? [];
  }
};

export const publishedGuides = async () => {
  if (!cmsConfigured()) return [];
  if (guideCache.guides && Date.now() - guideCache.at < config.cmsCacheSeconds * 1000) return guideCache.guides;
  pendingGuides ??= fetchGuides().finally(() => {
    pendingGuides = null;
  });
  return pendingGuides;
};

// Slår upp en guide i CMS:et utifrån Postgres-raden. Matchar först på guideId / utpost-guide-<id>
// (som är stabilt även när staging kallstartar och seeden slumpar nya sluggar) och annars på slug.
export const guideBody = async (guide) => {
  const all = await publishedGuides();
  const numId = Number(guide.id);
  const match =
    all.find((g) => g.guideId === numId || g.id === `utpost-guide-${guide.id}`) ??
    all.find((g) => g.slug && g.slug === guide.slug);
  return match?.body ?? [];
};

// Förhandsgranskningen: preview-API:et ger senaste versionen av allt. Vi hämtar det publicerade
// också, för att kunna säga vad som skiljer: finns posten inte publicerad är den ett utkast (draft),
// finns den men med annat innehåll är den ändrad men inte publicerad (changed). Cachas aldrig –
// redaktören vill se det hen just skrev.
export const previewNotices = async () => {
  const [latest, published] = await Promise.all([entries('notis', { preview: true }), entries('notis')]);
  const publishedFields = new Map(published.map((entry) => [entry.sys.id, JSON.stringify(entry.fields)]));
  return latest.map((entry) => {
    const live = publishedFields.get(entry.sys.id);
    const status = live === undefined ? 'draft' : live === JSON.stringify(entry.fields) ? 'published' : 'changed';
    return toNotice(entry, status);
  });
};
