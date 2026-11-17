# Säkerhet – Utpost

*Mall (M8). Byt ut exempelraderna mot era egna fynd. Minst tre rader ska ha ett riktigt fynd, en fix i en PR och ett test som var rött före fixen. "Gäller inte oss, för …" är också ett svar – men bara om det är sant. Listan följer OWASP Top 10 (2025).*

**Datum:** 2026-11-17
**Hotbilden i en mening:** En obehörig eller inloggad angripare kan försöka läsa kontouppgifter, ändra redaktionens guider eller manipulera andra användares turer och bilder.

## Autentiseringen (M8)

- Lösenord lagras som saltade scrypt-hashar med prefixet scrypt:, via api/src/lib/password.js. Registrering och seed använder hashPassword. Inloggning använder verifyPassword även när e-postadressen saknas. Fel e-post och fel lösenord ger samma 401-svar.
- API:et skickar en publik användare via publicUser, aldrig password_hash.
- JWT innehåller användarens id, e-post och roll, gäller en timme och signeras med HS256. Verifieringen accepterar endast HS256.
- Klientens token ligger bara i minnet via client/src/lib/token.ts. Auth-storen delar inloggat tillstånd med befintliga session-vyer. Omladdning loggar ut och utloggning rensar token.
- Skrivande tur- och fotoroutes kräver requireUser. Ägarkontrollen jämför den inloggades id med databasraden; editor får också hantera dessa resurser. Utan token ges 401 och fel ägare ger 403.
- PUT /api/guides/:id kräver requireUser och requireRole('editor'). En inloggad medlem får 403.
- Klientens skyddade turvy innehåller bilduppladdningen. Utloggade skickas till /logga-in?till=… och återvänder efter lyckad inloggning. API-skyddet gäller även vid direkta anrop utan klientens guard.

Implementation och bevis: PR #119, #120, #121 och #122.

## OWASP Top 10 – genomgång

