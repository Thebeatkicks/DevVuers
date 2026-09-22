## Skuld

Måste ha denna struktur
1 	***Vad***: Klienten hämtar data på två olika sätt 	
    ***Var***: web/src/pages/Guides.jsx rad 9 (rå fetch), web/src/pages/Home.jsx rad 14 (via api.js) 	
    ***Varför det är ett problem***: API-adressen och felhanteringen måste ändras på flera ställen, och det är lätt att missa ett 	
    ***Allvar***: Medel

Förutom det uppenbara att projektet ska göras i VUE så har vi hittat:

1.  Vad: Lösenord hashas inte och lagras med plaintext, bcrypt är ett bättre alternativ
    Var: api/routes/auth.js rad 12
    Varför det är ett problem: Om databasen läcker eller komprometteras exponeras alla användares lösenord i klartext. Eftersom många användare återanvänder lösenord riskerar detta även konton på andra tjänster.
    Allvar: Hög
    
2.  Vad: Registreringsfunktion saknas helt i UI
    Var: Ingen sida eller komponent för registrering finns
    Varför det är ett problem: Utan registreringsflöde kan inga nya användare onboardas, vilket gör applikationen oanvändbar för nya kunder utanför manuellt skapade testkonton.
    Allvar: Hög/Medel

3.  Vad: Favicon saknas
    Var: Saknas
    Varför det är ett problem: Ingen funktionell påverkan, men ger ett oprofessionellt/ofärdigt intryck.
    Allvar: Låg

4.  Vad: Deployment instruktioner saknas. README.md hänvisar bara till att fråga Markus istället för att dokumentera processen.
    Var: /README.md rad 23
    Varför det är ett problem: Applikationen är beroende av att Markus är tillgänglig vid deployment. Det finns ingen dokumenterad väg framåt, vilket kan blockera releaser helt. Det gör det även svårt att onboarda nya utvecklare eller skala teamet, och ökar risken för felkonfiguration om kunskapen inte finns tillgänglig.
    Allvar: Hög

5.  Vad: README anger felaktigt startkommando (npm start)
    Var: /README.md rad 11
    Varför det är ett problem: Följer man instruktionerna i README fungerar inte uppstarten. Man behver då undersöka package.json eller fråga någon vilket gör onboarding svårare.
    Allvar: Medel/Låg

6.  Vad: Query-parametrar byggs manuellt istället för URLSearchParams
    Var: web/src/pages/Guides.jsx, rad 15
    Varför det är ett problem: Specialtecken i sökningen kan försvinna eller feltolkas i requesten eftersom värdet inte URL-encodas.
    Allvar: Medel

7.  Vad: Docker-compose.dev.yml har alla uppgifter satta direkt i filen. Den bör istället kopplas till .env där uppfiterna sitter i variablar istället {DATABASE_URL}
    Var: /docker-compose.dev.yml rad 7,8 och 9
    Varför det är ett problem: Känsliga uppgifter (som lösenord, URL:er) syns direkt i filen och riskerar att läcka om filen delas eller hamnar i git.
    Allvar: Hög

8.  Vad: Tours har en annan struktur i sin useEffect än övriga API-calls.
    Var: web/src/pages/tours.jsx  rad 10
    Varför det är ett problem: Inkonsekvent kodstruktur gör koden svårare att läsa och underhålla.
    Allvar: Låg

9.  Vad: Token sparas i localstorage
    Var: web/src/pages/Login.jsx rad 18
    Varför det är ett problem: Token i localStorage kan stjälas via XSS-attacker, till skillnad från httpOnly-cookies som JavaScript inte kan läsa.
    Allvar: Hög

10. Vad: JWS i config.   jwtSecret: 'utpost-super-secret-2021',
    Var: api/config.js, rad 3,4,5 och 6
    Varför det är ett problem: Hårdkodade hemligheter hamnar i git-historiken och kan läsa av vem som helst med tillgång till koden, vilket gör det lätt att förfalska tokens eller läcka andra secrets.
    Allvar: Hög

11. Vad: Komponenten PrimaryButton.jsx används inte någonstans i projektet. Det är en död komponent
    Var: web/src/components/PrimaryButton.jsx
    Varför det är ett problem: Den används ingenstans och onödig kod kan förvirra utvecklare som inte vet om den är säker att ta bort.
    Allvar: Låg