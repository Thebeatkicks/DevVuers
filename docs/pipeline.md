flowchart LR
  B[branch + commit] --> PR[pull request]

  PR --> Q[Kvalitet]
  Q --> L[lint]
  L --> FM[format]
  FM --> T[test]

  PR --> I[Integration<br/>postgres + mongo som services · seed · migrate:logs · test:api]
  I --> S

  PR --> BU[Bygg]
  BU --> BI[build]
  BI --> AR[artifact]

  T --> S{gröna?}
  AR --> S

  S -->|ja| RV[Review]
  RV --> M[merge]

  S -->|nej| FX[fixa, pusha igen]
  FX --> PR

# CI/CD-pipeline

Pipelinen körs på varje pull request mot `main` och på varje push till `main`.
- Kräver status checks **Kvalitet**, **Bygg**, **Integration** och **Image** gröna innan merge
- **Integration rött men testerna gröna lokalt:** databasen i jobbet är tom tills `npm run seed` körts, och `Tour.logs` läser Mongo – `npm run migrate:logs` måste också ha körts. Portarna är `5432`/`27017` på `localhost` i jobbet, inte `5433` som i compose.


Jobbet `Kvalitet` kör lint, formatkontroll och test. Jobbet `Bygg` bygger applikationen och laddar upp `client/dist` som artifact. Jobben körs parallellt.

En pull request får bara mergas när båda jobben är gröna, minst en teammedlem har godkänt PR:n och branchen är uppdaterad mot `main`. Om något steg misslyckas måste felet åtgärdas och en ny commit pushas.

| Integration (M5) | `npm run test:api` mot Postgres och Mongo som *services* | resolvers som inte stämmer med databasen, N+1 som kommit tillbaka, mutationer utan inloggningskrav – det klientens mockade tester aldrig ser | ~47 s inkl. start av databaserna |

