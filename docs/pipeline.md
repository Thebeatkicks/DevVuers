# CI/CD-pipeline

Workflowen finns i `.github/workflows/ci.yml`.
Den körs på pull requests och på push till main.

## Flöde

```mermaid
flowchart TD
  C[Commit på branch] --> PR[Pull request]
  PR --> Q[Kvalitet]
  PR --> B[Bygg]
  PR --> I[Integration]
  PR --> SEC[Säkerhet]

  Q --> IMG[Image]
  B --> IMG

  Q --> CHECK{Alla fem jobb gröna?}
  B --> CHECK
  I --> CHECK
  SEC --> CHECK
  IMG --> CHECK

  CHECK -->|Nej| FIX[Åtgärda och pusha igen]
  FIX --> PR

  CHECK -->|Ja| REVIEW[Godkännande av annan teammedlem]
  REVIEW --> MERGE[Merge till uppdaterad main]
  MERGE --> MAIN[Ny CI-körning på main]
  MAIN --> GHCR[Publicering av containerbilder]
  GHCR --> DEPLOY[Deploy till Azure staging]
  DEPLOY --> VERIFY[Health-SHA och GraphQL-smoketest]
  MAIN --> DEPLOY_FN[Deploy till Azure Functions]
  DEPLOY_FN --> VERIFY_FN[Röktest av process-image]
```

Image-jobbet väntar på Kvalitet och Bygg.
Integration och Säkerhet kör parallellt. Alla fem kontroller ska vara gröna före merge; Säkerhet behöver också läggas till i det aktiva rulesetet enligt avsnittet Regler för merge.

## Jobb

| Jobb | Vad det kör | Vad det fångar |
|---|---|---|
| Kvalitet | npm ci, lint, formatkontroll, klienttester, API-konfigurationstester och typecheck | Stilfel, testfel och typfel |
| Bygg | npm ci och npm run build | Fel i bygget av Vue-klienten |
| Integration | Databasservices, npm ci, seed, migrering och test:api | Fel i GraphQL, databasåtkomst, N+1 och inloggningskrav |
| Säkerhet (M8) | npm audit för produktionsberoenden, Trivy på repot, Compose-bygge och appstart, kontroll av API-användare, Trivy på API-imagen och ZAP baseline | Sårbara beroenden, hemligheter, felkonfigurerade Dockerfiler, sårbarheter i runtime-imagen och brister i HTTP-headers |
| Image | Bygger API- och klientimages | Fel i Docker-byggena |
| Deploy → Azure staging | Efter grön Image och Integration på push till `main`; OIDC-inloggning, uppdaterar API- och klientimage, väntar på rätt health-SHA och röktestar GraphQL | Fel i deploy, revisionens start, konfiguration eller databassvar |
| Deploy → Azure Functions | Efter grön Kvalitet på push till `main`; `npm ci --omit=dev` i `functions/`, OIDC-inloggning, publicerar `functions/` till Azure Functions och röktestar `/api/process-image` | Fel i funktionsdeploy, konfiguration, funktionsnyckel eller svar från `process-image` |

Bygg laddar upp `client/dist` som artifact.

På pull requests bygger Image utan att publicera.
På main publiceras API- och klientimages till GHCR med
SHA-tagg och `latest`.

Deploy bygger inga images. Det använder de SHA-taggade images som Image-jobbet byggde från samma commit. Jobbet behöver både Image och Integration, kör endast efter push till `main`, och använder GitHub-miljön `azure-staging` samt OIDC (`id-token: write`). Azure-ID:n ligger som miljövariabler i GitHub; inga GitHub secrets behövs för Azure-inloggningen.

Jobbet uppdaterar först API-containern och sedan klientcontainern i Azure Container App. Varje uppdatering skapar en revision. Därefter väntar jobbet tills Azure rapporterar att senaste revision är redo och `/api/health` svarar med workflowens fullständiga commit-SHA. Till sist skickar det en GraphQL-fråga genom nginx och kräver minst en tur från databasen.

Deploy är **inte** en status check som kan godkännas före merge. På en pull request hoppas jobbet över. Det körs efter merge, på den commit som faktiskt hamnade på `main`; om Deploy misslyckas blir staging inte uppdaterad även om själva merge-committen ligger kvar på `main`.

