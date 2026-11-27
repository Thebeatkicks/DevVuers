# Beslutsdokument: CMS

*Ett av teamets beslutsdokument. Skrivs i M9. Högst en sida. Ni ska inte utvärdera marknaden, ni ska kunna försvara valet: varför det här räcker för Utpost, vad ni valde bort, och vad som hade fått er att byta.*

**Datum:** 2026-11-20

**Beslut:** 

**CMS**: Contentful

**Innehåll som ska bo i CMS:et är:**
* guidens titel och slug
* beskrivning som rich text
* region
* svårighetsgrad samt längd
* guidens huvudbild
* publicieringstatus och utkast 
* redaktionens notiser. 

**Innehåll som ska bo i databasen är:**
* användare, roller och inloggning
* turer och vem som genomförde dem
* kopplingen mellan tur och guide
* användarnas uppladdade foton
* GPS-spår och mätpunkter
* Ett stabilt guide-ID som kopplar systemen

## Bakgrund
*Skuld 10: redaktionens innehåll låg som `body_html` i Postgres och sattes in med `v-html`. Redaktörerna mejlade ändringar till utvecklarna. Två meningar om vad det kostade, med ett exempel ur er egen kod.*
Redaktionens innehåll låg som body_html i Postgres (api/src/db/migrate.js) och accepterades som en rå HTML-sträng på upp till 50 000 tecken (bodyHtml i api/src/lib/schemas.js). Varje rättning krävde därför en utvecklare, eftersom redaktörerna mejlade ändringar, och HTML som sattes in med v-html var ett ställe där skript kunde smita in (M8, A05).

## Innehållsmodellen
*Era innehållstyper och fält. Fälten ska säga vad innehållet är, inte hur det ser ut.*

| Innehållstyp | Fält | Typ | Varför ett eget fält |
|---|---|---|---|
| | | | |

*Vad är innehåll och vad är data? Vilka fält ligger kvar i Postgres (till exempel längd och svårighetsgrad), och hur hittar API:et rätt post i CMS:et?*

## Alternativ
*Kursens val och ett alternativ ni valde bort. Det bortvalda ska vara ett riktigt alternativ: ett annat headless CMS, ett som ni driftar själva, eller Markdown i repot.*

| | Det vi valde | Det vi valde bort |
|---|---|---|
| Vad det är |Contentful, ett hostat headless CMS med GraphQL/REST-API. |Markdown-filer i repot, renderade av API:et eller vid bygget. |
| Vem kan redigera, och hur |Redaktörerna, i Contentfuls webbgränssnitt, utan git eller utvecklare. |Den som kan git: ändring, pull request och deploy. Redaktörerna skulle behöva lära sig det eller gå via oss. |
| Utkast och förhandsgranskning |Inbyggt: utkast, publicerat och ett preview-API (vi har previewNotices). |Utkast blir grenar eller filer med flagga. Förhandsgranskning kräver en egen bygge eller preview-miljö |
| Vad det kostar oss (pengar, drift, inlåsning) |Gratis nivå med tak (100 000 anrop/månad, sju skrivningar/s). Ingen drift. Inlåsning begränsad: bara api/src/cms/contentful.js vet om Contentful. Innehållet är beroende av Contentfuls tjänst |Gratis, ingen extern tjänst och ingen inlåsning, och innehållet versionshanteras. Kostnaden är redaktörernas tid och att varje publicering blir en deploy. |

## Motivering
*Varför räcker valet för Utpost just nu? Knyt till vem som redigerar och hur ofta.*
[Antal redaktörer, t.ex. "två–tre"] ändrar guider och notiser [några gånger i veckan], och ingen av dem kan koda. De behöver kunna rätta en text och se den live utan att vänta på oss, och det är det Contentful ger oss direkt. Gratisnivån räcker: med en minuts cache gör API:et högst ett anrop i minuten per innehållstyp, långt under 100 000 per månad. Att en publicering dröjer upp till en minut är acceptabelt för innehåll som ändras några gånger i veckan. Markdown i repot hade varit billigare, men det hade flyttat problemet (redaktörerna mejlar utvecklarna) från databasen till git.
## Vad som hade fått oss att byta
*En eller två konkreta saker: en gräns i gratisnivån, ett krav från redaktionen, en lansering i ett land till.*
Vi passerar anropstaket trots cachen, till exempel när trafiken växer eller när flera guider hämtas utan att cachas, och nästa nivå kostar mer än vi kan motivera.
Redaktionen behöver något gratisnivån saknar, som flera språk, godkännandesteg eller fler roller, eller så lanserar vi i ett land till.

## Konsekvenser
*Vad händer när CMS:et är nere? Hur länge dröjer en publicering innan den syns, och varför? Vad i koden måste skrivas om den dag ni byter CMS?*
