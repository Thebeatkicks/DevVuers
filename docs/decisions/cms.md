# Beslutsdokument: Headless CMS (M9)

**Datum:** 2026-11-25  
**Status:** Beslutad (Team DevVuers)  
**Beslut:** Redaktionella notiser (`Notis`) och guidernas redaktionella brödtext (`Guide`) hanteras i Contentful. Strukturerad och relationell data om guiderna stannar i PostgreSQL. Innehållet levereras som strukturerade block (`Paragraph` och `TextRun`) via vårt GraphQL-API och renderas med `RichText.vue` utan `v-html`.

---

## 1. Vad är innehåll och vad är data?

| Fält | Var bor det? | Motivering |
|---|---|---|
| **Brödtext (`body`)** | **Contentful** (`RichText`) | Redaktionellt innehåll med rubriker, stycken, listor och betoningar som redaktörer skriver och uppdaterar. Genom att lagra det som Rich Text-träd i CMS:et i stället för `body_html` i Postgres slipper klienten `v-html` (åtgärdar skuld 10 och eliminerar XSS-ytan). |
| **Titel (`title`) & `slug` & `guideId`** | **Båda (Postgres + Contentful)** | I Contentful fungerar `title` som `displayField` så att redaktören ser vilken guide hen redigerar, och `guideId` (`1..40`) kopplar CMS-posten till databasraden. I Postgres behövs `title` och `slug` för snabba list- och sökfrågor (`/api/guides`, `popularGuides`). |
| **ID (`id`), Region (`region`), Svårighetsgrad (`difficulty`), Längd (`length_km`), Bild (`hero_image`), Författare (`author_id`)** | **PostgreSQL** | Strukturerad applikationsdata och relationer. `tours.guide_id` har en främmande nyckel (`FOREIGN KEY`) till `guides(id)` i Postgres, och klienten filtrerar, söker (`ILIKE`) och sorterar på region, svårighetsgrad och längd i databasen. |

---

## 2. Hur hittar API:et rätt post i CMS:et när seeden slumpar sluggarna?

I `api/src/db/seed.js` slumpas guidens namn och `slug` varje gång databasen seedas (t.ex. `norra-myrleden-7` vid en körning och `stora-bjornleden-7` vid nästa), och i Azure staging körs `SEED_ON_START=1` vid varje kallstart från noll replicas.

**Lösning:**
- Seeden kör `TRUNCATE ... RESTART IDENTITY` och skapar alltid exakt 40 guider med `id` **1 till 40** i ordning.
- Migreringsskriptet `scripts/cms-migrate-guides.mjs` ger varje guide i Contentful ett deterministiskt entry-ID `utpost-guide-<id>` (`utpost-guide-1` .. `utpost-guide-40`) samt heltalsfältet `guideId` (`1..40`).
- När `guideBody(guide)` i `api/src/cms/contentful.js` slår upp brödtexten för en guide som hämtats ur Postgres matchar den i första hand på `guideId === Number(guide.id)` (eller `entry.sys.id === "utpost-guide-" + guide.id`), och i andra hand på `slug`.
- Det gör att guide #1 i Postgres alltid hittar `utpost-guide-1` i Contentful, även efter en kallstart i staging där sluggen har slumpats om.

---

## 3. Vilka blocktyper behöver guiderna, och vad gör `toParagraphs` och `RichText.vue`?

I `body_html` från `seed.js` finns:
- Rubriker i två nivåer: `<h2>` (`heading-2`) och `<h3>` (`heading-3`)
- Vanliga stycken: `<p>` (`paragraph`)
- Punktlistor: `<ul><li>...</li></ul>` (`unordered-list` med `list-item`)
- Inline-markeringar: kursiv text `<em>` (`italic`) och fet text `<strong>` (`bold`) samt länkar (`hyperlink`)

**Vad `toParagraphs` och `RichText.vue` gjorde tidigare (för notiser):**
- `toParagraphs` filtrerade på `node.nodeType === 'paragraph'` och hoppade därför över alla `heading-2`, `heading-3` och `unordered-list`.
- `RichText.vue` renderade varje post i `paragraphs` som ett `<p>`-element.

**Vad vi byggde ut:**
- `toGuideBlocks(document)` i `api/src/cms/contentful.js` omvandlar `paragraph` → `{ kind: 'p', runs }`, `heading-2` → `{ kind: 'h2', runs }`, `heading-3` → `{ kind: 'h3', runs }` och `unordered-list` / `list-item` → `{ kind: 'li', runs }`.
- `Paragraph` i GraphQL-schemat fick det valfria fältet `kind: String` (bakåtkompatibelt med notiserna där `kind` utelämnas och tolkas som `'p'`).
- `RichText.vue` renderar `<h2>` och `<h3>` för rubriker, `<p>` för stycken och grupperar intilliggande `'li'`-block i en `<ul><li>...</li></ul>` – helt utan `v-html`.

---

## 4. Kvoter i Contentfuls gratisnivå och hantering av 429