`Deploy → Azure Functions` körs också endast vid push till `main` (och hoppas över på pull requests). Det väntar på `Kvalitet`, installerar funktionens beroenden i `functions/`, loggar in i Azure med OIDC, publicerar paketet till `AZURE_FUNCTION_APP` och kör ett röktest mot `/api/process-image` med funktionsnyckeln.

## Säkerhet (M8)

Jobbet `security`, med namnet **Säkerhet**, körs på varje pull request och push till main. Kontrollerna ligger i följande ordning, med de billigaste först:

1. `npm audit --omit=dev --audit-level=high` kontrollerar produktionsberoenden och stoppar vid high eller critical.
2. Trivy `fs` skannar produktionsberoenden, hemligheter och felkonfigurationer i repot (`vuln,secret,misconfig`). Fynd på HIGH eller CRITICAL med tillgänglig fix stoppar sårbarhetsskanningen; konfigurations- och hemlighetsfynd hanteras också av skannern.
3. `docker compose up -d --build --wait` bygger API- och klientimages och startar appen. En testnyckel för JWT sätts enbart för CI-miljön.
4. `docker compose exec -T api id` och en kontroll av `id -u` kräver att API-processen kör med uid 1000.
5. Trivy `image` skannar `utpost-api`, inklusive operativsystemspaket och installerade npm-paket. HIGH och CRITICAL med tillgänglig fix stoppar jobbet.
6. ZAP baseline granskar `http://localhost:3001`, alltså nginx i den byggda klientcontainern. Därmed testas de headers som levereras av containerappen, inte Vites utvecklingsserver.

Ett misslyckat steg stoppar efterföljande vanliga steg. Vid fel skrivs de senaste apploggarna från API och klient ut. När ZAP har genererat rapporter sparas de i artefakten `zap-rapport`.

### Undantag och blockerande regler

Undantag dokumenteras med motivering i `.trivyignore` och `.zap/rules.tsv`. Hemligheter får inte ignoreras: de tas bort och roteras om de har exponerats.

DS-0002 ignoreras för nginx-klienten eftersom dess masterprocess startar som root och arbetsprocesserna kör som nginx. Regel-id:t gäller globalt i `.trivyignore`, så API:ets användare verifieras separat i CI. API-imagen har `USER node` och npm tas bort efter installation eftersom appen startas med `node`.

ZAP:s regler 10020, 10021, 10036 och 10038 är FAIL: saknat clickjacking-skydd, saknad nosniff-header, synlig serverversion och saknad CSP. `cmd_options: '-a -I'` gör att WARN inte ger felkod, medan FAIL fortfarande stoppar jobbet. Inline-stilar i CSP är ett medvetet WARN; inline-skript tillåts inte.

### Verifiering och tid

