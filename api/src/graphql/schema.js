// GraphQL-schemat för Utpost, v1 (M4). Det här ÄR kontraktet: allt en klient kan fråga efter
// står här, med typer. Fälten heter som klienten vill ha dem (camelCase) – inte som kolumnerna
// i Postgres. Översättningen görs i resolvers.js.
export const typeDefs = /* GraphQL */ `
  type Guide {
    id: ID!
    slug: String!
    title: String!
    region: String!
    difficulty: String!
    lengthKm: Float!
    bodyHtml: String!
    body: [Paragraph!]!
    heroImage: String
    published: Boolean!
    updatedAt: String!
    notices: [Notice!]!
  }

  type User {
    id: ID!
    displayName: String!
  }

  type TextRun {
    text: String!
    bold: Boolean!
    italic: Boolean!
    href: String
  }
  type Paragraph {
    kind: String
    runs: [TextRun!]!
  }
  type Notice {
    id: ID!
    title: String!
    level: String!
    body: [Paragraph!]!
    guideSlug: String
    status: String!
  }

  type Photo {
    id: ID!
    filename: String!
    width: Int!
    height: Int!
  }

  type LogPoint {
    recordedAt: String!
    lat: Float!
    lon: Float!
    elevationM: Int
    heartRate: Int
  }

  type Tour {
    id: ID!
    title: String!
    startedAt: String!
    distanceM: Int!
    notes: String
    user: User!
    guide: Guide
    photos: [Photo!]!
    logs: [LogPoint!]!
  }

  type Query {
    notices(preview: Boolean = false): [Notice!]!
    "Alla guider, senast uppdaterad först"
    guides: [Guide!]!
    "Publicerade guider, nyast först – det startsidan kallar populärast"
    popularGuides(limit: Int = 6): [Guide!]!
    guide(slug: String!): Guide
    regions: [String!]!
    "Senaste turerna"
    tours(limit: Int = 50): [Tour!]!
    tour(id: ID!): Tour
  }

  input CreateTourInput {
    title: String!
    guideId: ID
    startedAt: String!
    distanceM: Int!
    notes: String
  }

  type Mutation {
    "Kräver inloggning: Authorization: Bearer <token>"
    createTour(input: CreateTourInput!): Tour!
  }
`;
