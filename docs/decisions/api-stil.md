# Beslut: API-stil för [vyn ni valt] (REST vs GraphQL)

**Status:** Förslag
**Datum:** 2026-10-16
**Deltagare:** Henrik, Ella, Yasmin och Sheyma.

## Kontext
Vi har idag ett REST-API. Vi utvärderar att flytta vyn **[ToursView.vue]** till GraphQL
som en del av M4. Den här vyn valdes eftersom den just nu utför flest anrop. 

Utpost är en plattform för [..]. Vi mäter **[ToursView.vue]**, som idag gör fyra GraphQL-anrop och ett REST-anrop mot ett Express-API med Postgres. Tours ska migreras till MongoDB medan **[GuidesView.vue]** blir kvar i Postgres, därför använder vi guides som kontrollgrupp. Syftet är att jämföra REST och GraphQL på antal HTTP-anrop, total storlek, databasfrågor och oanvända fält. Mätningarna gjordes lokalt i Docker Compose med cache avstängd och upprepades tre gånger.

[t.ex. den behöver data från flera
resurser: tour, guider och användare].

## Bakgrund (mätningar)

Mätt på vyn **[ToursView.vue]**, [2026-10-16], lokalt, cache avstängd.

| Mått | REST | GraphQL |
|---|---|---|
| Antal HTTP-anrop | 1 | 4 |
| Totalt antal byte | 294.4kb | 30.12 kb |
| Databasfrågor (API-logg) | | |
| Oanvända fält i svaret | | |

Så här mätte vi:
- REST: [nätverksfliken / `curl -s <url> | wc -c` per endpoint, summerat]
- GraphQL: [en fråga, `curl ... | wc -c`]
- Databasfrågor: [hur loggningen slogs på, hur raderna räknades]

Tolkning: [2-3 meningar, t.ex. om GraphQL gav färre anrop men fler
databasfrågor på grund av N+1]

## Schemats omfattning (M4:s minimum)

Typer: `User`, `Guide`, `Tour`
Ingångar i `Query`: `guides`, `guide(slug)`, `tours(limit)`, `tour(id)`

### Frågor per ingång (testade i GraphiQL)

```graphql
query { guides { id slug name } }
```
```graphql
query { guide(slug: "...") { name bio user { name } tours { name } } }
```
```graphql
query { tours(limit: 3) { id name price } }
```
```graphql
query { tour(id: "...") { name summary guides { name } } }
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