| # | Risk | Gäller oss? | Vad vi hittade | Vad vi gjorde (PR) | Kontroll |
|---|---|---|---|---|---|
| A01 | Broken Access Control | Ja | DELETE av turer saknade åtkomstkontroll. Guideuppdatering kunde göras utan token och av vanliga medlemmar. | Token och ägarkontroll för turer/foton i [#120](https://github.com/Thebeatkicks/DevVuers/pull/120). Editor-krav för guider i [#122](https://github.com/Thebeatkicks/DevVuers/pull/122). | Testerna ”DELETE /api/tours/:id utan token ger 401 och turen finns kvar” och ”en medlem får inte ändra guider (403) – bara rollen editor”. Före-bevis finns i #119 och avsnittet Guides och CORS nedan. |
| A02 | Security Misconfiguration | Ja | Öppen CORS, saknade nginx-headers, synlig serverversion och API-container som körde som root. | CORS bort i [#122](https://github.com/Thebeatkicks/DevVuers/pull/122). Headers, USER node och motiverat nginx-undantag i [#123](https://github.com/Thebeatkicks/DevVuers/pull/123). | CORS-testet gick från rött till grönt. Trivy hittade DS-0002. ZAP hittade 10020, 10021, 10036 och 10038. Se Skanning i pipelinen och lokala curl-kontroller. |
| A03 | Software Supply Chain Failures | Ja | Produktionsauditen hittade sårbara beroenden, bland annat Drizzle. Imageskanningen hittade dessutom sårbarheter i npm:s medföljande beroenden. | Uppdaterade beroenden, tog bort npm ur runtime-imagen och införde audit, Trivy och ZAP i [#123](https://github.com/Thebeatkicks/DevVuers/pull/123). | Säkerhet var rött före åtgärderna och grönt efter. Produktionsauditen visar 0 sårbarheter. Se Skanning i pipelinen för körningslänkar. |
| A04 | Cryptographic Failures | Ja | Lösenord lagrades i klartext i databasen. | Saltad scrypt-hashning vid registrering och seed i [#120](https://github.com/Thebeatkicks/DevVuers/pull/120). | Testet ”lösenordet i databasen är hashat, inte klartext” var rött före fixen i [#119](https://github.com/Thebeatkicks/DevVuers/pull/119) och är nu grönt. |
| A05 | Injection | Ja | Guides-sökningen byggde SQL med användarens sökord i strängen. Ett citattecken kunde få anropet att hänga. | Parametriserad fråga med $1 i [#120](https://github.com/Thebeatkicks/DevVuers/pull/120). | Testet ”ett citattecken i sökordet ger 200 och en tom lista, inte 500” var rött före fixen i [#119](https://github.com/Thebeatkicks/DevVuers/pull/119) och är nu grönt. |
| A06 | Insecure Design | Ja | Ett system som litar på klientens kontroller kan kringgås med direkta API-anrop. | Åtkomst och validering kontrolleras i serverns routes i #120 och #122; klientguarden kompletterar användarflödet. | API-tester anropar skyddade routes direkt utan klienten och verifierar 401/403. Rate limiting återstår, se Kända brister. |
| A07 | Authentication Failures | Ja | Inloggningssvaret innehöll password_hash och lösenordsskyddet behövde stärkas. | publicUser, scrypt och entimmes JWT med låst HS256 i [#120](https://github.com/Thebeatkicks/DevVuers/pull/120). Token endast i klientminnet i #121. | Testet ”svaret på en lyckad inloggning innehåller token och användaren – men aldrig password_hash” var rött i [#119](https://github.com/Thebeatkicks/DevVuers/pull/119) och är nu grönt. LoginView-tester verifierar tokenlagringen. |
| A08 | Software or Data Integrity Failures | Delvis | Vi är beroende av att installerade paket och publicerade images motsvarar granskad kod. Något separat integritetsangrepp har inte bevisats. | Lockfil och npm ci används i CI. Containerbilder publiceras med SHA-taggar och stagingens health-SHA verifieras vid deploy. | Pipelinekonfigurationen beskriver skydden. Detta är förebyggande åtgärder, inte ett nytt bevisat och lagat hål. |
| A09 | Security Logging & Alerting Failures | Ja | Det finns ingen komplett säkerhetsloggning och larmning för misslyckad inloggning eller nekad åtkomst. | Vanliga felloggar finns, men full säkerhetsloggning har inte införts i M8. | Kvarstående brist dokumenteras under Kända brister. Ingen testad fix påstås för denna rad. |
| A10 | Mishandling of Exceptional Conditions | Ja | Vissa fel gav hängande anrop eller HTML-fel i stället för ett hanterat JSON-svar. | wrap och central felhantering infördes i [#120](https://github.com/Thebeatkicks/DevVuers/pull/120). Guideuppdateringen använder wrap i #122. | Testerna ”ett id som inte är ett tal ger 400, inte ett ohanterat fel” och ”trasig JSON ger 400 med ett svar – inte ett anrop som hänger” var röda i [#119](https://github.com/Thebeatkicks/DevVuers/pull/119) och är nu gröna. Samtliga async-routes i guides.ts använder nu wrap; kompletteringen ingår i PR #123.

### Guides och CORS – PR #122

Vi hittade en oskyddad guideuppdatering: både utloggade och medlemmar kunde ändra guider, och ogiltig difficulty accepterades. API:et skickade också Access-Control-Allow-Origin: *.

Åtgärd: PUT /api/guides/:id kräver nu giltig token, rollen editor och validerad body. Id valideras och saknad guide ger 404. Den öppna CORS-konfigurationen och CORS-beroendena är borttagna.

- PR: https://github.com/Thebeatkicks/DevVuers/pull/122
- Före: fyra nya tester röda i Integration:
  https://github.com/Thebeatkicks/DevVuers/actions/runs/44155199593/job/134293947355
- Efter lokalt: alla 17 säkerhetstester och alla 27 API-tester gröna. Typkontrollen passerar.

Testnamn:
- PUT /api/guides/:id utan token ger 401
- en medlem får inte ändra guider (403) – bara rollen editor
- en redaktör kan ändra – och får en validerad guide tillbaka
- API:et skickar ingen Access-Control-Allow-Origin – ingen annan sajt får läsa svaren

## Validering av indata

Zod-scheman finns i api/src/lib/schemas.js. validate körs före route-hanteringen för login, registrering, skapande av tur, bilduppladdning och guideuppdatering. Sökningens query valideras med searchSchema.

Ogiltig body eller query ger HTTP 400 med error och en lista issues som beskriver fält och fel. Numeriska id:n kontrolleras med idParam; ogiltiga id:n ger 400 och saknade resurser ger 404.

Okända bodyfält tas bort av schemana. Ägare och behörighet hämtas från verifierad token och databasraden, inte från ett användar-id som klienten skickar.

## Headers vi sätter (nginx)

client/security-headers.conf inkluderas i varje location i client/nginx.conf.template: /, /assets/, /api/ och /graphql.

Vi sätter Content-Security-Policy, X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Referrer-Policy och Permissions-Policy. server_tokens off döljer nginx-versionen.

CSP tillåter egna skript och blockerar inline-skript. Inline-stilar tillåts medvetet och behandlas som WARN i ZAP. API- och GraphQL-svar får Cache-Control: no-store. Hashade statiska assets får lång cachetid och public, immutable.

Headrarna är verifierade lokalt på /, en JavaScript-fil under /assets/ och /api/health. Staging ska verifieras efter merge.
## Skanning i pipelinen

Jobbet Säkerhet körs på pull requests och push till main:

- npm audit kontrollerar produktionsberoenden och stoppar vid high/critical.
- Trivy skannar repots produktionsberoenden, hemligheter och Dockerfiler.
- Docker Compose bygger och startar appen. API-processens uid verifieras som 1000.
- Trivy skannar API-imagen, inklusive operativsystemspaket och installerade npm-paket.
- ZAP baseline granskar den körande appens HTTP-svar via nginx.

Fynd och åtgärder:
- Drizzle uppdaterades och Vue Router byttes till 4.6.5. Produktionsauditen visar 0 sårbarheter.
- API:et fick USER node. nginx-klientens DS-0002-undantag motiveras i .trivyignore.
- Imageskanningen hittade 10 HIGH-fynd i npm:s medföljande beroenden. npm togs bort efter installation eftersom API:et startas med node.
- ZAP stoppade på 10020, 10021, 10036 och 10038. Säkerhetsheaders infördes i varje nginx-location och serverversionen doldes.
- ZAP-regler och motiveringar finns i .zap/rules.tsv. FAIL stoppar jobbet; WARN gör det inte eftersom -I används.

Bevis:
- PR: https://github.com/Thebeatkicks/DevVuers/pull/123
- Röd ZAP-körning före headerfix:
  https://github.com/Thebeatkicks/DevVuers/actions/runs/44176242701
- Grön PR-körning med samtliga fyra skanningar:
  https://github.com/Thebeatkicks/DevVuers/actions/runs/44177706237
- Säkerhet tog cirka 3 minuter i den gröna PR-körningen. Tid på main kompletteras efter merge.

Lokalt verifierades /, /api/health och en byggd JavaScript-fil under /assets/ med curl. Alla gav HTTP 200, CSP, nosniff, X-Frame-Options: DENY och Server: nginx utan versionsnummer. API-svaret hade no-store och asset-filen public, immutable.

## Kända brister (medvetet kvar)

- Ingen refresh-token: en omladdning loggar ut. En redan utfärdad JWT kan inte återkallas individuellt och gäller tills den löper ut efter en timme.
- Inloggningen saknar rate limiting och skydd mot upprepade lösenordsförsök.
- Säkerhetshändelser som nekad åtkomst och misslyckade inloggningar saknar komplett loggning och larmning.
- Utvecklingsberoenden har kvar audit-fynd. Produktionsauditen är ren; detta betyder inte att utvecklingsverktygen är fria från sårbarheter.
- DS-0002 ignoreras för nginx-klienten enligt motiveringen i .trivyignore. Eftersom undantaget gäller hela regel-id:t kontrollerar CI separat att API-processen kör med uid 1000.
- Inline-stilar tillåts i CSP. Inline-skript tillåts inte.
- Bilduppladdningen skickar metadata, inte bildens bytes, enligt M7:s avgränsning.
- Om bildfunktionen misslyckas kan en sparad fotorad bli kvar trots att API:et svarar 502.