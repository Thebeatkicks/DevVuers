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


### 1. 
Vad: Tre olika knapp mönster
Var: button.jsx (inline style), PrimaryButton.jsx (klasskomponent + css klass), Login.jsx:29 ( className="button-blue" direkt)
Varför det är ett problem: Tre parallella sätt att göra samma UI-element gör varje styling-ändring till en sökning i flera filer.
Allvar: medel

### 2. 
Vad: JWT super secret hårdkodad
Var: config.js: 2-4
Vem som helst med läsåtkomst till repot kan förfalska inloggningstokens eller komma åt databasen direkt. Ligger dessutom kvar i git-historiken.
Allvar:  Hög

### 3. 
Vad: Klasskomponent bland funktionella komponenter
Var: PrimaryButton.jsx:3
Varför det är ett problem: Resterande är funktionella med hooks. 
Allvar: Låg