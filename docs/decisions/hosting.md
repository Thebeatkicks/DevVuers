# Beslutsdokument: hostingval

**Datum:** 3 november 2026
**Beslut:** Staging körs i Azure Container Apps Consumption i `swedencentral`. Produktionen är inte byggd ännu; den ska använda samma containerimages och deployflöde men hanterade, beständiga databaser, övervakning och minst en varm applikationsreplika.

## Bakgrund

Efter M5 har vi API- och klientimages i GitHub Container Registry (GHCR), taggade med commit-SHA, en pipeline som bygger dem och Docker Compose för lokal körning. M6 tillför en publik stagingmiljö, konfiguration från miljön, rotation av JWT-hemligheten och automatisk deploy vid merge till `main`.

Vi valde Container Apps eftersom vi kan köra de befintliga OCI-images och låta staging skala till noll mellan arbetspassen. Vi valde en enda Container App med fyra containrar för labbstaging; det håller topologin liten men gör databaserna tillfälliga och olämpliga för produktion.

## Vad vi faktiskt hyr

Staging ligger i prenumerationen `Betala per användning`, resursgruppen `utpost-henrik-martini-rg`, regionen `swedencentral`, Container Apps-miljön `utpost-env` och appen `utpost-staging`. Appen har extern HTTPS-ingress endast till klientens nginx på port 80. Klient, API och databaser delar nätverksnamnutrymmet och når varandra via localhost.

| Del | Tjänst | Nivå | Vem sköter uppdateringar/skalning | Vad det kostar oss i staging |
|---|---|---|---|---|
| Klient + API | Azure Container Apps Consumption; `client` 0,25 vCPU/0,5 GiB och `api` 0,5 vCPU/1 GiB per replica | PaaS/serverless containrar | Azure sköter värdarna och replica-skalningen. Vi bygger images och ansvarar för appen. | Debitering följer aktiv resursförbrukning och HTTP-anrop. `minReplicas: 0` ger ingen compute-debitering när appen är nedskalad till noll. Consumption-gratisallokeringen delas med övrig användning i prenumerationen. Faktisk debitering för perioden behöver läsas i Cost Analysis; den är inte hämtad ännu. |
| Postgres | `postgres:16` som sidecar i samma Container App; 0,5 vCPU/1 GiB; ingen beständig volym | Egen container på PaaS | Vi ansvarar för image, version, data och återställning. Azure sköter värden och replica-skalning. | Ingår i appens aktiva compute-förbrukning. Databasen blir tom när replikan stängs; startflödet seedar testdata. Ingen separat managed-databas debiteras i staging. |
| MongoDB | `mongo:8.2` som sidecar; 0,5 vCPU/1 GiB; ingen beständig volym | Egen container på PaaS | Vi ansvarar för image, version, data och återställning. Azure sköter värden och replica-skalning. | Ingår i appens aktiva compute-förbrukning. Mätpunkter migreras vid start. Ingen separat managed-databas debiteras i staging. |
| Images | GitHub Container Registry: `ghcr.io/thebeatkicks/devvuers-api` och `ghcr.io/thebeatkicks/devvuers-client`, publika paket med SHA-taggar | Registry/SaaS | GitHub lagrar images; vår Image-jobb bygger och publicerar dem. | Ingen Azure compute-kostnad. Lagring och överföring följer GitHub-kontots GHCR-kvoter; aktuell förbrukning har inte mätts här. |
| Deploy | GitHub Actions OIDC → Azure Container Apps | CI/CD/SaaS | GitHub kör workflowen; Azure tar emot uppdateringen. Ingen långlivad Azure-nyckel finns i GitHub. | Deploy-jobbet tog 1 min 23 sek i körning 41630187005. Faktisk eventuell Actions-debitering beror på GitHub-planens inkluderade minuter. |

