# Beslutsdokument: databasval

**Datum dokumentet skrevs:** 2026-10-08
**Datum beslutet togs:** 2026-10-13
**Status:** Beslutad (Team DevVuers)  
**Beslut:** Turer och deras mätpunkter (`points`) flyttas till MongoDB som ett inbäddat dokument per tur. Guider, användare och foton stannar kvar i PostgreSQL.

## Bakgrund

Idag ligger en tur utspridd över flera tabeller i Postgres. `tour_logs` har en rad per mätpunkt och växer med ca 300 rader per tur. Ska en tur visas måste `/api/tours` slå ihop `tours` med `tour_logs` (och eventuellt `guides` och `photos`).

### Mätningar: 

- **Svarsstorlek `/api/tours`:** ~268,2 kB (274 635 bytes) för 200 turer.
- **Antal databasfrågor:** 745 frågor per anrop till `/api/tours`.
  - *Analys:* 1 listfråga som hämtar alla 200 turer + 744 frågor för relaterad info. Det uppstår ett tydligt N+1-problem där antalet frågor skalar linjärt med antalet turer.
- **Data volym `tour_logs`:** 5 802 rader totalt.
- **Största turen:** `tour_id: 80` med totalt **39 punkter**.
- **Antalet totala turer**: 200 turer

Genom att åtgärda detta (skuld nummer 13: bulk-hämtning i /api/tours) skulle betala av prestandaskulden som N+1-frågorna skapar.

## Förslag på JSON modell för turer

Mätpunkterna (`points`) **bäddas in** i turdokumentet. Hela turen och alla dess mätpunkter hämtas i **1 enda anrop**.
Användare och guide **refereras** med id. Fälten heter som i API-svaret. 

```json
{
  "_id": "ObjectId",
  "id": 12,
  "user_id": 4,
  "guide_id": 2,
  "title": "Kullaleden etapp 3",
  "started_at": "2026-09-14T08:15:00Z",
  "distance_m": 14200,
  "notes": "Blåsigt vid kusten",

  "points": [
    {
      "recorded_at": "2026-09-14T08:15:00Z",
      "lat": 56.2981,
      "lon": 12.4412,
      "elevation_m": 34,
      "heart_rate": 112,
      "note": null
    }
  ],

  "point_count": 300,
  "duration_s": 5400,
  "max_elevation_m": 112,
  "avg_heart_rate": 134
}
```

### Inbäddat vs refererat

- **`points` bäddas in:** Mätpunkterna läses alltid tillsammans med turen, tillhör exklusivt en tur och har en naturlig övre gräns per tur.
- **`user_id` och `guide_id` refereras:** Användaruppgifter och guider har egna livscykler. Om en guide eller användare uppdateras ska detta inte kräva uppdateringar i tusentals turdokument. `guides.body_html` är dessutom stor och hör inte hemma i turdokumentet.
- **Förberäknade fält (`point_count`, `duration_s`, `max_elevation_m`, `avg_heart_rate`):** Beräknas när turen sparas. Detta gör att listan `/api/tours` snabbt kan visa sammanfattande statistik utan att behöva läsa in arrayen med punkter.

### Storleksanalys och Dokumentgränser

Ett JSON-objekt per mätpunkt väger ca 100–130 byte. 
* För vår största tur (**39 punkter**) innebär det en punktvolym på ca **3,9 till 5,1 kB**.
* MongoDB har en dokumentgräns på **16 MB** (vilket rymmer över 100 000 punkter).
* Vår största tur nyttjar knappt **0,03 %** av maxgränsen. Marginalen är god och bekräftar att inbäddning i samma dokument är en optimal arkitektur.

**Index som klienten behöver**

- `{ user_id: 1, started_at: -1 }` för "mina turer, senaste först"
- `{ guide_id: 1 }` om turer ska kunna listas per guide
- `{ id: 1 }` unikt, så att `/api/tours/:id` fortsätter fungera under migreringen

- ToursView.vue (GET /api/tours)
  - **MongoDB:** Hämtar alla turer utan mätpunkter (via projektion { points: 0 }).
  - **Datainnehåll:** Översiktsdata och förberäknad statistik (point_count, duration_s, distans, m.m.) för att visa listan snabbt.

