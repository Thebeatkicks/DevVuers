# Teststrategi för Utpost

Uppdaterad för M5, 23 oktober 2026.

## Inriktning och bakgrund

Vi testar beräkningar, användarbeteenden och API:ets data
och behörighet.

Utpost har en Vue-klient, en äldre React-klient och ett
Express-/GraphQL-API med Postgres och MongoDB.

Automatiserade tester fokuserar på Vue-klienten och API:et.
React-klienten är inte täckt av de testsviter som beskrivs här.

## Testnivåer

### Enhetstester

Vitest används för ren logik och konfiguration:

- Beräkningar för turer.
- Läsning av miljövariabler.
- Kravet på JWT_SECRET.

Konfigurationstesterna styr miljövariabler med `vi.stubEnv`
och laddar om konfigurationsmodulen mellan testfallen.

### Komponenttester

Vue Testing Library används för att kontrollera vad användaren
ser och kan göra:

- Visning av guider och turer.
- Sökning och tomma resultat.
- Länkar.
- Felmeddelanden.
- Hantering av saknade mätvärden.

Datahämtningen mockas så att testerna inte behöver ett riktigt API.

### API-integrationstester

Testerna i `api/src/graphql/server.test.js` använder
Vitest och `yoga.fetch()` mot riktiga databaser.

Kedjan är:

GraphQL-request → schema → resolver → DataLoader/databas → GraphQL-svar.

API:et behöver inte lyssna på någon port. Testerna anropar
Yoga-handlern direkt.

## Befintliga tester

| Fil | Innehåll | Antal |
|---|---|---:|
| client/src/lib/tours.test.ts | Beräkningar och saknade höjdvärden | 3 |
| client/src/views/GuidesView.test.ts | Guidelista, sökning, tomt resultat och API-fel | 4 |
| client/src/views/TourDetail.test.ts | Turdetaljer, saknade mätvärden och API-fel | 2 |
| client/src/views/ToursView.test.ts | Turuppgifter, nätverksfel och GraphQL-fel | 3 |
| api/src/config.test.js | Databasadresser och JWT-konfiguration | 4 |
| api/src/graphql/server.test.js | GraphQL mot riktiga databaser | 6 |
| **Totalt** | **6 testfiler** | **22** |

API-kommandot kör 10 tester: 6 integrationstester och
4 konfigurationstester. Endast de 6 integrationstesterna
räknas mot M5:s krav på minst fem API-integrationstester.

## Integrationstesternas ansvar

1. Turlistan returnerar 50 turer med användare och högst
   två databasfrågor.
2. En guide som saknas returnerar null utan GraphQL-fel.
3. Ett ogiltigt GraphQL-fält ger ett valideringsfel; testet
   kontrollerar också status 200 för den använda requestformen.
4. createTour utan token nekas med UNAUTHENTICATED.
5. createTour med token skapar turen med den inloggade användaren.
6. Tour.logs returnerar lika många punkter som Postgres innehåller,
   med två databasfrågor totalt för turen och Mongo-punkterna.

N+1-testet läser `extensions.databasfragor`. Det ska upptäcka
om `Tour.user` börjar göra en databasfråga per tur igen.

Testet för loggar kontrollerar antal och frågekostnad.
Det jämför inte varje enskilt mätvärde.

## Lokal körning

Kör från repots rot.

Installera beroenden och starta databaserna:

```bash
npm ci
docker compose up -d postgres mongo
```

API:ets `.env` behöver innehålla JWT_SECRET och rätt
databasinställningar. API-testkommandot läser filen från
api-workspacet.

På en tom utvecklingsdatabas:

```bash
npm run seed
```

Seedningen tömmer befintliga tabeller och återskapar testdata.
Kör den endast när befintlig lokal data får ersättas.

Migrera punkterna och kör API-testerna:

```bash
npm run migrate:logs
npm run test:api
```

Kör endast klienttesterna:

```bash
npm run test --workspace=client
```

Kör endast API-konfigurationstesterna:

```bash
npm run test --workspace=api -- src/config.test.js
```

Kör samtliga befintliga tester:

```bash
npm test
```

Samtliga tester kräver att databaserna är redo eftersom
API-integrationstester ingår.

## Testmiljö och data

Lokalt körs integrationstesterna mot de databaser som anges
av API:ets miljövariabler. Använd utvecklings-/testdata.