Azure Container Apps Consumption debiterar aktiv resursförbrukning och HTTP-anrop; ingen compute debiteras när revisionen har noll replicas. Gratisallokeringen är gemensam för prenumerationen, så vi kan inte härleda vår faktiska månadsnota från YAML-filen ensam. [Azure Container Apps pricing](https://azure.microsoft.com/en-us/pricing/details/container-apps/) · [Azure Container Apps billing](https://learn.microsoft.com/en-us/azure/container-apps/billing)

## Alternativ vi jämförde

| Alternativ | Vad ändras i repot | Kostnad (staging) | För | Emot |
|---|---|---|---|---|
| Azure Container Apps Consumption (valt) | `infra/azure/*` beskriver app och identitet; Deploy-jobbet loggar in med Azure OIDC. Appkoden och OCI-images kan återanvändas. | Aktiv CPU/minne och HTTP-anrop; skalar till noll. Den gemensamma gratisallokeringen kan täcka låg användning, men faktisk kostnad måste kontrolleras i prenumerationen. | Kör befintliga images, skalar till noll, litet driftansvar och enkel image-baserad deploy. | Kallstart; sidecar-databaser utan volym tappar data vid vila; delad prenumerationskvot. |
| Azure App Service for Containers (Azure) | Samma images kan köras som separata klient- och API-appar; routing, miljövariabler och databasanslutningar konfigureras om. Databaser bör vara separata managed services. | Free-planen är begränsad och avsedd för försök. Dedikerade planer debiteras per plan/instans även om appen är stoppad; databas och nätverk tillkommer. Se Azure-prissidan för region och plan. | Färdig webbappplattform, TLS på standarddomänen och välkänd Azure-drift. | En dedikerad plan ger en återkommande grundkostnad och samma sidecar-/Compose-layout passar sämre. Gratisnivån har ingen SLA. |
| Cloud Run (Google Cloud) | Images kan köras som Cloud Run-tjänster; lägg till Google-inloggning/OIDC i Deploy och konfigurera miljövariabler. Använd managed Cloud SQL och en separat Mongo-kompatibel databas. | Pay-per-use med regionala priser och fria månadsnivåer; nätverk, registry/build och managed databaser kan kosta separat. | Serverless, kan skala till noll och kör OCI-images. Stockholm finns bland regionerna. | Databaserna kan inte behandlas som långlivade lokala sidecars; flera GCP-resurser och ett nytt deployjobb måste sättas upp. |
| Amazon ECS på Fargate (AWS) | Lägg till ECS task/service, task definition, ALB och AWS OIDC-role i stället för `infra/azure/*`; konfigurera managed databaser och secrets. Images kan återanvändas. | Debitering per sekund för taskens vCPU, minne och lagring; ALB, nätverk och managed databaser kostar separat. | Kör OCI-images utan att teamet patchar VM-värdar; många nätverks- och IAM-val för produktion. | Fler resurser och mer konfiguration/drift än vår labbstaging; ingen direkt motsvarighet till att köra hela vår nuvarande stack i en enda app utan att anpassa databaserna. |

Källor: [Azure App Service Linux pricing](https://azure.microsoft.com/en-us/pricing/details/app-service/linux/) · [Google Cloud Run pricing](https://cloud.google.com/run/pricing) · [AWS Fargate pricing](https://aws.amazon.com/fargate/pricing/). Priser varierar med region, trafik, databaser och kontoavtal; vi har inte gjort en full kostnadskalkyl för de alternativ vi inte kör.

## Staging och produktion är inte samma sak

I staging kör `client`, `api`, Postgres och MongoDB i en Container App. `API_UPSTREAM=localhost:4000` i Azure eftersom containrarna delar nätverksnamnutrymmet; i Compose används `api:4000`. Bara nginx är externt nåbar. `minReplicas: 0` och `maxReplicas: 1` håller kostnaden låg, men ger kallstart. Databaserna saknar volym: `SEED_ON_START=1` väntar på Postgres, seedar en tom databas och migrerar turernas mätpunkter till MongoDB vid kallstart. Det är testdata, inte beständig lagring.

Inför produktion skulle vi flytta Postgres till Azure Database for PostgreSQL Flexible Server och MongoDB till en managed MongoDB-tjänst efter kompatibilitets- och prisjämförelse. Vi behöver beständig lagring, automatiska och återläsningstestade backuper, övervakning/loggar, secret-rotation, egen domän/certifikat och minst en varm applikationsreplika om kallstart inte är acceptabel. Vi behöver också begränsa nätverksåtkomst till databaserna. API- och klientimages behöver inte byggas annorlunda: samma SHA-taggade images kan användas om databaser och miljövariabler byts genom plattformskonfigurationen.

## Inlåsning

Om Azure försvann i morgon skulle vi byta eller ta bort följande Azure-specifika delar:

- `infra/azure/staging.yaml` – Container App, ingress, sidecars, skalning och secrets.
- `infra/azure/skapa-staging.sh` – skapande av Azure stagingresurser.
- `infra/azure/identitet.sh` – Azure app registration, RBAC och federerad identitet.
- `.github/workflows/ci.yml` – Azure-login och `az containerapp update` i Deploy-jobbet.
- `docs/decisions/hosting.md` – hostingbeslut och konsekvenser.
- GitHub-miljön `azure-staging` och dess sex `AZURE_*`-variabler finns i GitHub-inställningarna, inte i repo-filer, men måste ersättas vid plattformsbyte.

API-/klientkoden, Dockerfiles, `GIT_SHA`, publika OCI-images och lokal Compose-konfiguration är plattformsneutrala. `API_UPSTREAM` kommer från miljön; värdet är `api:4000` i Compose och `localhost:4000` i Azure. Ett nytt plattformsflöde behöver fortfarande bygga och köra samma images samt mata in samma konfigurationsnamn.

## Konsekvenser

- **Kallstart:** `minReplicas: 0` innebär att första anropet efter vila kan vänta medan fyra containrar startar och databasen seedas. Skapa-skriptet anger ungefär en minut som planeringsvärde. Vår första lyckade health-kontroll mätte 0,066 sekunder efter att appen redan var igång; den är därför inte ett kallstartsmått. En kontrollerad tid från noll replicas behöver fortfarande mätas och fyllas i här.
- **Data:** varje kallstart ger tomma testdatabaser och ny seeddata. Detta är avsiktligt för staging och olämpligt för produktion.
- **Kostnad:** noll replicas tar bort Container Apps compute-debitering när appen är nedskalad. Aktiv användning dras från en Consumption-gratisallokering som delas med prenumerationen. Log Analytics är avstängt (`--logs-destination none`). Faktisk kostnad/kvotförbrukning ska hämtas från Cost Analysis, inte gissas från appens konfiguration.
- **Hemligheter:** `skapa-staging.sh` skapar ett slumpvärde för JWT och databaslösenord med `openssl rand` och skickar dem till Container Apps secrets (`jwt-secret`, `db-password`). Värdena skrivs inte till repo-filer. GitHub-miljön har sex icke-hemliga Azure-ID-/konfigurationsvariabler och inga secrets. Lokalt används en ny utvecklingsnyckel från rotens `.env.example` i en gitignorerad `api/.env`; den får inte användas i molnet.
- **Åtkomst:** Deploy-principalen har Contributor på resursgruppen, inte prenumerationen. Teamets portalåtkomst och faktisk quota-/kostnadsfördelning beror på prenumerationsägaren och måste kontrolleras i Azure IAM/Cost Analysis.

**Skrivet av:** Utpost-teamet
