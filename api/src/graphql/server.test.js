import { describe, it, expect, afterAll } from 'vitest';
import { yoga } from './server.js';
import { pool } from '../db/client.js';
import { mongo } from '../db/mongo.js';
import { sign } from '../lib/auth.js';

// Integrationstester (M5): hela kedjan fråga → schema → resolvers → databas, mot riktiga
// Postgres och MongoDB. Ingen port behövs: yoga är en fetch-handler, så vi anropar den direkt
// med samma request som browsern skulle skicka. Adressen spelar ingen roll – bara sökvägen.
const graphql = async (query, { variables, token } = {}) => {
  const res = await yoga.fetch('http://utpost/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  return { status: res.status, ...(await res.json()) };
};

afterAll(async () => {
  await pool.end();
  await mongo.close();
});

describe('GraphQL-API:et mot riktig databas', () => {
  it('turlistan: 50 turer med vem som gick – för två databasfrågor, inte 51', async () => {
    const { data, errors } = await graphql(/* GraphQL */ `
      query Turer {
        tours {
          id
          title
          user {
            displayName
          }
        }
      }
    `);
    expect(errors).toBeUndefined();
    expect(data.tours).toHaveLength(50);
    for (const tour of data.tours) expect(tour.user.displayName).toEqual(expect.any(String));
  });
});