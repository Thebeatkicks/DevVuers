# Teststrategi för Utpost

Detta är ett förslag som gruppen ska besluta om nästa gång vi ses. 

## Beslut och bakgrund


Vi prioriterar automatiserade tester för beräkningar, användarbeteenden och API:ets data och behörighet. 

Utpost har en Vue-klient, en React-klient och ett Express-API med Postgres. 
Vi bygger främst tester för Vue-klienten och backend. React-klienten ska fasas ut.

## Nivåer och testkarta

Vi använder Vitest för enhetstester och Vue Testing Library för komponenttester utifrån vad användaren ser och gör. 

Nästa nivå är att testa API och Databas. Samt end to end tester. 

## Testkarta 
Här ser du vilka tester vi har samt vilka tester vi eventuellt planerar att göra. 

| Kod | Vad testas? | Nivå och testplats | Status |
| --- | --- | --- | --- |
| `client/src/lib/tours.ts` | Stigningar, tom lista och saknade höjder | Enhet: `client/src/lib/tours.test.ts` | Finns, 3 testfall |
| `client/src/views/GuidesView.vue` | Guidelista, sökning, inga träffar och API-fel | Komponent: `client/src/views/GuidesView.test.ts` | Finns, 4 testfall |
| `api/src/config.js` | JWT-hemlighet från miljön; saknad hemlighet ger fel | Enhet: `api/src/config.test.js` | Finns, 2 testfall |
| `client/src/views/TourDetail.vue` | Saknad höjd hoppas över, saknad höjd/puls visas som streck och HTTP 500 ger felmeddelande | Komponent: `client/src/views/TourDetail.test.ts` | Finns, 2 testfall |
| `client/src/views/ToursView.vue` | Turuppgifter, detaljlänk och fel vid nätverksproblem | Komponent: `client/src/views/ToursView.test.ts` | Finns på `test/ToursView`, ännu inte mergat |
| `client/src/api.ts` | GET/POST, JSON och fel vid HTTP-fel | Enhet, bredvid modulen | Planerat |
| `client/src/stores/session.ts` | Inloggning, fel, laddningsstatus och utloggning | Enhet, bredvid store | Planerat |
| `client/src/views/LoginView.vue` | Formulärdata och navigering efter lyckad inloggning | Komponent, bredvid vyn | Planerat |
| `api/src/lib/auth.js` | Giltig token godtas; saknad eller ogiltig token ger 401 | Enhet, bredvid modulen | Planerat |
| `api/src/routes/tours.js` | Turdetaljer, 404 och skapande med rätt användare | API-integration, separat testdatabas | Planerat |
| `api/src/routes/guides.ts` | Sökning och guidehämtning, inklusive saknad slug | API-integration, separat testdatabas | Planerat |

Nuläget är 4 testfiler med 11 testfall på denna branch och `main`. De 2 testfallen för `ToursView` räknas först in efter merge. Kartan uppdateras när tester tillkommer eller deras omfattning ändras.

## Regler

- **Merge:** CI-jobben *Kvalitet* och *Bygg* ska vara gröna, branchen uppdaterad mot `main` och PR:en godkänd av minst en annan teammedlem. CI kör lint och formatkontroll för `client`, tester för `client` och `api`, typkontroll för `shared` och `api` samt bygge av `web` och `client`. Ändrat beteende ska ha relevanta tester eller en motiverad, dokumenterad manuell kontroll.
- **Buggfix:** Lägg till ett regressionstest som återskapar felet, misslyckas före fixen och lyckas efteråt. Välj den lägsta nivå som fångar felet. 
- **API-mockning:** Komponenttester mockar API-modulen med `vi.mock`, som i `GuidesView.test.ts`. Vyer med direkta `fetch`-anrop mockar `fetch` med `vi.stubGlobal`, som i `TourDetail.test.ts`. Använd fasta testdata, återställ mockar mellan tester och kontrollera relevanta lyckade svar och fel. API-integrationstester ska använda riktig testdatabas med isolerade testdata för att också fånga SQL-fel.
- **Täckning:** Målet är att täcka så mycket av projektet som möjligt men med fokus på att nå de mål som är uppsatta i uppgiften. 

## Vad vi medvetet inte testar

Vi testar inte bibliotek. Gör inga pixeljämförelser eller belastningstester. Manuella tester görs på flöden tills vi har uppgift att skapa end-to-end tester. 

## Alternativ vi jämförde

Enbart manuella tester kräver mindre startarbete men ger svagt regressionsskydd. Att automatisera allt genom webbläsaren täcker hela flöden men kräver mer underhåll. Vi väljer främst enhets- och komponenttester, kompletterade med API-integration och manuella flödeskontroller.

## Konsekvenser

Vi får snabb återkoppling, men mockade klienttester bevisar inte att klient, API och databas fungerar tillsammans. API-integration och inloggningstester är kvarvarande arbete. `TourDetail.vue` använder nu den testade funktionen `elevationGain`; komponenttestet kontrollerar dessutom att resultatet visas korrekt. 
