# Beslut: API-stil för [vyn ni valt] (REST vs GraphQL)

**Status:** Förslag
**Datum:** 2026-10-16
**Deltagare:** Henrik, Ella, Yasmin och Sheyma.

## Kontext
Vi har idag ett REST-API. Vi utvärderar att flytta vyn **ToursView.vue** till GraphQL
som en del av M4. Den här vyn valdes eftersom den just nu utför flest anrop. 

Utpost är en plattform för [..]. Vi mäter **[ToursView.vue]**, som idag gör fyra GraphQL-anrop och ett REST-anrop mot ett Express-API med Postgres. Tours ska migreras till MongoDB medan **[GuidesView.vue]** blir kvar i Postgres, därför använder vi guides som kontrollgrupp. Syftet är att jämföra REST och GraphQL på antal HTTP-anrop, total storlek, databasfrågor och oanvända fält. Mätningarna gjordes lokalt i Docker Compose med cache avstängd och upprepades tre gånger. Tabellen nedan mäter ett anrop per kolumn (/api/tours, /api/guides och motsvarande GraphQL-query), inte vyns alla anrop tillsammans.

[t.ex. den behöver data från flera
resurser: tour, guider och användare].

## Bakgrund (mätningar)

Mätt på vyn **ToursView.vue** och **GuidesView.vue** (kontroll), [2026-10-20], lokalt, cache avstängd.

| Mått | REST Guides | GraphQL Guides | REST Tours | GraphQL Tours |
|---|---|---|---|---|
| Antal HTTP-anrop | 1 | 1 | 1 | 1 |
| Totalt antal byte | 26.11 kb (26 106 bytes) | 5,1 kb (5 102 bytes) | 296kb (295 976 bytes) | 7 kb (7 022 bytes) |
| Databasfrågor (API-logg) | 1 | 1 | 185 | 135 |
| Oanvända fält i svaret | 45.5% | 0% | 80% | 0% |

GraphQL Guides är mätt för jämförelse, men GuidesView använder REST.

### Metod:
- Antal HTTP-anrop: ett `curl`-kommando per endpoint/query, alltså 1 per kolumn i tabellen.
- Storlek: `curl -s -o /dev/null -w "%{size_download}" <url>` (okomprimerat). GraphQL kördes som POST med vyns query.
- Databasfrågor: `pool.query` i `api/src/db/client.js` loggar varje fråga som `[db] postgres: ...`. Efter varje anrop räknades raderna med docker compose `logs api --since 5s --no-color | grep -c "\[db\] postgres"`, med 15 sekunders paus mellan mätningarna.
- Oanvända fält: fälten i första objektet (och ett exempel ur varje nästlad lista) jämfördes mot vad ToursView.vue och GuidesView.vue.

### Tolkning: 
Utav denna mätning är det tydligt att REST-anropet /api/tours returnerar 30 fält per tour varav 24 är oanvända. ToursView.vue använder 6 av dem. De övriga 24, alltså 80%, läses aldrig av vyn. 

Den största delen av den oanvända datan är logs, en lista med 26 objekt per tour som vyn aldrig läser. Mätt i bytes utgör logs ca 84.4% av svaret (249 860 av 295 976 byte). Dessutom skickas hela user-objektet, inklusive email och password_hash, fast vyn bara läser display_name.

Guides har färre oanvända fält än tours (45% mot 80%), men i bytes är over-fetchingen lika stor, ca 81 % mot 84 %. Mätt i bytes utgör body_html ca 64% av guides-svaret (16 669 av 26 106 byte), och de fem oanvända fälten tillsammans ca 81% (ca 21 064 byte). Det visar varför fältandelen ensam kan vilseleda. Det är egentligen datamängden som avgör hur mycket bandbredd som slösas.

I GraphQL ber queryn bara om de fält som visas, vilket ger 0% oanvända fält. Datamängden för tours minskar med cirka 98% (från 296 kB till 7 kB), och känsliga fält som `password_hash` och `email` skickas inte till klienten.

GraphQL löser däremot inte N+1. Tours-queryn gör fortfarande en fråga per tour för `users`, `photos` och `guides` (135 Postgres-frågor mot 185 i REST). Bara de 50 `tour_logs`-frågorna försvinner. DataLoader i backend skulle lösa N+1.

## Schemats omfattning (M4:s minimum)

