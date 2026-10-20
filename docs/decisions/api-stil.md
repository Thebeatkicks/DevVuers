# Beslut: API-stil för [vyn ni valt] (REST vs GraphQL)

**Status:** Förslag
**Datum:** 2026-10-16
**Deltagare:** Henrik, Ella, Yasmin och Sheyma.

## Kontext
Vi har idag ett REST-API. Vi utvärderar att flytta vyn **[ToursView.vue]** till GraphQL
som en del av M4. Den här vyn valdes eftersom den just nu utför flest anrop. 

Utpost är en plattform för [..]. Vi mäter **[ToursView.vue]**, som idag gör fyra GraphQL-anrop och ett REST-anrop mot ett Express-API med Postgres. Tours ska migreras till MongoDB medan **[GuidesView.vue]** blir kvar i Postgres, därför använder vi guides som kontrollgrupp. Syftet är att jämföra REST och GraphQL på antal HTTP-anrop, total storlek, databasfrågor och oanvända fält. Mätningarna gjordes lokalt i Docker Compose med cache avstängd och upprepades tre gånger. Tabellen nedan mäter ett anrop per kolumn (/api/tours, /api/guides och motsvarande GraphQL-query), inte vyns alla anrop tillsammans.

[t.ex. den behöver data från flera
resurser: tour, guider och användare].

## Bakgrund (mätningar)

Mätt på vyn **[ToursView.vue]** och **[GuidesView.vue]**, [2026-10-16], lokalt, cache avstängd.

| Mått | REST Guides | GraphQL Guides | REST Tours | GraphQL Tours |
|---|---|---|---|---|
| Antal HTTP-anrop | 1 | 1 | 1 | 1 |
| Totalt antal byte | 26.11 kb (26 106 bytes) | 5,1 kb (5 102 bytes) | 294.4kb (293 438 bytes) | 7 kb (7 025 bytes) |
| Databasfrågor (API-logg) | 1 | 1 | 185 | 135 |
| Oanvända fält i svaret | 45.5% | 0% | 80% | 0% |

### Metod:
- Antal HTTP-anrop: ett `curl`-kommando per endpoint/query, alltså 1 per kolumn i tabellen.
- Storlek: `curl -s -o /dev/null -w "%{size_download}" <url>` (okomprimerat). GraphQL kördes som POST med vyns query.
- Databasfrågor: `pool.query` i `api/src/db/client.js` loggar varje fråga som `[db] postgres: ...`. Efter varje anrop räknades raderna med docker compose `logs api --since 5s --no-color | grep -c "\[db\] postgres"`, med 15 sekunders paus mellan mätningarna.
- Oanvända fält: fälten i första objektet (och ett exempel ur varje nästlad lista) jämfördes mot vad ToursView.vue och GuidesView.vue.

### Tolkning: 
Utav denna beräkning är det tydligt att REST-anropet /api/tours returnerar 30 fält per tour varav 24 är oanvända. ToursView.vue använder 6 av dem. De övriga 24, alltså 80 %, läses aldrig av vyn. 

Den största delen av den oanvända datan är logs, en lista med 26 objekt per tour som vyn aldrig läser. Mätt i bytes utgör logs ca 84 % av svaret (247 256 av 293 438 byte). Dessutom skickas hela user-objektet, inklusive email och password_hash, fast vyn bara läser display_name.

Guides har färre oanvända fält än tours (45 % mot 80 %), men i bytes är over-fetchingen lika stor, ca 81 % mot 84 %. Mätt i bytes utgör body_html ca 64 % av guides-svaret (16 669 av 26 106 byte), och de fem oanvända fälten tillsammans ca 81 % (ca 21 064 byte). Det visar varför fältandelen ensam kan vilseleda. Det är egentligen datamängden som avgör hur mycket bandbredd som slösas.

I GraphQL ber queryn bara om de fält som visas, vilket ger 0 % oanvända fält. Datamängden för tours minskar med cirka 98 % (från 293 kB till 7 kB), och känsliga fält som password_hash och email skickas inte till klienten. Däremot kvarstår N+1-problemet. Detta innebär att GraphQL effektiviserar nätverket och förhindrar att känsliga fält som password_hash läcker till klienten. Men det löser inte N+1 problemet. Där hade verktyget DataLoader hade behövts i backend.

## Schemats omfattning (M4:s minimum)

Typer: `Guide`, `User`, `Photo`, `LogPoint`, `Tour`
Ingångar i `Query`: `guides`, `popularGuides(limit)`, `guide(slug)`, `regions`, `tours(limit)`, `tour(id)`
Mutation: `createTour(input)` (kräver inloggning)

### Frågor per ingång (testade i GraphiQL)

```graphql
query { guides { id slug name } }

{"data":{"guides":[{"id":"40","slug":"sodra-hallstigen-40","title":"Södra Hällstigen 40","region":"Skåne","difficulty":"medel","lengthKm":27}...
```
```graphql
query { guide(slug: "...") { name bio user { name } tours { name } } }

{"data":{"guide":{"id":"26","title":"Södra Sjörundan 26","region":"Härjedalen","difficulty":"lätt","lengthKm":5.7,"bodyHtml":"<h2>Om Södra Sjörundan 26</h2>...
```
```graphql
query { tours(limit: 3) { id name price } }

{"data":{"tours":[{"id":"107","title":"Tur 107","distanceM":6021,"user":{"displayName":"Ida Osman"},"guide":{"title":"Södra Sjörundan 26"},"photos":...
```
```graphql
query { tour(id: "...") { name summary guides { name } } }

{"data":{"tour":{"id":"107","title":"Tur 107","distanceM":6021,"startedAt":"2026-10-18T10:21:46.036Z","guide":{"title":"Södra Sjörundan 26"}}}}
```
### Vad som medvetet INTE finns i schemat
- [t.ex. `passwordHash`, tokens och andra känsliga fält]
- [t.ex. `email` på andra användare]
- [t.ex. mutations, M4 är bara läsning]
- [t.ex. fält som ingen vy använder]

Motivering: schemat speglar vad klienten behöver, inte hur tabellerna ser ut.

## Beslut
[Fylls i efter mätningarna.]

## Konsekvenser
- Positivt: [...]
- Negativt / risker: [t.ex. N+1, behov av DataLoader, cachning]
- Nästa steg: [...]