I CI startar jobbet Integration nya Postgres- och Mongo-services.
Seedning och migrering körs före testerna.

Testfilerna i API:et körs sekventiellt eftersom de delar databas.
Testtimeout är 10 sekunder.

Testet som skapar en tur raderar turen efter sina assertions.
Om testet avbryts före städningen kan testdata bli kvar och
behöva tas om hand före nästa körning.

## GraphQL och Vitest

`api/vitest.config.js` innehåller:

```js
ssr: {
  resolve: {
    conditions: ['module', 'node'],
  },
}
```

Konfigurationen undviker att testkoden och GraphQL Yoga laddar
olika varianter av GraphQL. Annars kan exempelvis ett avsett
UNAUTHENTICATED-fel maskeras som INTERNAL_SERVER_ERROR.

## Mockning av klientens datahämtning

Nuvarande klienttester använder mockad API-modul eller fetch.
ToursView-testet använder en riktig urql-klient med mockad fetch.

M5-komplettering återstår:

- Lägg till test för HomeView.
- Låt både HomeView- och ToursView-tester mocka `@urql/vue`
  enligt uppgiften.

Dessa kompletteringar räknas inte som färdiga tester i tabellen ovan.

## Bevis för regressioner

### N+1

TODO:

1. Kör N+1-testet med loadern och spara grönt resultat.
2. Koppla tillfälligt bort loadern för Tour.user.
3. Kör igen och spara faktisk felrad och antal databasfrågor.
4. Återställ loadern och visa att testet blir grönt.
5. Spara bevisen under Mätning före/efter (M5) i README.

### Schema och klienttyper

Codegen genererar klientens typer från schema och frågor.
Klientens typkontroll kör codegen före vue-tsc.

TODO: dokumentera att ett borttaget schemafält som används
av en vy stoppar `npm run typecheck`.

Beviset från PR #81, där ett fält togs bort ur klientfrågan
men fortfarande användes i vyn, är ett separat test av kedjan.

## Regler för ändringar och merge

- Alla fyra CI-jobb ska vara gröna:
  Kvalitet, Bygg, Integration och Image.
- Branchen ska vara uppdaterad mot main.
- Minst en annan teammedlem ska godkänna PR:en.
- En buggfix ska ha ett relevant regressionstest när det är möjligt.
- Testet ska misslyckas när den avsedda buggen finns.
- Ändrade beteenden ska ha relevant automatiserad verifiering
  eller en dokumenterad manuell kontroll.
- Testdata och miljövariabler ska vara tydliga och reproducerbara.

Vi använder meningsfulla beteendekontroller. Vi har inte satt
ett generellt procentkrav för kodtäckning i den beskrivna pipelinen.

## Kvarvarande testområden

| Område | Status |
|---|---|
| HomeView med mockad useQuery | Återstår för M5 |
| ToursView med mockad @urql/vue | Befintligt test behöver anpassas för M5 |
| api.ts: HTTP-metoder och felhantering | Planerat |
| Session-store: inloggning och utloggning | Planerat |
| LoginView: formulär och navigering | Planerat |
| REST-auth: giltig, saknad och ogiltig token | Planerat |
| REST-routes för turer och guider | Planerat |
| Hela användarflöden i browsern | Manuell verifiering tills vidare |

## Vad testerna inte bevisar

- Mockade klienttester bevisar inte att klienten fungerar
  tillsammans med ett riktigt API.
- API-testerna via yoga.fetch verifierar inte nginx eller
  nätverkstrafik mellan containrar.
- Antalskontrollen för migreringen bevisar inte ensam att
  varje fältvärde är identiskt.
- Tester av frågeantal är inte belastnings- eller responstidstester.
- Vi gör inga pixeljämförelser och testar inte bibliotekens interna kod.

## Alternativ och konsekvenser

Enbart manuella tester ger långsammare återkoppling och svagare
skydd mot återkommande fel.

Enbart tester genom browsern skulle täcka fler systemgränser,
men kräva mer miljöhantering och vara svårare att felsöka.

Vi kombinerar därför enhetstester, komponenttester och
API-integrationstester med manuella kontroller av hela flöden.

Det ger snabb återkoppling samtidigt som API-testerna upptäcker
fel som mockade klienttester inte kan se, exempelvis N+1 och
felaktiga databasfrågor.

Se [pipelinebeskrivningen](pipeline.md) och
[M5-bevisen i README](../README.md).