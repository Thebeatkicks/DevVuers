# Beslutsdokument: serverless

**Datum:** 2026-11-10
**Beslut:** Vi flyttade bildbearbetningen (resize till fyra storlekar och signatur) från API:et till en Azure Function (`process-image`) i Flex Consumption. Funktionen skapas med `skapa-funktion.sh` (Azure CLI och Core Tools) och uppdateras via CI.

## Bakgrund
I detta moment löser vi Skuld 8: bilduppladdningen skalade om bilder i request-tråden – "timeouts vid last". Vi ska undersöka vad `POST /api/photos` gjorde före M7 (`resize`, fyra storlekar, signatur), och varför det drabbade alla andra anrop och inte bara uppladdningen.

## Alternativ vi jämförde
Vi jämförde Serverless Framework, Azure Functions Core Tools ihop med Azure CLI och AWS Lambda med SAM.

Serverless Framework beskriver funktioner, triggers och resurser i en `serverless.yml` och deployas med `sls deploy`. Det har enkel YAML-syntax, ett stort ekosystem och fungerar bra mot AWS. Licensvillkoren (gratis för små organisationer, licens för större) och molnkostnaden tillkommer. Däremot fungerar inte v4 mot Azure, och v3 med community-pluginet för Azure underhålls inte längre. Det hade passat om vi kört AWS Lambda och velat ha en enkel, gemensam konfiguration för många funktioner.

Azure Functions Core Tools med Azure CLI är Microsofts egna verktyg. Det ger officiellt stöd och bra lokal utveckling med `func start`. Nackdelen är att deployen blir mer manuell och skriptad, och att vi blir låsta till Azure. Vi kör Flex Consumption (se Konsekvenser för pris).

AWS Lambda med SAM är en mogen plattform med bra integrationer, och SAM kräver mindre manuellt underhåll än Azure-alternativet. Det kräver dock ett AWS-konto och en migrering av vår nuvarande setup.

| Alternativ | Vad ändras i repot | Kostnad | För | Emot |
|---|---|---|---|---|
| Serverless Framework | `serverless.yml`, `sls deploy` | Gratis under 2 M USD i årsintäkt, därefter credits (4 USD/credit, ner till 1 USD med rabatt). Molnkostnad tillkommer. | Enkel YAML, stort ekosystem, bra mot AWS | v4 fungerar inte mot Azure, v3 underhålls inte |
| Azure Functions Core Tools + Azure CLI | `host.json`, funktionsdefinitioner, deploy-skript med `az` | Flex Consumption: gratis 250 000 körningar och 100 000 GB-s/mån. Priset därefter hittade vi inget tydligt svar på för Sweden Central. Sekundärkällor anger ca 0,000026 USD/GB-s och 0,40 USD/miljon körningar (region oklar). | Officiellt stöd, bra lokal utveckling, vi är redan på Azure | Låser oss till Azure, mer manuell deploy |
| AWS Lambda + SAM | `template.yaml`, handler-kod | Gratis 1 M requests och 400 000 GB-s/mån, därefter 0,20 USD/miljon requests och ca 0,0000167 USD/GB-s (x86, US East) | Mogen plattform, bra integrationer, mindre manuellt underhåll | Kräver AWS-konto och migrering |

## Motivering

Vi valde Azure Functions Core Tools med Azure CLI. Främst för att vår container app redan ligger i Azure och för att Azure är den molnresurs som finns tillgänglig för oss. Det gav minst friktion: funktionen kan köras lokalt med `func start`, skapas med ett skript (`skapa-funktion.sh`) och kopplas direkt till staging-appen. Priset är att vi blir låsta till Azure.

Serverless Framework föll bort av ett konkret skäl: verktyget fungerar inte mot Azure i v4, och pluginet för v3 underhålls inte längre.

