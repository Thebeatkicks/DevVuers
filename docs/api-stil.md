## Bakgrund och mätning

Vi jämförde turlistan via REST och GraphQL mot samma seedade
databas, med 50 turer. Byte avser hela JSON-svarets kropp.

| Variant | HTTP-anrop | Svarsbyte | Databasfrågor |
|---|---:|---:|---:|
| REST ('api/tours') | 1 | 290 225 | 185 |
| GraphQL (`Tours`) | 1 | 7 275 | 135 |


För turlistans 50 turer minskade GraphQL svarskroppen från 290 225 till 7 275 byte, cirka 97,5 %. Antalet databasfrågor minskade från 185 till 135 eftersom mätpunkterna inte hämtas. Båda alternativen använder ett HTTP-anrop.