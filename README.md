# Utpost

Plattform för friluftsdestinationer. Redaktionella guider, användarnas egna turer och bilder.

## Struktur

- `api/` – Express + Postgres (Drizzle)
- `web/` – React + Vite
- `client/` – Vue 3 + Vite
- `shared/` – TypeScript-typer för det API:et svarar med @utpost/shared: Guide, Tour, TourLog, User och ApiError. Fälten heter som i svaret snake_case. Används av både api/ och client/. Ändras ett svar ändras typen, i samma PR

## Krav 

- Node.js `^22.18.0 || >=24.12.0`
- Docker (för Postgres)

## Kom igång

```bash
npm install
docker compose -f docker-compose.dev.yml up -d
npm run seed
npm run dev
```

Appen ligger sen på:
- http://localhost:3000 för web
- http://localhost:3001 för client
- http://localhost:4000 för API:et

## Kommandon

Kör från repots rot:

| Kommando | Vad det gör |
|---|---|
| `npm run dev` | Startar api, web och client parallellt |
| `npm run lint` | Lintar `client` (täcker inte `api` eller `web`) |
| `npm run format:check` | Kontrollerar formatering i `client` |
| `npm test` | Kör tester för `client` |
| `npm run build` | Bygger `web` och `client` (inte `api`) |
| `npm run typecheck` | Typkontrollerar `shared` och `api` (inte `web` eller `client`) |


### `npm start`

Det finns inget `npm start`-skript. Använd `npm run dev` för utveckling och `npm run build` för att bygga. Deploy är inte aktuellt än, så något startskript för produktion saknas.

## Deploy

Inte aktuellt än.


## Working agreement

- Vi använder oss av Discord för att kommunicera.
- Vi träffas på fredagar har en dagliga avstämningar digitalt mån, tis, tors.
- Så fort vi ser veckans nya uppgifter så skapar vi issues i Github projects och fördelar dem jämnt. 
- Vi kommunicerar i Discord om vi fastnar på något.
- Vid arbete skapar man en egen kortlivad branch, döper den beskrivande. När man är klar för man en pullrequest, meddelar det i discord. (Automatiserar detta senare), sedan får den som har tid granska och merga. 

## Skuld
Se docs/debt.md för hela listan av alla funna skulder.