AWS Lambda med SAM hade varit ett minst lika bra alternativ. Det har bra integrationer och kräver mindre manuellt underhåll än Azure Functions. Det hade dock inneburit att vi behövde skaffa och sätta upp ett AWS-konto och migrera vår nuvarande setup.

## Mätning före/efter

Lokalmätningarna kördes 2026-11-09 på en dator, med samma antal uppladdningar och samma bildstorlek före och efter. Staging-mätningarna kördes 2026-11-10 från samma dator mot staging i Sweden Central. Kommandot var `node scripts/mat-upload.mjs --n 10 --size 4000x3000` (för staging med `--api <staging-adress>`). Skriptet skickar 10 samtidiga uppladdningar à 4000x3000 och anropar health var 100:e ms under tiden.

Vi valde N = 10 eftersom det är skriptets standard och räcker för att tydligt skilja före från efter. Om skillnaden hade varit otydlig hade vi kört om båda mätningarna med `--n 20`.

| Mätning | Uppladdning p50 | Uppladdning max | Health p50 | Health max | Total tid |
|---|---|---|---|---|---|
| Före, lokalt (bildarbetet i API:ets tråd) | 970 ms | 972 ms | 388 ms | 819 ms | 976 ms |
| Efter, lokalt (körning 1, 1 kallstart) | 1216 ms | 1222 ms | 6 ms | 19 ms | 1228 ms |
| Efter, lokalt (körning 2, varm) | 1400 ms | 1413 ms | 9 ms | 23 ms | 1418 ms |
| Efter, staging (körning 1, 7 kallstarter) | 1149 ms | 1369 ms | 31 ms | 129 ms | 1387 ms |
| Efter, staging (körning 2, 8 kallstarter) | 1061 ms | 1210 ms | 32 ms | 75 ms | 1217 ms |
| Efter, staging (körning 3, 1 kallstart) | 297 ms | 503 ms | 30 ms | 47 ms | 510 ms |

**Lokalt:** `processingMs` p50 var 64 ms före och 59 ms efter (körning 2: 91 ms). `apiMs` efter: 1191 / 1346 ms (p50 / max).

**Staging:** `processingMs` p50 var 80 / 76 / 86 ms. `apiMs` p50 / max: 982 / 1199, 900 / 1016 och 157 / 341 ms.

Körning 1 används som huvudsiffra. Körning 2 redovisas som variation och är inte vald för att den ser bäst ut. Lokalt blev den varma körningen långsammare än körning 1 (1400 mot 1216 ms), vilket tyder på brus i den lokala miljön och inte på en verklig kallstartseffekt. I staging följde körning 2 direkt efter körning 1 men innehöll ändå 8 kallstarter. Körning 3 gjordes när funktionen hade värmts upp av de två första och visar bästa fallet, inte vad en användare normalt får.

**Förbehåll**
- Staging mättes från Kista mot Sweden Central. Nätverket ingår i uppladdnings- och health-tiderna men inte i `processingMs`. Health går dessutom via nginx i staging.
- Ingen "före"-mätning mot staging: `main` saknade ändringen och svarade med 502. Staging jämförs därför mot de lokala raderna, och miljöerna skiljer sig åt (lokal dator mot Azure), så jämförelsen är inte exakt.
- Staging delas med teamet. Varje körning la 10 rader i databasen.
- De många kallstarterna under burst-lasten förklarar vi med att flera instanser startade parallellt. Det är en hypotes, eftersom antalet unika `instance`-id inte räknades.


### Tolkning

**Health:** lokalt gick p50 från 388 ms (max 819 ms) till 6 ms (max 19 ms). Före ändringen blockerade bildarbetet API:ets enda tråd, så health-anropen fick vänta in uppladdningarna. Nu väntar API:et bara på funktionens svar (I/O) och tråden är ledig. I staging låg health på cirka 30 ms i alla tre körningarna.