Gratisnivån i Contentful tillåter **7 skrivningar per sekund** mot Content Management API (CMA) och **100 000 API-anrop i månaden** totalt.

**Hur många anrop gör `scripts/cms-migrate-guides.mjs`?**
1. `GET /locales`: **1 anrop**
2. Innehållstypen `guide` (`GET`, `PUT`, `PUT /published`): **3 anrop**
3. För var och en av de 40 guiderna:
   - `GET /entries/utpost-guide-<id>` (läsa nuvarande `sys.version`)
   - `PUT /entries/utpost-guide-<id>` (skapa/uppdatera)
   - `PUT /entries/utpost-guide-<id>/published` för de 35 publicerade guiderna (5 är opublicerade utkast och kräver inget publiceringsanrop om de inte var publicerade tidigare)
   - Totalt för guiderna: `40 × 2 + 35 = 115 anrop` (högst `40 × 3 = 120 anrop`).
4. **Summa per körning:** cirka **119–124 anrop** (knappt 0,12 % av månadstaket på 100 000).

**Hur skriptet håller sig under 7 skrivningar/sekund och hanterar 429:**
- Före varje CMA-anrop väntar `cma()` i **200 ms** (`await paus(200)`), vilket ger högst **5 anrop per sekund**.
- Om Contentful ändå svarar med HTTP `429 Too Many Requests` läser `cma()` headern `X-Contentful-RateLimit-Reset` (eller `Retry-After`, fallback 2 sekunder), väntar det antalet sekunder och försöker sedan anropet igen rekursivt.

---

## 5. Opublicerade guider i seeden (`published = false`)

I `api/src/db/seed.js` sätts `published` med uttrycket `i % 9 !== 0`. För `i = 0..39` innebär det att 5 guider (`id` 1, 10, 19, 28 och 37) har `published = false`, medan övriga 35 guider har `published = true`.

I `scripts/cms-migrate-guides.mjs` kontrolleras `g.published`:
- Är `g.published === true` anropas `PUT /entries/utpost-guide-<id>/published`, så posten blir **Published** i Contentful.
- Är `g.published === false` publiceras posten inte (och om den råkade vara publicerad sedan tidigare avpubliceras den med `DELETE /entries/utpost-guide-<id>/published`). De 5 opublicerade guiderna blir därmed **utkast (`Draft`)** i Contentful och returneras inte av Delivery API:et.

---

## 6. Kopplingen mellan Notis och Guide: `guideSlug` eller `Reference`?

Vi behåller `guideSlug` (`Symbol` med regex-validering `^[a-z0-9-]+$`) i `Notis` för nuvarande flöde, men i ett riktigt redaktionellt flöde när både notiser och guider bor i Contentful har ett **`Reference`-fält** tydliga fördelar:

- **Med `guideSlug` (nuvarande):** Enkelt för GraphQL-resolvern (`Guide.notices` filtrerar direkt på `notice.guideSlug === guide.slug` utan att behöva slå upp länkade entry-ID:n), och notiserna i `cms-setup.mjs` kan sättas upp oberoende av om guiderna har migrerats än. Nackdelen är att redaktören måste kopiera/skriva rätt slug manuellt och att kopplingen bryts om guidens slug ändras.
- **Med `Reference`:** Redaktören väljer guiden i en rullista i Contentful (omöjligt att stava fel på en slug), och kopplingen pekar på guidens oföränderliga `sys.id` (`utpost-guide-<id>`) även om titel eller slug byts.

---

## 7. Vad visar guidesidan när CMS:et är nere eller avstängt, och hur länge dröjer en publicering?

- **När CMS:et är avstängt (t.ex. i CI-pipelinen där `CONTENTFUL_SPACE_ID` och `CONTENTFUL_DELIVERY_TOKEN` är tomma):**
  `cmsConfigured()` returnerar `false` och `publishedGuides()` / `guideBody()` returnerar direkt en tom lista `[]` utan nätverksanrop. Guidesidan (`GuideDetailView.vue`) visar guidens titel, region, svårighetsgrad och längd från Postgres, medan brödtexten och notislistan är tomma utan fel.
- **När CMS:et är nere eller svarar med fel / timeout (5 sekunder):**
  `fetchGuides()` fångar felet, loggar en varning på servern och returnerar `guideCache.guides ?? []` – alltså det **senast cachade innehållet** om cachen har hunnit fyllas tidigare, eller en tom lista `[]` vid kall cache. Sidan kraschar aldrig.
- **Hur länge dröjer en publicering innan den syns?**
  - **Med webhooken (`/api/cms/webhook`):** **Direkt (0 sekunder).** När redaktören trycker *Publish* eller *Unpublish* i Contentful skickar Contentful en POST till `/api/cms/webhook` med headern `X-Utpost-Webhook-Secret`. Servern anropar `clearCmsCache()`, som tömmer både notis- och guidecachen så att nästa sidladdning hämtar det nya innehållet direkt.
  - **Utan webhook:** Högst **60 sekunder** (`CMS_CACHE_SECONDS=60`).
