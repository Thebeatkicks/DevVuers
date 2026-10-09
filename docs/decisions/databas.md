# Beslutsdokument: databasval

**Datum:** 2026-10-08
**Beslut:** UTKAST, ska beslutas av teamet. Förslag: turer och deras mätpunkter ligger i MongoDB som ett dokument per tur. Guider, användare och foton stannar i Postgres. Gränsen går där data växer med varje tur och alltid läses ihop med den (mätpunkterna), medan resten har egna relationer och ändras oberoende av turen.

## Bakgrund

Idag ligger en tur utspridd över flera tabeller i Postgres. `tour_logs` har en rad per mätpunkt och växer med ca 300 rader per tur. Ska en tur visas måste `/api/tours` slå ihop `tours` med `tour_logs` (och eventuellt `guides` och `photos`).

Mätningar: 

- Storlek på svaret från `/api/tours`: ~268,2kb (274635 bytes)
- Antal databasfrågor per anrop till `/api/tours`: 745 frågor 
  - 1 listfråga som hämtar alla 200 turer + 744 för relaterad info per tur
  - N+1-problem: fler turer ger fler frågor.
- Antal rader i `tour_logs`: 5802 rader
- Antal punkter i största turen: tour_id: 80, antal punkter: 39 st
- Antal turer totalt: 200 turer

Att hantera detta (dvs skuld nummer 13: bulk-hämtning i /api/tours) skulle betala av prestandaskulden som N+1-frågorna skapar.

## Dokumentmodellen för turer

Förslag: mätpunkterna **bäddas in** i turen. Användare och guide **refereras** med id. Fälten heter som i API-svaret. TODO: kontrollera mot `Tour` och `TourLog` i `shared/` att det är snake_case.

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

**Inbäddat eller refererat, och varför**

- `points` bäddas in. De läses alltid tillsammans med turen, tillhör bara en tur och har en naturlig övre gräns per tur.
- `user_id` och `guide_id` refereras. Ett användarnamn eller en guidetitel kan ändras, och då ska det inte finnas gamla kopior i varje tur. `guides.body_html` är dessutom stor och hör inte hemma i ett turdokument.
- `point_count`, `duration_s`, `max_elevation_m` och `avg_heart_rate` förberäknas när turen skrivs. Då kan listan visa dem utan att läsa punkterna.

**Storlek och gräns**

Ett JSON-objekt per punkt blir grovt 100 till 130 byte, alltså ca 30 till 40 kB för 300 punkter (uppskattning, mät för att bekräfta). Gränsen är 16 MB per dokument, vilket motsvarar över 100 000 punkter. TODO: skriv in största turens verkliga antal punkter och marginalen mot gränsen.

**Index som klienten behöver**

- `{ user_id: 1, started_at: -1 }` för "mina turer, senaste först"
- `{ guide_id: 1 }` om turer ska kunna listas per guide
- `{ id: 1 }` unikt, så att `/api/tours/:id` fortsätter fungera under migreringen

TODO: stäm av med vilka frågor `ToursView.vue` och `TourDetail.vue` faktiskt ställer.

**Öppen fråga till mötet:** listan `/api/tours` behöver inte punkterna. Antingen utesluts `points` med projektion i Mongo-frågan, eller så läggs punkterna i en egen collection. Projektion är enklast, och de förberäknade fälten gör att listan klarar sig utan punkterna.

## Vad som stannar i Postgres

| Tabell | Val | Motivering |
|---|---|---|
| `users` | Stannar | Inloggning, unik e-post, lösenordshash. Transaktioner och unikhet passar en relationsdatabas |
| `guides` | Stannar | Redaktionellt innehåll med `body_html`, sökning och egen livscykel. Ändras oberoende av turer |
| `photos` | Stannar | Bara metadata, relation till tur via `tour_id`. TODO: diskutera om de borde följa med turen |
| `tours` och `tour_logs` | Flyttar till MongoDB | Se dokumentmodellen ovan |

## Så här ska migreringen gå till (genomförs i M5)

TODO: teamet bekräftar stegen. Förslag:

1. Ett skript läser alla turer och deras `tour_logs` ur Postgres, bygger ett dokument per tur (med de förberäknade fälten) och skriver till Mongo.
2. `/api/tours` byter källa från Postgres till Mongo. Svaret ska ha exakt samma form som idag, så att klienten inte märker något.
3. Verifiering: antal turer och antal punkter ska stämma mellan databaserna, plus stickprov där några turer jämförs punkt för punkt.
4. `tour_logs`-tabellen behålls tills verifieringen är godkänd. TODO: bestäm om den sedan tas bort eller arkiveras.

## Alternativ vi jämförde

**1. Allt kvar i Postgres, loggarna i en `jsonb`-kolumn**
- För: en databas, inga nya beroenden, transaktioner kvar
- Emot: TODO, till exempel sämre ergonomi för att fråga inuti punkterna, och inget lärande om dokumentmodellering

**2. Allt till MongoDB**
- För: en databas
- Emot: användare, inloggning och guider passar sämre i dokumentform, och mer att migrera

**3. MongoDB för turer och loggar, Postgres för resten (förslaget)**
- För: flyttar bara det som växer och alltid läses ihop
- Emot: två databaser att drifta och hålla konsekventa

TODO: lägg till argument som teamet kommer fram till på mötet.

## Konsekvenser

- **Två databaser** att drifta och backa upp.
- **Två anslutningssträngar** i miljön: `DATABASE_URL` och `MONGO_URL`.
- **Compose:** en `mongo`-tjänst i `docker-compose.dev.yml`.
- **Pipelinen:** TODO, till exempel Mongo som tjänst i CI-jobbet om tester ska köra mot den.
- **Molnet (M6):** TODO, en hanterad Mongo-tjänst eller en egen container.
- **Konsistens:** `user_id` och `guide_id` i Mongo pekar på rader i Postgres, och ingen databas kontrollerar att de finns. Det ansvaret ligger i API:et.

**Skrivet av:** TODO (namn, den som signerar ska kunna försvara det)