- TourDetail.vue (GET /api/tours/:id)
  - **MongoDB:** Hämtar hela turen tillsammans med alla dess mätpunkter (points).
  - **PostgreSQL:** Hämtar tillhörande foton (photos).
  - **Datainnehåll:** Komplett data för en enskild tur för att rita ut kartlinjen och visa bilder.

## Vad som stannar i Postgres

| Tabell |  Databas | Val | Motivering |
|---|---|---|---|
| `users` | PostgreSQL | Stannar | Hanterar inloggning, unik e-post och lösenordshash. Kräver ACID-transaktioner och strikt unikhet. |
| `guides` | PostgreSQL | Stannar | Redaktionellt innehåll med `body_html`, sökning och egen livscykel. Ändras oberoende av turer. |
| `photos` | PostgreSQL | Stannar | Innehåller metadata och bildreferenser kopplade till `tour_id`. Ligger kvar i Postgres för oberoende hantering. |
| `tours` och `tour_logs` | MongoDB | Flyttar till MongoDB | Flyttas till MongoDB och slås ihop till en kollektion (`tours`) med inbäddade punkter. |

## Så här ska migreringen gå till (genomförs i M5)

1. **Migreringsskript:** Ett Node.js-skript läser alla turer och tillhörande `tour_logs` ur PostgreSQL, beräknar aggregerade fält (`point_count`, etc.), bygger MongoDB-dokument och skriver dem till MongoDB.
2. **API-omkoppling:** `/api/tours` ändras till att läsa från MongoDB. API-kontraktet (JSON-responsen) behålls identiskt så att frontend fungerar utan ändringar.
3. **Datavalidering:** Antal turer och punkter verifieras automatiskt mellan databaserna, följt av stickprovskontroll av koordinater och statistik.
4. **Avveckling:** Tabellen `tour_logs` i PostgreSQL behålls i läsläge under verifieringsfasen, för att därefter arkiveras/tas bort när M5 godkänts.

## Alternativ vi jämförde

1. **Allt kvar i PostgreSQL med `jsonb`:**
   * *För:* Enskild databas, bevarade transaktioner.
   * *Emot:* Kräver komplex SQL-omskrivning/`json_agg` för att lösa N+1, sämre fråga-ergonomi för inbäddade punkter, samt uppfyller inte kursmålet om dokumentmodellering.
2. **Allt flyttas till MongoDB:**
   * *För:* Enskild databas.
   * *Emot:* Relationell data som inloggning/användare och guider passar sämre i dokumentform och skapar onödigt migreringsarbete.
3. **Hybridmodell (MongoDB för turer/loggar, PostgreSQL för resten) – Vald Lösning:**
   * *För:* Optimerar prestanda där behovet är som störst (eliminerar N+1) samtidigt som relationell data stannar i rätt databastyp.
   * *Emot:* Kräver drift och hantering av två databaser.

### Slutsats

Vi valde att gå vidare med hybridmodellen. Trots att lösningen medför högre arkitektonisk komplexitet och kräver mer underhåll av två separata databaser, väger fördelarna tyngre än nackdelarna. 

Lösningen eliminerar vårt prestandaproblem (N+1-frågor) och ger en datamodell som passar inbäddad tur- och kartdata naturligt. Utöver de tekniska vinsterna ger detta stor pedagogisk nytta för vår läroprocess kring *polyglot persistence* (att använda flera databasteknologier i samma system) — ett mönster som återspeglar hur större företag bygger moderna och skalbara applikationer i industrin.

## Konsekvenser

- **Drift:** Två databashanterare körs parallellt.
- **Miljövariabler:** Två anslutningar krävs: DATABASE_URL (PostgreSQL) och MONGO_URL (MongoDB).
- **Docker Compose:** En mongo:8.2-tjänst inkluderas i `compose.yml`.
- **CI/CD Pipeline:** En MongoDB-tjänst läggs till i GitHub Actions workflow så att integrationstester körs automatiskt mot en ren Mongo-instans.
- **Molndrift (M6):** MongoDB Atlas eller en hanterad MongoDB-container konfigureras i molnmiljön via MONGO_URL.
- **Datakonsistens:** `user_id` och `guide_id` i MongoDB pekar på ID:n i PostgreSQL. Referensintegritet valideras på applikationsnivå i API-skiktet.

## Signaturer / Godkännande

Beslutat och signerat av Team DevVuers:
Sheyma – Utvecklare / Teammedlem
Yasmin – Utvecklare / Teammedlem
Team DevVuers – M3 Inlämning