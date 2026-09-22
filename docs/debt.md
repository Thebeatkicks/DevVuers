## Skuld

Måste ha denna struktur
1 	***Vad***: Klienten hämtar data på två olika sätt 	
    ***Var***: web/src/pages/Guides.jsx rad 9 (rå fetch), web/src/pages/Home.jsx rad 14 (via api.js) 	
    ***Varför det är ett problem***: API-adressen och felhanteringen måste ändras på flera ställen, och det är lätt att missa ett 	
    ***Allvar***: Medel

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
- Komponenten PrimaryButton.jsx används inte någonstans i projektet. Det är en död komponent