**Uppladdning:** lokalt blev den ungefär 25 % långsammare (p50 970 mot 1216 ms). Bildarbetet är lika snabbt (processingMs 59 mot 64 ms), så merkostnaden är nätverkssteget till funktionen. I staging avgjorde kallstarterna: cirka 1,1 s med 7 till 8 kallstarter mot 297 ms när funktionen var varm. Körning 3 är bästa fallet, inte det normala.

**Slutsats:** flytten gör uppladdningen något långsammare men skyddar resten av API:et, vilket var problemet i skuld 8 ("timeouts vid last").

**Risk:** raden sparas i databasen före funktionsanropet. Är funktionen nere får klienten 502 och raden blir kvar utan varianter. Det är ett medvetet val i uppgiften, men något att hantera senare (omförsök eller städning).

## Kallstart
Två anrop direkt mot funktionen (inte via API:et) 2026-11-10. Det första gjordes efter minst 20 minuters paus utan anrop, det andra direkt efter.

| Anrop | Tid (curl) | `processingMs` | `coldStart` | `instance` |
|---|---|---|---|---|
| Första efter paus (20 min) | 1,01 s | 80 ms | true | 3--22aba31d-3212-43b9-b332-a108bedab9b9 |
| Andra, direkt efter | 0,35 s | 81 ms | false | 3--22aba31d-3212-43b9-b332-a108bedab9b9 |

### Tolkning

Bildarbetet påverkas inte av kallstarten (80 mot 81 ms). Kallstarten kostade ungefär ca 0,7 s extra (1,01 minus 0,35 s). Nätverk och TLS från Kista ingår i båda anropen och tar i stort sett ut varandra. Det är ett enda par mätningar, så siffran är en grov uppskattning. Ett tidigare anrop utan dokumenterad paus gav också cirka 1,0 s (1,04 s), så i båda fallen blev det cirka en sekund.

### Duger det för en bilduppladdning?

**Ja, för vår belastning.** En kallstart lade ungefär 0,7 s på en uppladdning (1,01 mot 0,35 s direkt mot funktionen). Bildarbetet i sig tog cirka 80 ms. En användare som laddar upp en bild märker en kallstart som en något långsammare uppladdning, inte som ett fel, och funktionen skyddar API:ets tråd (health låg på cirka 30 ms under last). Vi hade bara haft anledning att ändra på det om kravet var jämn svarstid, eller om många laddar upp samtidigt efter en paus: i staging gav tio samtidiga anrop mot en vilande funktion 7 till 8 kallstarter, och uppladdningen låg då kring 1,1 s.

**Om det inte dög:**

| Åtgärd | Effekt | Kostnad |
|---|---|---|
| Always-ready (1 instans) | Tar bort kallstarten för de första samtidiga anropen. Fler samtidiga anrop än instansen klarar skapar fortfarande nya instanser. | Betalas även när ingen laddar upp, ingen gratiskvot. Se uppskattning nedan. |
| Mindre paket | Kortare uppstart. Deploypaketet tar med `functions/node_modules`, så rensa bort det som inte behövs. | Ingen extra kostnad, men mätning krävs för att veta hur mycket det hjälper. |
| Varmhållning (timer-anrop var några minuter) | Håller en instans varm mellan uppladdningar. | Några tusen extra exekveringar per månad, väl inom gratiskvoten. Hjälper inte vid parallella anrop som kräver flera instanser. |
| Kö (API:et svarar direkt, funktionen bearbetar efteråt) | Uppladdningen blir snabb oavsett kallstart. | Kräver ändrat API-kontrakt och en kö-resurs (kostnad ej undersökt). |

