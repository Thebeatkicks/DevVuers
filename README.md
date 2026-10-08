# Utpost

Plattform för friluftsdestinationer. Redaktionella guider, användarnas egna turer och bilder.

## Struktur

- `api/` – Express + Postgres (Drizzle)
- `web/` – React + Vite
- `client/` – Vue 3 + Vite
- `shared/` – TypeScript-typer för det API:et svarar med @utpost/shared: Guide, Tour, TourLog, User och ApiError. Fälten heter som i svaret snake_case. Används av både api/ och client/. Ändras ett svar ändras typen, i samma PR

## Krav 

- Node.js `^22.18.0 || >=24.12.0`
- Docker Desktop (för Postgres och MongoDB)

## Kom igång

```bash
npm install
cp api/.env.example api/.env
docker compose -f docker-compose.dev.yml up -d
npm run seed
npm run dev
```

I PowerShell används `Copy-Item api/.env.example api/.env` för att kopiera miljöfilen. Gör det bara om `api/.env` inte redan finns. API-skripten läser filen automatiskt; miljövariabler som redan är satta har företräde. `.env` är ignorerad av Git. `JWT_SECRET` måste vara satt, medan databasadresserna har lokala standardvärden.

## MongoDB: första kopplingen

Kör från repots rot efter att Docker Desktop har startat:

```powershell
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml ps
npm run mongo:smoke
```

Vänta tills MongoDB har startat innan smoke-kommandot körs. Det sparar en demotur med tre inbäddade mätpunkter i `utpost.tours`, läser tillbaka dokumentet och skriver ut det. Nästa körning återanvänder samma dokument. Anslutningen stängs när skriptet avslutas. Detta är första Mongo-kopplingen; befintliga API-routes använder fortfarande Postgres.

`DATABASE_URL` anger Postgres-adressen. `MONGO_URL` anger Mongo-adressen och databasen `utpost`; `authSource=admin` anger var Compose-användaren autentiseras. Databaserna körs i Docker och Node-API:et körs lokalt, så adresserna använder `localhost`.

För att öppna Mongo-terminalen för Compose-tjänsten:

```powershell
docker compose -f docker-compose.dev.yml exec mongo mongosh -u utpost -p utpost --authenticationDatabase admin
```

Skriv sedan `use utpost` och `db.tours.find()` inne i `mongosh`. `exit` tar dig tillbaka till PowerShell.

Om övningscontainern `mongo-test` redan kör på port 27017, stoppa den med `docker stop mongo-test` före Compose-starten. Den behåller sina data. `docker compose -f docker-compose.dev.yml down` stoppar teamrepots databaser och behåller de namngivna volymerna; använd inte `down -v` om du vill behålla data.

Appen ligger sen på:
- http://localhost:3000 för web
- http://localhost:3001 för client
- http://localhost:4000 för API:et

## Kommandon

Kör från repots rot:

| Kommando | Vad det gör |
|---|---|
| `npm run dev` | Startar api, web och client parallellt |
| `npm run mongo:smoke` | Sparar och läser tillbaka en demotur i MongoDB |
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
