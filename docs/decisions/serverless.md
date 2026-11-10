# Beslutsdokument: serverless

**Datum:** 09-11-2026
**Beslut:** *(en eller två meningar: vad flyttade ni ut ur API:et, vart, och med vilket verktyg skapas och deployas det?)*

## Bakgrund
I detta moment löser vi Skuld 8: bilduppladdningen skalade om bilder i request-tråden – "timeouts vid last". Vi ska undersöka vad `POST /api/photos` gjorde före M7 (`resize`, fyra storlekar, signatur), och varför det drabbade alla andra anrop och inte bara uppladdningen.

## Alternativ vi jämförde
Vi jämförde Serverless Framework, Azure Functions Core Tools ihop med Azure CLI och AWS Lambda med SAM. 

Serverless Framework beskriver funktioner, triggers och resurser i en serverless.yml och deployas med sls deploy. Verktyget erbjuder en gratis plan för små organisationer men kräver licens och medför en molnkostand för större. Det har enkel YAML-syntax, ett stort ekosystem och fungerar bra mot AWS. Däremot fungerar inte v4 mot Azure och v3 med dess community-plugin för Azure underhålls inte längre. Det hade passat om vi kört AWS Lambda och velat ha en enkel, gemensam konfiguration för många funktioner.

Azure Functions Core Tools med Azure CLI är Microsofts egna verktyg. Det ger officiellt stöd, bra lokal utveckling med func start och en förbrukningsplan där de första miljonerna anrop per månad är gratis. Nackdelen är att deployen blir mer manuell och skriptad, och att vi blir låsta till Azure.

AWS Lambda med SAM är en mogen plattform med bra integrationer, och SAM kräver mindre manuellt underhåll än Azure-alternativet. Det kräver dock ett AWS-konto och en migrering av vår nuvarande setup.

| Alternativ | Vad ändras i repot | Kostnad | För | Emot |
|---|---|---|---|---|
| Serverless Framework | `serverless.yml`, `sls deploy` | Gratis för små organisationer, licens för större, plus molnkostnad | Enkel YAML, stort ekosystem, bra mot AWS | v4 fungerar inte mot Azure, v3 underhålls inte, licenskrav |
| Azure Functions Core Tools + Azure CLI | `host.json`, funktionsdefinitioner, deploy-skript med `az` | Förbrukningsplan, första miljonen anrop per månad gratis | Officiellt stöd, bra lokal utveckling, vi är redan på Azure | Låser oss till Azure, mer manuell deploy |
| AWS Lambda + SAM | `template.yaml`, handler-kod | Första miljonen anrop per månad gratis | Mogen plattform, bra integrationer, mindre manuellt underhåll | Kräver AWS-konto och migrering |

## Motivering

Vi valde Azure Functions Core Tools med Azure CLI. Främst för att vår container app redan ligger i Azure, och för att Azure är den resurs som i dagsläget finns tillgänglig för oss. Det gav minst friktion. Priset är att vi blir låsta till Azure.

AWS Lambda med SAM hade varit ett minst lika bra alternativ. Det har bra integrationer och kräver mindre manuellt underhåll än Azure Functions. Det hade dock inneburit att vi behövde skaffa och sätta upp ett AWS-konto.

## Mätning före/efter
Mätningarna kördes 2026-11-09 lokalt på samma dator, med samma antal uppladdningar och samma bildstorlek före och efter. Kommandot var `node scripts/mat-upload.mjs --n 10 --size 4000x3000` (alternativt `npm run mat -- --n 10`). Skriptet skickar 10 samtidiga uppladdningar à 4000x3000 och anropar health var 100:e ms under tiden.

Vi valde N = 10 eftersom det är skriptets standard och räcker för att tydligt skilja före från efter. Om skillnaden hade varit otydlig hade vi kört om båda mätningarna med `--n 20`.

| Mätning | Uppladdning p50 | Uppladdning max | Health p50 | Health max | Total tid |
|---|---|---|---|---|---|
| Före, lokalt (N = 10) | 970 ms | 972 ms | 388 ms | 819 ms | 976 ms |
| Efter, lokalt (N = 10) | 1216 ms | 1222 ms | 6 ms | 19 ms | 1228 ms |
| Efter, staging (N = ) | | | | | |

### Tolkning

Health under last gick från p50 388 ms / max 819 ms till p50 6 ms / max 19 ms. Före ändringen blockerade bildarbetet API:ets enda tråd så health-anropen fick vänta in uppladdningarna. Nu körs bildarbetet i funktionen, en separat process, och API:et väntar bara på svaret (I/O). Tråden är ledig.

Uppladdningen blev inte snabbare: p50 gick från 970 ms till 1216 ms (ca 25 % långsammare). Själva bildarbetet är lika snabbt (processingMs p50 59 ms mot 64 ms). 
Merkostnaden är det extra nätverkssteget till funktionen och att funktionen är en process som hanterar de tio samtidiga anropen, plus en kallstart i första svaret. apiMs (1191 ms) visar att nästan hela uppladdningstiden ligger i API:ets anrop, alltså databasen och väntan på funktionen.

Flyttningen gör alltså uppladdningen något långsammare men skyddar resten av API:et. Det är
det som var problemet i skuld 8 ("timeouts vid last").

Raden sparas i databasen innan funktionen anropas. Om funktionen är nere får klienten 502, men raden finns kvar utan varianter. Det är ett medvetet val i uppgiften men något att hantera senare (t.ex. omförsök eller städning).

## Kallstart
För att kontrollera vad kallstarten kan innebära för projektet genomfördes två anrop efter en 20 minuters paus. Detta gjordes för att vi skulle få en tydligare bild kring vad det skulle kosta. Andra anropet genomfördes direkt efter det första. 

| Anrop | Tid (curl) | `processingMs` | `coldStart` | `instance` |
|---|---|---|---|---|
| Första efter paus (20 min) | 1,01 s | 80 ms | true | 3--22aba31d-3212-43b9-b332-a108bedab9b9 |
| Andra | 0,35 s | 81 ms | false | 3--22aba31d-3212-43b9-b332-a108bedab9b |

*Duger det för en bilduppladdning? Vad skulle ni göra om det inte dög (always-ready, mindre paket, varmhållning – och vad kostar det)?*

## Var koden bor och vad som låser
*Vad är portabelt och vad är det inte? `functions/src/image.js` vet ingenting om Azure. `process-image.js` (`app.http`, `@azure/functions`), `host.json`, `local.settings.json`, `skapa-funktion.sh` och deploysteget i `ci.yml` är Azure. Om ni flyttade till AWS Lambda eller Cloud Run functions i morgon: vilka filer skrivs om, och vilka följer med oförändrade?*

## Konsekvenser
*Vad kostar valet? Pris per körning och per GB-s, gratiskvoten, vad always-ready kostar per timme. Funktionsnyckeln: var finns den (Azure, staging-appens secret – aldrig i repot eller GitHub), hur roteras den? Två deployjobb i stället för ett. Vem i teamet har tillgång till function-appen i portalen?*

**Skrivet av:**