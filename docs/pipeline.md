flowchart LR
  B[branch + commit] --> PR[pull request]

  PR --> Q[Kvalitet]
  Q --> L[lint]
  L --> FM[format]
  FM --> T[test]

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

Jobbet `Kvalitet` kör lint, formatkontroll och test. Jobbet `Bygg` bygger applikationen och laddar upp `client/dist` som artifact. Jobben körs parallellt.

En pull request får bara mergas när båda jobben är gröna, minst en teammedlem har godkänt PR:n och branchen är uppdaterad mot `main`. Om något steg misslyckas måste felet åtgärdas och en ny commit pushas.