import { cacheExchange, fetchExchange, type ClientOptions } from "@urql/vue";
import { getToken } from "./lib/token";

// Samma adress som nginx och Vites proxy skickar vidare till API:et.
// POST som den gamla gql()-funktionen, så att frågan ligger i bodyn och inte i URL:en.
export const urqlOptions: ClientOptions = {
  url: "/graphql",
  exchanges: [cacheExchange, fetchExchange],
  preferGetMethod: false,
  fetchOptions: (): RequestInit => {
    const token = getToken();
    return { headers: token ? { Authorization: `Bearer ${token}` } : {} };
  },
};
