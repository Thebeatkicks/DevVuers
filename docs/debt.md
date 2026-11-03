## Skuld

Kvarvarande teknisk skuld och ett fåtal M6-poster som nyligen åtgärdats. Poster om den borttagna gamla klienten är rensade ur den aktuella inventeringen.

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

4.  Vad: Deployment-instruktioner saknades.
    Status: Åtgärdad i M6. README beskriver lokal körning och staging; pipeline- och hostingbeslut finns i `docs/pipeline.md` och `docs/decisions/hosting.md`.

5.  Vad: README:s startinstruktioner var felaktiga.
    Status: Åtgärdad. README anger att API-workspacet har eget startkommando och beskriver Compose-starten.

6.  Vad: Compose-konfigurationen hade databasuppgifter direkt i filen.
    Status: Åtgärdad i M6. Lokala inställningar läses från den gitignorerade `api/.env`; `.env.example` innehåller utvecklingsvärden.

7.  Vad: JWT-hemlighet låg tidigare hårdkodad i API-konfigurationen.
    Status: Åtgärdad i M6. API-konfigurationen kräver `JWT_SECRET` från miljön. Azure-värdet skapas slumpmässigt vid staginguppsättning och lagras som Container Apps secret. Det historiska värdet återges inte här.
    Var: `api/src/config.js`, `infra/azure/staging.yaml`
    Allvar: Hög (historisk risk; värdet har roterats)

8.  Vad: Endpointen hämtar alla turer med 1 fråga och loopar sedan över varje tur. För varje tur körs separata frågor mot photos, tour_logs, users och guides.
    Var: /api/tours, båda GET anropen på rad 7 och rad 29.
    Varför det är ett problem: Antalet frågor växer linjärt med antalet turer (2 000 turer ≈ 7 450 frågor). Det ger långsammare svar, högre databasbelastning och sämre skalbarhet, speciellt när datan växer. Svarstiden är i snitt 279 ms (min 244, max 320), 5 mätningar, lokalt, 200 turer.
    Allvar: Hög
