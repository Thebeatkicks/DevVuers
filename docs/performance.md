# Prestanda

*Skrivs i M10. Siffrorna kommer ur `npm run perf`: Lighthouse mot den körande appen, som en mobil på långsamt 4G. En mätning per rad, avrundad. Ni ska kunna säga vad ni ändrade, vilken siffra det flyttade och hur mycket – inte mäta samma sak fem gånger.*

## Före

*Klistra in tabellen från `npm run perf -- --fore`, körd innan ni ändrade något. Filen `perf-fore.json` committas.*

| Sida | LCP | CLS | JavaScript | Bilder | Totalt |
|---|---|---|---|---|---|
| Startsidan | 2,9 s | 0,13 | 210 kB | 5261 kB | 5507 kB |
| En guide | 8 s | 0,16 | 208 kB | 1099 kB | 1319 kB |
| En tur | 3,7 s | 0 | 334 kB | 0 kB | 350 kB |

**Vad som är LCP-elementet på startsidan:** *(DevTools → Performance → Local metrics)*

## Optimeringarna

*Minst tre. En rad per ändring, mätt direkt efter den. "Siffran" är den ni ville flytta, inte alla.*

| # | Vad vi ändrade | Siffran vi ville flytta | Före | Efter | PR |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

## Efter

*Tabellen från den sista `npm run perf`, med procenten mot före-värdet.*

## Budgeten

*Vad som står i `lighthouserc.json` under `assert`, i ord: vilka gränser, och varför just de. Vilka är `error` (stoppar en merge) och vilka är `warn`? Länk till en pipelinekörning där budgeten sa nej.*

## Det vi lät vara

*En eller två saker ni såg men inte lagade, och varför. En flaskhals man känner till och har valt att leva med är också ett beslut.*
