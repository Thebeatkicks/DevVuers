# Utpost

Plattform för friluftsdestinationer med redaktionella guider,
användarnas turer, mätpunkter och bilder.

## Struktur

- `api/` – Express, GraphQL Yoga, Postgres och MongoDB.
- `client/` – Vue 3, Vue Router och urql.
- `web/` – den äldre React-klienten.
- `shared/` – gemensamma TypeScript-typer för REST-kontraktet.
- `docs/` – beslut, teststrategi och pipelinebeskrivning.

GraphQL-klientens typer och dokument genereras från API-schemat
och klientens frågor till `client/src/gql/`.

## Krav

- Node.js `^22.18.0 || >=24.12.0`.
- Docker Desktop.
- En lokal `api/.env` med `JWT_SECRET` och databasinställningar.

Kopiera `api/.env.example` till `api/.env` om filen inte redan finns.
I PowerShell:

```powershell
Copy-Item api/.env.example api/.env
```

Fyll i miljövariablerna innan API:et startas. `.env` är ignorerad
av Git och ska inte committas.

API-skripten läser `.env` automatiskt. Redan satta miljövariabler
har företräde.

## Lokal utveckling

Kör kommandona från repots rot.

### Databaser i Docker, applikationen lokalt

```bash
npm ci
docker compose up -d postgres mongo
```

Vänta tills databaserna är redo. På en tom utvecklingsdatabas:

```bash
npm run seed
npm run migrate:logs
npm run dev
```

`seed` tömmer och återskapar testdata i Postgres. Kör det inte om
du vill behålla befintlig lokal data. Efter en ny seedning behöver
`migrate:logs` köras igen.

Vid senare starter, när databaserna redan innehåller rätt data:

```bash
docker compose up -d postgres mongo
npm run dev
```

| Tjänst | Adress vid lokal Node-körning |
|---|---|
| Vue-klient | http://localhost:3001 |
| Äldre React-klient | http://localhost:3000 |
| API | http://localhost:4000 |
| GraphiQL | http://localhost:4000/graphql |

### Klient, API och databaser i Docker

```bash
docker compose up --build -d
```

På en tom utvecklingsdatabas:

```bash
docker compose exec api npm run seed
docker compose exec api npm run migrate:logs
```

Öppna klienten på http://localhost:3001.

Nginx skickar `/api` och `/graphql` vidare till API-containern.
API-porten 4000 publiceras inte separat i den nuvarande Compose-filen.
React-klienten ingår inte i denna Compose-konfiguration.

### Databasadresser

| Körmiljö | Postgres | MongoDB |
|---|---|---|
| Node lokalt, databaser i Docker | `localhost:5433` | `localhost:27017` |
| API inne i Compose | `postgres:5432` | `mongo:27017` |
| GitHub Actions Integration | `localhost:5432` | `localhost:27017` |

Mongo-anslutningen använder `authSource=admin` för autentisering
med Compose-miljöns root-användare.

Databaserna har namngivna volymer. `docker compose down` behåller
datan; `docker compose down -v` tar bort volymerna.

## Kommandon

| Kommando | Vad det gör |
|---|---|
| `npm run dev` | Startar API, React-klient och Vue-klient lokalt |
| `npm run dev:api` | Startar API:et med automatisk omstart |
| `npm run dev:client` | Startar Vue-klienten |
| `npm run seed` | Återskapar testdata i Postgres |
| `npm run migrate:logs` | Migrerar turdokument och mätpunkter till MongoDB och verifierar antal |
| `npm run lint` | Lintar Vue-klienten |
| `npm run format:check` | Kontrollerar formatering i Vue-klienten |
| `npm run format` | Formaterar Vue-klientens källkod |
| `npm run test --workspace=client` | Kör klienttesterna |
| `npm run test:api` | Kör API-konfigurations- och integrationstester |
| `npm test` | Kör både klient- och API-tester; API-testerna kräver databaser |
| `npm run codegen` | Genererar GraphQL-typer och dokument för klienten |
| `npm run typecheck` | Typkontrollerar shared, API och klient; klientsteget kör codegen före vue-tsc |
| `npm run build` | Bygger React- och Vue-klienterna |

Roten har inget `npm start`-kommando. API:et har ett eget
startkommando som används i dess workspace/container.

Det äldre `mongo:smoke`-skriptet från M3 skriver dokument med
`logs` och `t`. M5 använder `points` och `recorded_at`.
Använd därför `migrate:logs` för M5-datan. Om smoke-skriptet har
körts behöver migreringen köras igen innan M5-testerna.

## Datamodell och GraphQL

Guider, användare, foton och den befintliga turinformationen
finns i Postgres. Migreringen skapar ett Mongo-dokument per tur
med inbäddade `points` och förberäknad statistik.

`Tour.logs` läser punkterna från MongoDB via DataLoader.
Övriga berörda relationer batchas mot Postgres.

Loaders skapas per GraphQL-anrop. Antalet databasfrågor visas
i svarets `extensions.databasfragor`.

Postgres-tabellen `tour_logs` finns kvar för befintliga
REST-flöden och verifiering.

