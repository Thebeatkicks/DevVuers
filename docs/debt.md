## Skuld

Förutom det uppenbara: Att projektet ska göras i VUE så har vi hittat:

- Lösenord hashas inte och lagras med plaintext rad 12 använd bcrypt
- Det finns inget skapa konto
- favicon broken
- Deployment instructions
- npm run dev -> Readme 
- Saknar serchParams och lägger queary direkt i URL:n
- Docker-compose.dev.yml bör kopplas till .env och variablar importeras ${DATABASE_URL}
- Tours har en annan struktur i sin useEffect än övriga API-calls. tours.jsx rad 10
- login.jsx rad 18 sparas token i localstorage
- JWS i config.   jwtSecret: 'utpost-super-secret-2021',