**Kostnad vid vår belastning (uppskattning, gäller på Flex Consumption):**
- Gratiskvoten är 250 000 exekveringar och 100 000 GB-s per månad. Med ett antaget instansminne på 2 GB och cirka 80 ms per uppladdning blir förbrukningen ungefär 0,16 GB-s per uppladdning. Exekveringskvoten (250 000 uppladdningar per månad) tar då slut före GB-s-kvoten. Faktisk fakturerad tid kan vara längre än `processingMs`, så detta är en grov uppskattning.
- En always-ready-instans med 2 GB betalas för 2 GB × 2 592 000 s ≈ 5,2 miljoner GB-s per 30-dagarsmånad i baslinjeavgift. Vi hittade inget tydligt pris för Sweden Central (Microsofts prissida visade inga siffror). Sekundärkällor anger ca 0,000004 USD per GB-s, vilket ger 5,2 miljoner × 0,000004 ≈ 21 USD per månad, eller ca 0,03 USD per timme, som en grov uppskattning. Körtid och körningar debiteras utöver detta.
- Reservation: om Azure debiterar minst 1 s per körning (källorna är oeniga, Microsoft anger 100 ms) blir förbrukningen ca 2 GB-s per uppladdning. Då tar GB-s-kvoten slut vid ca 50 000 uppladdningar per månad i stället för 250 000.

## Var koden bor och vad som låser

Bildlogiken i `functions/src/image.js` vet ingenting om Azure och följer med oförändrad till vilken plattform som helst. Allt som pratar med Azure är det som måste skrivas om:

| Fil | Azure-specifikt? | Vid flytt till AWS Lambda eller Cloud Run functions |
|---|---|---|
| `functions/src/image.js` | Nej | Följer med oförändrad |
| `functions/src/process-image.js` (`app.http`, `@azure/functions`) | Ja | Skrivs om: ny handler, ny request/response-hantering. Anropar fortfarande `image.js`. |
| `host.json`, `local.settings.json` | Ja | Tas bort, ersätts av `template.yaml` (SAM) eller motsvarande |
| `skapa-funktion.sh` (Azure CLI, Core Tools) | Ja | Skrivs om helt |
| Deploysteget i `ci.yml` | Ja | Skrivs om (ny autentisering, nytt deploykommando) |
| API:ets anrop till funktionen (adress och funktionsnyckel i header) | Delvis | Ny adress och ny autentisering. Anropslogiken kan finnas kvar. |

Låsningen sitter alltså i ett tunt skal runt en portabel kärna, inte i bildlogiken. Det som tar tid vid en flytt är deploy och autentisering, inte koden.

## Konsekvenser

### Kostnad
Vid vår belastning räknar vi med att ligga inom gratiskvoten (250 000 körningar och 100 000 GB-s per månad, delat över alla function-appar i prenumerationen). Därefter debiteras per GB-s och per miljon körningar. Vi hittade inget tydligt pris för Sweden Central, och siffrorna vi har (ca 0,000026 USD per GB-s och 0,40 USD per miljon körningar) kommer från sekundärkällor där regionen är oklar. Även med dem blir det en bråkdel av en cent per uppladdning. Always-ready (en instans à 2 GB) skulle enligt samma grova uppskattning kosta ca 21 USD per månad, eller ca 0,03 USD per timme, utan gratiskvot. Vi har inte valt det, eftersom kallstarten på ca 0,7 s duger för en uppladdning.

### Funktionsnyckeln
Nyckeln finns i Azure och som secret i staging-appen, aldrig i repot eller i GitHub. Den roteras genom att en ny nyckel skapas i Azure (portalen eller `az functionapp keys`), att secreten i appen uppdateras och att den gamla nyckeln sedan tas bort. Henrik ansvarar för detta och det kommer ske mellan var 30:e till 90:e dag.

### Deploy 
Vi får två deployjobb i stället för ett: ett för API:et och ett för funktionen. Funktionen kan alltså vara på en annan version än API:et under en kort period, så ändringar i anropsformatet måste vara bakåtkompatibla eller deployas i rätt ordning.

### Åtkomst
- Henrik: Owner
- Sheyma: Contributor

(Yasmin och Ella kommer också tilldelas Contributor)

**Skrivet av:** Sheyma, Yasmin, Ella och Henrik
**Signerat av:** Sheyma

