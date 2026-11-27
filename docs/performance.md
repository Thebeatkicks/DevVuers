# Prestanda

*Skrivs i M10. Siffrorna kommer ur `npm run perf`: Lighthouse mot den körande appen, som en mobil på långsamt 4G. En mätning per rad, avrundad. Ni ska kunna säga vad ni ändrade, vilken siffra det flyttade och hur mycket – inte mäta samma sak fem gånger.*

## Före

*Klistra in tabellen från `npm run perf -- --fore`, körd innan ni ändrade något. Filen `perf-fore.json` committas.*

| Sida | LCP | CLS | JavaScript | Bilder | Totalt |
|---|---|---|---|---|---|
| Startsidan | 2,1 s | 0,18 | 148 kB | 0 kB | 163 kB |
| En guide | 2,4 s | 0 | 150 kB | 0 kB | 163 kB |
| En tur | 0,8 s | 0 | 148 kB | 0 kB | 159 kB |

**Vad som är LCP-elementet på startsidan:** *(DevTools → Performance → Local metrics)*

## Optimeringarna

*Minst tre. En rad per ändring, mätt direkt efter den. "Siffran" är den ni ville flytta, inte alla.*

| # | Vad vi ändrade | Siffran vi ville flytta | Före | Efter | PR |
|---|---|---|---|---|---|
| 1 | Lagt populära guider i en egen komponent | CLS | 0,18 | 0,18 | RÖTT |
| 2 | Lade till gzip i nginx | JavaScript och totalvikten | 148-150 kb & 159-163 kb | 62-63 kb & 70-73 kb | RÖTT |
| 3 | Lade en min-height för notiserna som visas på home | CLS | 0,18 | 0,05 | RÖTT |

## Efter

*Tabellen från den sista `npm run perf`, med procenten mot före-värdet.*

## Budgeten

*Vad som står i `lighthouserc.json` under `assert`, i ord: vilka gränser, och varför just de. Vilka är `error` (stoppar en merge) och vilka är `warn`? Länk till en pipelinekörning där budgeten sa nej.*

## Det vi lät vara

*En eller två saker ni såg men inte lagade, och varför. En flaskhals man känner till och har valt att leva med är också ett beslut.*