Typer: `Guide`, `User`, `Photo`, `LogPoint`, `Tour`
Ingångar i `Query`: `guides`, `popularGuides(limit)`, `guide(slug)`, `regions`, `tours(limit)`, `tour(id)`
Mutation: `createTour(input)` (kräver inloggning)

### Frågor per ingång (testade med curl mot `/graphql`)

**1. Alla guider**

```graphql
query { guides { id slug title region difficulty lengthKm } }
```

Svar (början):

```json
{"data":{"guides":[{"id":"40","slug":"sodra-hallstigen-40","title":"Södra Hällstigen 40","region":"Skåne","difficulty":"medel","lengthKm":27}
```

**2. En guide via slug**

```graphql
query { guide(slug: "sodra-sjorundan-26") { id title region difficulty lengthKm bodyHtml } }
```

Svar (början):

```json
{"data":{"guide":{"id":"26","title":"Södra Sjörundan 26","region":"Härjedalen","difficulty":"lätt","lengthKm":5.7,"bodyHtml":"<h2>Om Södra Sjörundan 26</h2>
```

**3. Senaste turerna**

```graphql
query { tours(limit: 3) { id title distanceM user { displayName } guide { title } photos { id } } }
```

Svar (början):

```json
{"data":{"tours":[{"id":"107","title":"Tur 107","distanceM":6021,"user":{"displayName":"Ida Osman"},"guide":{"title":"Södra Sjörundan 26"},"photos":
```

**4. En tur via id**

```graphql
query { tour(id: "107") { id title distanceM startedAt guide { title } } }
```

Svar:

```json
{"data":{"tour":{"id":"107","title":"Tur 107","distanceM":6021,"startedAt":"2026-10-18T10:21:46.036Z","guide":{"title":"Södra Sjörundan 26"}}}}
```

### Vad som medvetet INTE finns i schemat

- `email` och `passwordHash` på `User`. Typen har bara `id` och `displayName`.
- `authorId` på `Guide`. Fältet finns i databasen men exponeras inte.
- `userId` och `guideId` på `Tour`. Relationerna nås via `user` och `guide`, inte via råa id:n.
- `userId` i `CreateTourInput`. Användaren sätts från `context` (JWT), aldrig från klienten.

Motivering: schemat speglar vad klienten behöver, inte hur tabellerna ser ut.

## Beslut
Vi väljer GraphQL för ToursView. Skälet är att svaren blir mycket mindre, att inga oanvända fält skickas och att känsliga fält som password_hash inte exponeras. En vy kan dessutom hämta tours, användare, guider och foton i ett anrop. Vi behåller både REST och GraphQL.

GuidesView behåller REST och används som kontrollgrupp. Vi behåller både REST och GraphQL: GraphQL där mätningarna visar störst nytta, REST där det räcker (inloggning, registrering och guides).

N+1 åtgärdas med DataLoader innan fler vyer byggs på GraphQL.

## Konsekvenser
- Positivt:
    - Mycket mindre svar: tours från 293 kB till 7 kB (ca 97 %)
    - Inga oanvända fält, och känsliga fält som password_hash och email exponeras inte.
    - En vy kan hämta tours, användare, guider och foton i ett anrop.
    - Schemat är ett tydligt, typat kontrakt, och createTour kräver inloggning via JWT.
- Negativt / risker:
    - N+1 kvarstår: 135 Postgres-frågor för tours (1 + 50 users + 50 photos + 34 guides).
    - SQL använder select *, så databasen läser alla kolumner trots att klienten bara ber om några. Fältvalet sparar nätverk, inte databasarbete.
    - HTTP-cachning är svårare med POST till /graphql än med GET på REST.
    - Resolvers måste skrivas om när tours flyttas till MongoDB.
    - Två API-stilar (REST och GraphQL) underhålls parallellt.
- Nästa steg:
    1. Införa DataLoader för user, guide och photos, och mäta om (förväntat ca 4 frågor).
    2. Välja kolumner i SQL utifrån begärda fält i stället för select *.
    3. Ta bort password_hash från REST-svaret och byta till bcrypt.
    4. Migrera tours till MongoDB och köra om mätningen. Guides-siffrorna ska vara oförändrade och fungera som kontroll.
    5. Efter migreringen till MongoDB: utvärdera om fler vyer ska flytta till GraphQL. Använd samma mätmetod.