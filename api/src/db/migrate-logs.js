import { pool } from './client.js';
import { mongo, toursCollection } from './mongo.js';

function buildTourDocument(tour, logs) {
  const points = logs.map((log) => ({
    recorded_at: log.recorded_at,
    lat: log.lat,
    lon: log.lon,
    elevation_m: log.elevation_m,
    heart_rate: log.heart_rate,
    note: log.note,
  }));

  const elevations = points
    .map((point) => point.elevation_m)
    .filter((value) => value != null);

  const heartRates = points
    .map((point) => point.heart_rate)
    .filter((value) => value != null);

  // Punkterna kommer redan sorterade efter tid från SQL-frågan.
  const durationSeconds =
    points.length > 1
      ? (new Date(points.at(-1).recorded_at).getTime() -
          new Date(points[0].recorded_at).getTime()) / 1000
      : 0;

  return {
    id: tour.id,
    tour_id: tour.id,
    user_id: tour.user_id,
    guide_id: tour.guide_id,
    title: tour.title,
    started_at: tour.started_at,
    distance_m: tour.distance_m,
    notes: tour.notes,
    points,
    point_count: points.length,
    duration_s: durationSeconds,
    max_elevation_m: elevations.length
      ? Math.max(...elevations)
      : null,
    avg_heart_rate: heartRates.length
      ? heartRates.reduce((sum, value) => sum + value, 0) /
        heartRates.length
      : null,
  };
}

async function migrateLogs() {
  const { rows: tours } = await pool.query(
    'select * from tours order by id'
  );

  const { rows: logs } = await pool.query(
    'select * from tour_logs order by tour_id, recorded_at, id'
  );

  // Samla varje turs mätpunkter under dess id.
  const logsByTour = new Map();

  for (const log of logs) {
    if (!logsByTour.has(log.tour_id)) {
      logsByTour.set(log.tour_id, []);
    }

    logsByTour.get(log.tour_id).push(log);
  }

  const documents = tours.map((tour) =>
  buildTourDocument(tour, logsByTour.get(tour.id) ?? [])
);

const totalPoints = documents.reduce(
  (sum, document) => sum + document.points.length,
  0
);

console.log(
  `Förberedda dokument: ${documents.length}, mätpunkter: ${totalPoints}`
);

if (totalPoints !== logs.length) {
  throw new Error('Alla mätpunkter kom inte med i dokumenten');
}

// Visa ett dokument med bara två punkter för läsbar utskrift.
if (documents.length > 0) {
  console.dir(
    { ...documents[0], points: documents[0].points.slice(0, 2) },
    { depth: null }
  );
}

  console.log(`Postgres: ${tours.length} turer`);
  console.log(`Postgres: ${logs.length} mätpunkter`);

  const firstTour = tours[0];

  if (firstTour) {
    const points = logsByTour.get(firstTour.id) ?? [];

    console.log(
      `Tur ${firstTour.id}: "${firstTour.title}", ${points.length} mätpunkter`
    );
  }

  await mongo.connect();
const collection = toursCollection();

// Samma tur får bara finnas en gång.
await collection.createIndex({ tour_id: 1 }, { unique: true });

let created = 0;
let updated = 0;

for (const document of documents) {
  const result = await collection.replaceOne(
    { tour_id: document.tour_id },
    document,
    { upsert: true }
  );

  created += result.upsertedCount;
  updated += result.modifiedCount;
}

// Index enligt vårt M3-beslut.
await collection.createIndex({ id: 1 }, { unique: true });
await collection.createIndex({ user_id: 1, started_at: -1 });
await collection.createIndex({ guide_id: 1 });

// Räkna det som faktiskt sparats i Mongo.
const savedTours = await collection.countDocuments();

const [totals] = await collection
  .aggregate([
    {
      $group: {
        _id: null,
        points: { $sum: { $size: '$points' } },
      },
    },
  ])
  .toArray();

const savedPoints = totals?.points ?? 0;

console.log(`MongoDB: ${created} nya, ${updated} ändrade dokument`);
console.log(`Turer: Postgres ${tours.length}, MongoDB ${savedTours}`);
console.log(`Mätpunkter: Postgres ${logs.length}, MongoDB ${savedPoints}`);

if (savedTours !== tours.length || savedPoints !== logs.length) {
  throw new Error('Verifieringen misslyckades: antalen skiljer sig');
}

console.log('Verifiering OK: antal turer och mätpunkter stämmer');
}

try {
  await migrateLogs();
} catch (error) {
  console.error('Migreringen misslyckades:', error);
  process.exitCode = 1;
} finally {
  await Promise.all([
    mongo.close(),
    pool.end(),
  ]);
} 