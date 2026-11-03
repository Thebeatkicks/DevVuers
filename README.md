# Utpost

Plattform för friluftsdestinationer med redaktionella guider,
användarnas turer, mätpunkter och bilder.

## Struktur

- `api/` – Express, GraphQL Yoga, Postgres och MongoDB.
- `client/` – Vue 3, Vue Router och urql.
- `shared/` – gemensamma TypeScript-typer för REST-kontraktet.
- `docs/` – beslut, teststrategi och pipelinebeskrivning.

GraphQL-klientens typer och dokument genereras från API-schemat
och klientens frågor till `client/src/gql/`.

## Krav

- Node.js `^22.18.0 || >=24.12.0`.
- Docker Desktop.
- En lokal `api/.env` med `JWT_SECRET` och databasinställningar.

För Node-processen i API-workspacet, kopiera `.env.example` från repots rot till `api/.env`. Om du använder Docker Compose, kopiera den också till `.env` i repots rot: Compose läser rotfilen för variabelinterpolering. Båda filerna ignoreras av Git. I PowerShell:

```powershell
Copy-Item .env.example api/.env
Copy-Item .env.example .env
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
| `npm run dev` | Startar API och Vue-klient lokalt |
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
| `npm run build` | Bygger Vue-klienterna |

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

Pipelinen har fyra kontroller före merge och ett Deploy-jobb efter merge till `main`:

- **Kvalitet:** lint, formatering, klienttester,
  API-konfigurationstester och typkontroll.
- **Bygg:** bygger applikationen och sparar `client/dist`.
- **Integration:** kör API-tester mot Postgres och MongoDB.
- **Image:** bygger containerbilder och publicerar dem på main.
- **Deploy → Azure staging:** efter merge uppdaterar staging med commitens images, verifierar health-SHA och kör ett GraphQL-smoketest. Det är inte en status check på pull requests.

Se [pipelinebeskrivningen](docs/pipeline.md) och
[teststrategin](docs/testing.md).

## Konfiguration och hemligheter (M6)

`.env.example` i repots rot listar miljövariablerna och innehåller bara lokala utvecklingsvärden. För lokal utveckling kopieras den till den gitignorerade `api/.env`. `api/src/config.js` läser `JWT_SECRET` från miljön och vägrar starta om den saknas; API-adresserna i koden har endast lokala standardvärden. Klientens nginx använder `API_UPSTREAM` från miljön: `api:4000` i Compose och `localhost:4000` i Azure.

`infra/azure/skapa-staging.sh` skapar ett slumpmässigt JWT-värde och databaslösenord när staging sätts upp och skickar dem till Azure Container Apps secrets (`jwt-secret` och `db-password`). Värdena skrivs inte till repo-filer och ska inte kopieras till dokumentationen. GitHub-miljön `azure-staging` innehåller sex Azure-ID-/konfigurationsvariabler och inga GitHub secrets. GitHub Actions loggar in med OIDC.

Historiken för API-konfigurationen visar att den hårdkodade nyckeln först fanns i `da7a125` (17 september 2026) och togs bort ur `api/src/config.js` i `2f223b6` (8 oktober 2026). Den nya stagingnyckeln ligger i Azure Container Apps secret `jwt-secret`; själva värdet dokumenteras inte. Värdet hade även dokumenterats i en äldre skuldpost, så det repo-breda historiksöket visar den dokumentationshistoriken också. Historiken skrivs inte om; kontrollera aktuella filer separat.

## I molnet (M6)

**Staging:** [öppna Utpost](https://utpost-staging.livelystone-51f31c82.swedencentral.azurecontainerapps.io/). Azure Container App `utpost-staging` körs i `swedencentral`, resursgruppen `utpost-henrik-martini-rg`, med fyra containrar: nginx-klient, API, Postgres och MongoDB. Endast nginx har publik HTTPS-ingress. Staging skalar till noll och databaserna har ingen beständig volym; en tom databas seedas vid start.

**Boot-bevis från Azure-loggen:**

```text
boot: väntar på Postgres (1/30): connect ECONNREFUSED 127.0.0.1:5432
boot: väntar på Postgres (2/30): connect ECONNREFUSED 127.0.0.1:5432
boot: väntar på Postgres (3/30): connect ECONNREFUSED 127.0.0.1:5432
boot: tom databas – seedar
Seed klar: 12 användare, 40 guider, 200 turer, 5920 loggpunkter.
Förberedda dokument: 200, mätpunkter: 5920
Postgres: 200 turer
Postgres: 5920 mätpunkter
```

**Deploy-bevis:** PR [#97](https://github.com/Thebeatkicks/DevVuers/pull/97) hade Deploy överhoppat och de fyra vanliga kontrollerna gröna. Efter merge var [main-körning 41630187005](https://github.com/Thebeatkicks/DevVuers/actions/runs/41630187005) grön med alla fem jobb; Deploy tog 1 min 23 s och hela körningen 2 min 30 s.

Den publika `/api/health` svarade med HTTP 200:

```json
{"ok":true,"sha":"8ca7b318496bd1a28b4d3dad53c2178cc3e5c412","postgres":{"ok":true},"mongoDb":{"ok":true}}
```

Azure rapporterade dessa revisioner:

| Revision | Tillstånd | Betydelse |
|---|---|---|
| `utpost-staging--k024z1j` | Healthy, Stopped | Tidigare version före M6-deploy |
| `utpost-staging--sha-8ca7b31-api` | Healthy, Stopped | Mellanrevision efter API-uppdatering |
| `utpost-staging--sha-8ca7b31` | Healthy, aktiv, 1 replica | Slutrevision med API och klient |

Första health-försöket efter deployen gav tillfälligt 502; efter väntan svarade health med 200 och rätt SHA. Pipeline-jobbet verifierade SHA och GraphQL-data. Den första uppmätta health-svarstiden tidigare i arbetet var 0,066 sekunder efter att appen redan var startad, så den är inte ett kallstartsmått. Den kontrollerade kallstartstiden ska mätas från noll replicas och dokumenteras i [hostingbeslutet](docs/decisions/hosting.md).

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

Följande fråga används för den dokumenterade mätningen med 50 turer:

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
- Med loader: 2.
- Utan loader för `Tour.user`: 51 databasfrågor (1 + 50 enskilda användarfrågor). Testet fallerar med felraden:
  ```text
  AssertionError: expected 51 to be <= 2
  ```
- Efter återställning: ger grönt test resultat.


### Bevis: schemaändring stoppar typkontrollen
Vi tog tillfälligt bort `distanceM` ur `type Tour` i `api/src/graphql/schema.js`
och körde `npm run typecheck -w client`. Codegen validerar frågorna mot schemat
och stoppar innan `vue-tsc` körs.

- Borttaget schemafält: `distanceM` på `type Tour`.
- Berörd vy/fråga: `Tours`-frågan i `client/src/views/ToursView.vue`.
- Faktisk felrad:

```text
> graphql-codegen && vue-tsc --noEmit

✔ Parse Configuration
⚠ Generate outputs
  ❯ Generate to ./src/gql/
    ✔ Load GraphQL schemas
    ✔ Load GraphQL documents
    ✖ GraphQL Document Validation failed with 1 errors;
      Error 0: Cannot query field "distanceM" on type "Tour".
        at client/src/views/ToursView.vue:6:7
  ✖ One or more errors occurred, no files were generated.
```


- Efter återställning (`git checkout api/src/graphql/schema.js`) är typkontrollen grön:

```text
> utpost@1.4.2 typecheck
> npm run typecheck --workspace=shared && npm run typecheck --workspace=api && npm run typecheck --workspace=client

> @utpost/client@0.1.0 typecheck
> graphql-codegen && vue-tsc --noEmit

✔ Parse Configuration
✔ Generate outputs
```



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