Se [databasbeslutet](docs/decisions/databas.md).

## Tester och pipeline

Pipelinen har fyra jobb:

- **Kvalitet:** lint, formatering, klienttester,
  API-konfigurationstester och typkontroll.
- **Bygg:** bygger applikationen och sparar `client/dist`.
- **Integration:** kör API-tester mot Postgres och MongoDB.
- **Image:** bygger containerbilder och publicerar dem på main.

Se [pipelinebeskrivningen](docs/pipeline.md) och
[teststrategin](docs/testing.md).

## Mätningar M4

Storlekarna kommer från kolumnen Disk usage i `docker image ls`.

| Image | Före | Efter | Kommentar |
|---|---:|---:|---|
| Client | 567 MB | 73,8 MB | Node och byggberoenden ersatta av nginx och byggd dist |
| API | 287 MB | 287 MB | En stage; oförändrad i denna mätning |
| `nginx:1.27-alpine` | – | 74,5 MB | Referens för basimagen |

`docker history utpost-client` visade tillägg på cirka 168 kB
för `dist/` och 20,5 kB för `nginx.conf`. Den slutliga
klientimagen innehåller inga lager med Node eller node_modules.

## Mätning före/efter (M5)

### DataLoader

Följande fråga används för den dokumenterade mätningen med tre turer:

```graphql
query TurerM5 {
  tours {
    id
    title
    distanceM
    user { displayName }
    guide { title }
    photos { id }
  }
}
```

| Mätning | Före | Efter |
|---|---:|---:|
| Antal databasfrågor | 139 | 4 |

Före-värdet kommer från API-loggen. Efter-värdet visas i
`extensions.databasfragor`.

### Migrering till MongoDB

Migreringen följer M3-modellen med inbäddade `points`.

Skriptet räknar sparade dokument och faktiska mätpunkter i
MongoDB och jämför med Postgres. Avvikande antal ger felkod.

Första körningen:

```text
MongoDB: 199 nya, 1 ändrade dokument
Turer: Postgres 200, MongoDB 200
Mätpunkter: Postgres 5941, MongoDB 5941
Verifiering OK: antal turer och mätpunkter stämmer
```

Andra körningen:

```text
MongoDB: 0 nya, 200 ändrade dokument
Turer: Postgres 200, MongoDB 200
Mätpunkter: Postgres 5941, MongoDB 5941
Verifiering OK: antal turer och mätpunkter stämmer
```

Omkörningen skapade inga nya dokument eller extra mätpunkter.
Antalen gäller denna datamängd; seedningen genererar slumpmässig
testdata och kan ge andra antal mätpunkter nästa gång.

### GraphQL läser mätpunkter från MongoDB

```graphql
query KontrolleraMongoBatch {
  tours(limit: 3) {
    id
    title
    logs {
      recordedAt
    }
  }
}
```

Frågan returnerade turerna 19, 40 och 169 med 32, 20 respektive
32 mätpunkter, utan GraphQL-fel.

`extensions.databasfragor` var 2:
en Postgres-fråga för turlistan och en batchad Mongo-fråga
för samtliga tre turers punkter.

### Integrationstester

API:et har 6 integrationstester och 4 konfigurationstester.
Samtliga passerade i följande körning på main:

[Grön M5-körning](https://github.com/Thebeatkicks/DevVuers/actions/runs/39934692464)

Integrationstesterna täcker turlistan och N+1, saknad guide,
ogiltigt GraphQL-fält, mutation med och utan inloggning
samt läsning av mätpunkter från MongoDB.

### Bevis: N+1-regressionstest

Vi har gjort testet och det fungerar. 

- Fråga: `Turer` i `api/src/graphql/server.test.js`.
- Med loader: [uppmätt antal frågor och testresultat].
- Utan loader för `Tour.user`: [uppmätt antal och faktisk felrad].
- Efter återställning: [grönt testresultat].


### Bevis: schemaändring stoppar typkontrollen

TODO: ta tillfälligt bort ett schemafält som en vy använder,
kör `npm run typecheck` och dokumentera resultatet.

- Borttaget schemafält: [fält].
- Berörd vy/fråga: [namn].
- Faktisk felrad:

```text
TODO: klistra in felraden från codegen/typecheck.
```

- Efter återställning: [grönt resultat].

PR #81 innehåller ett separat bevis där `distanceM` togs bort
ur klientfrågan medan vyn fortfarande använde fältet.
Det försöket ersätter inte försöket med ett borttaget schemafält.

## Working agreement

- Vi använder Discord för kommunikation.
- Vi har avstämningar enligt teamets överenskomna schema.
- Veckans uppgifter läggs i GitHub Projects och fördelas i teamet.
- Vi säger till när vi fastnar.
- Ändringar görs på kortlivade brancher med beskrivande namn.
- Arbetet lämnas som PR och granskas av en annan teammedlem.
- Alla fyra obligatoriska CI-jobb ska vara gröna före merge.

## Skuldinventering

Se [docs/debt.md](docs/debt.md).