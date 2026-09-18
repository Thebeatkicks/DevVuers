# Utpost

Plattform för friluftsdestinationer. Redaktionella guider, användarnas egna turer och bilder.

## Kom igång

```bash
npm install
docker compose -f docker-compose.dev.yml up -d
npm run seed
npm start
```

Appen ligger sen på http://localhost:3000 och API:et pa http://localhost:4000.

## Struktur

- `api/` – Express + Postgres (Drizzle)
- `web/` – React + Vite

## Deploy

Fråga Marcus.


## Working agreement

- Vi använder oss av Discord för att kommunicera.
- Vi träffas på fredagar har en dagliga avstämningar digitalt mån, tis, tors.
- Så fort vi ser veckans nya uppgifter så skapar vi issues i Github projects och fördelar dem jämnt. 
- Vi kommunicerar i Discord om vi fastnar på något.
- Vid arbete skapar man en egen kortlivad branch, döper den beskrivande. När man är klar för man en pullrequest, meddelar det i discord. (Automatiserar detta senare), sedan får den som har tid granska och merga. 

## Skuld

Förutom det uppenbara: Att projektet ska göras i VUE så har vi hittat:

- Lösenord hashas inte och lagras med plaintext
- Det finns inget skapa konto
- favicon broken
- Deployment instructions
- npm run dev -> Readme 