- [PR #123: säkerhetsskanning i pipelinen](https://github.com/Thebeatkicks/DevVuers/pull/123).
- [Röd repo-skanning med DS-0002 i båda Dockerfilerna](https://github.com/Thebeatkicks/DevVuers/actions/runs/44170308443).
- [Röd imageskanning före borttagning av npm](https://github.com/Thebeatkicks/DevVuers/actions/runs/44172786022).
- [Röd ZAP-körning före headerfix: FAIL-NEW 4](https://github.com/Thebeatkicks/DevVuers/actions/runs/44176242701).
- [Grön PR-körning med samtliga fyra skanningar](https://github.com/Thebeatkicks/DevVuers/actions/runs/44177706237). Säkerhet tog **3 min 4 s**, ungefär tre minuter.

Lokalt verifierades uid 1000 och HTTP 200 med säkerhetsheaders på `/`, `/api/health` och en byggd JavaScript-fil under `/assets/`. API-svaret hade `Cache-Control: no-store`, medan asset-filen hade lång cachetid och `public, immutable`.

**Återstår före M8-taggen:** länka grön main-körning och jobbets ungefärliga tid på main; dokumentera den separata PR:en med avsiktligt sårbart beroende och att den stängts utan merge; verifiera stagingens headers. Dessa resultat är ännu inte dokumenterade som genomförda.

## Kvalitet

Testerna delas upp så att Kvalitet inte behöver databaser:

```bash
npm run test --workspace=client
npm run test --workspace=api -- src/config.test.js
```

API-integrationstesterna körs i jobbet Integration.

På main omfattar rotens `npm run typecheck` shared, API och
klient. Klientsteget kör GraphQL Code Generator före vue-tsc.

Codegen läser schemat direkt ur `api/src/graphql/schema.js`.
Ingen API-server behöver vara igång för typgenereringen.

## Integration

Jobbet startar Postgres 16 och MongoDB 8.2 som services.
Healthchecks används innan jobbstegen körs.

Stegen körs i denna ordning:

```bash
npm ci
npm run seed
npm run migrate:logs
npm run test:api
```

Databaserna är tomma vid jobbets start. Seedningen fyller
Postgres och migreringen skriver turdokumenten till MongoDB.

### Miljövariabler

Följande variabler sätts på jobbnivå:

- `DATABASE_URL` – Postgres på localhost:5432.
- `MONGO_URL` – MongoDB på localhost:27017 med authSource=admin.
- `JWT_SECRET` – nyckel avsedd enbart för CI-tester.

De gäller för seed, migrering och tester.

Den lokala `.env`-filen finns inte i CI.
Meddelandet `.env not found. Continuing without it.` är därför
normalt när variablerna redan är satta i jobbet.

### Portar

| Miljö | Postgres | MongoDB |
|---|---|---|
| Lokal Node-process mot Compose | localhost:5433 | localhost:27017 |
| API-container i Compose | postgres:5432 | mongo:27017 |
| GitHub Actions-jobbet | localhost:5432 | localhost:27017 |

## Regler för merge

Det aktiva rulesetet för main kräver:

- Pull request.
- Minst ett godkännande från en annan teammedlem.
- Godkända checks från GitHub Actions:
  - Kvalitet
  - Bygg
  - Integration
  - Image
- Att branchen är uppdaterad mot main.

Rulesetet blockerar även force push och borttagning av main.
Bypass-listan är tom.

[Ruleset för main](https://github.com/Thebeatkicks/DevVuers/rules/23586241)

**M8-komplettering återstår:** lägg till statuskontrollen **Säkerhet** från GitHub Actions i samma ruleset och verifiera att den krävs. Listan ovan beskriver de tidigare verifierade kraven; säkerhetsjobbet är inte dokumenterat som obligatoriskt förrän inställningen har kontrollerats.

## Verifiering och mätningar

Alla fyra jobb passerade i följande körning på main:

[Grön körning](https://github.com/Thebeatkicks/DevVuers/actions/runs/39934692464)

I den körningen:

- Seed och migrering kördes före API-testerna.
- 6 integrationstester och 4 konfigurationstester passerade.
- Integration tog cirka 53 sekunder från jobbstart till avslut,
  inklusive containerstart och städning.

Tider varierar mellan körningar och ska kopplas till en viss körning.

### Bevis att röd Integration blockerar merge

TODO: dokumentera verifieringen med länk eller skärmbild.

- Test-PR: [länk].
- Misslyckad obligatorisk check: Integration.
- GitHubs merge-status: [observerat resultat].
- Test-PR stängd utan merge: [ja/nej].

En tillfällig test-PR finns som #83. Kontrollera resultat och
status innan den används som färdigt bevis. Den ska inte mergas.

[Temporär test-PR #83](https://github.com/Thebeatkicks/DevVuers/pull/83)

### Jämförelse av `npm ci` före och efter borttagandet av `web/`

Tiderna är stegtiderna från GitHub Actions-jobbloggarna, avrundade till hela sekunder. Före-mätningen är main-körning 41037122902, före PR #96; efter-mätningen är main-körning 41629682887, efter PR #96.

| Jobb | Före (`npm ci`) | Efter (`npm ci`) |
| --- | ---: | ---: |
| Kvalitet | 7 s | 24 s |
| Bygg | 6 s | 27 s |
| Integration | 8 s | 28 s |

- [Före: main-körning 41037122902](https://github.com/Thebeatkicks/DevVuers/actions/runs/41037122902)
- [Efter: main-körning 41629682887](https://github.com/Thebeatkicks/DevVuers/actions/runs/41629682887)

Det här är en observation från en körning på vardera sidan, inte ett stabilt prestandatest. Stegtiderna blev längre efter ändringen, vilket visar att runnerbelastning och nätverk påverkar mätningen. Vi drar därför ingen slutsats om att `npm ci` blev snabbare; mätningen dokumenterar vad de två jobbloggarna faktiskt visar.

### M6 Deploy på main

PR #97 visade Deploy som överhoppat medan de fyra vanliga kontrollerna passerade. Efter merge körde [main-workflowen 41630187005](https://github.com/Thebeatkicks/DevVuers/actions/runs/41630187005) alla fem jobb gröna. Deploy tog 1 min 23 s; hela workflowen tog 2 min 30 s.

Health svarade med HTTP 200 och samma SHA som workflowens `headSha`: `8ca7b318496bd1a28b4d3dad53c2178cc3e5c412`. GraphQL-smoketestet returnerade minst en tur. Revisionerna i Azure var:

| Revision | Status | Roll |
|---|---|---|
| `utpost-staging--k024z1j` | Healthy, Stopped | Före M6-deployen |
| `utpost-staging--sha-8ca7b31-api` | Healthy, Stopped | Mellanrevision efter API-uppdatering |
| `utpost-staging--sha-8ca7b31` | Healthy, aktiv, 1 replica | Slutrevision med API och klient |

Deploy-loggen verifierar health-SHA och GraphQL; den manuella health-kontrollen verifierade även Postgres och MongoDB som friska. Se README:s [M6-bevis](../README.md#i-molnet-m6).

## Felsökning

### Säkerhet rött på npm audit

Kör `npm audit --omit=dev` för att läsa produktionsfynden. `npm audit fix` uppdaterar inom tillåtna versionsintervall. Versionsbyten som bryter intervallet hanteras uttryckligen och verifieras med tester, typkontroll och bygge; använd inte generell `--force` för att kringgå beroendekonflikter. Kvarstående fynd utan fix dokumenteras i `docs/security.md` och bedöms uttryckligen.

### Säkerhet rött på Trivy

Läs målfil och regel eller CVE i loggen. DS-0002 i API:et åtgärdas med `USER node`; nginx-undantaget motiveras i `.trivyignore`. Ett rent repo innebär inte att imagen är ren: imageskanningen kan hitta sårbarheter i operativsystemet eller npm som följde med basimagen.

### Säkerhet rött på ZAP

Läs regel-id och URL i rapporten. Saknad CSP på en enskild adress kan bero på att dess nginx-location saknar `include /etc/nginx/security-headers.conf`. Regelfilen kräver tabbar och UTF-8 utan BOM. `Cannot read properties of undefined (reading 'trim')` inträffade när regelfilen hade BOM. `Connection refused` inträffade när ZAP låg före Compose-starten. ZAP ska köras efter appstart och imageskanning. WARN ska inte stoppa jobbet med `-I`; FAIL ska göra det.

### Säkerhet rött på Compose-start

Kontrollera steget med apploggar och `docker compose logs api client`. Compose kräver `JWT_SECRET` även i CI. API:ets start och seedning behöver lyckas innan appen kan svara; efter att npm tagits bort ur imagen används `node`, inte `npm`, för eventuella kommandon inne i API-containern.

### JWT_SECRET måste vara satt

Kontrollera att JWT_SECRET finns under `integration.env`,
inte bara på teststeget eller inne i en databas-service.
Även seedningen importerar API-konfigurationen.

### Anslutning till Postgres misslyckas

Kontrollera healthcheck och DATABASE_URL.
I CI används localhost:5432, inte lokalutvecklingens port 5433.

### Mongo-punkter saknas

Kontrollera att `npm run migrate:logs` har körts efter seed
och före testerna. `Tour.logs` läser från MongoDB.

### Integrationstester startar i Kvalitet

Kontrollera testkommandona. Rotens `npm test` kör även
API-integrationstester och ska därför inte användas som
teststeg i Kvalitet utan tillhörande databaser.

### Grönt lokalt men rött i CI

Kontrollera skillnader i miljövariabler, databasportar,
seedning, migrering och committade filer.

Se [teststrategin](testing.md) för lokal körning och
[README](../README.md) för M5- och M6-bevisen.
