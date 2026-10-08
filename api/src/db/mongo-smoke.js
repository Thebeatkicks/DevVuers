import { getMongoDb, mongoClient } from './mongo.js';

try {
  const db = await getMongoDb();
  const tours = db.collection('tours');
  const tourId = 'mongo-smoke-tour';

  // Samma demonstrationsdokument återanvänds vid nästa körning.
  if (!(await tours.findOne({ _id: tourId }))) {
    await tours.insertOne({
      _id: tourId,
      title: 'Demotur – kvällspromenad',
      started_at: new Date('2026-10-07T16:00:00Z'),
      distance_m: 2500,
      logs: [
        { recorded_at: new Date('2026-10-07T16:00:00Z'), lat: 59.3293, lon: 18.0686, elevation_m: 20 },
        { recorded_at: new Date('2026-10-07T16:15:00Z'), lat: 59.3305, lon: 18.0700, elevation_m: 30 },
        { recorded_at: new Date('2026-10-07T16:30:00Z'), lat: 59.3320, lon: 18.0720, elevation_m: 25 },
      ],
    });
  }

  const tour = await tours.findOne({ _id: tourId });
  if (!tour) throw new Error('Demoturen kunde inte läsas tillbaka.');
  console.log(JSON.stringify(tour, null, 2));
} catch (error) {
  console.error('Mongo smoke misslyckades:', error.message);
  process.exitCode = 1;
} finally {
  await mongoClient.close();
}
