import { MongoClient } from 'mongodb';
import { config } from '../config.js';

export const mongoClient = new MongoClient(config.mongoUrl, {
  serverSelectionTimeoutMS: 10000,
});

export async function getMongoDb() {
  await mongoClient.connect();
  return mongoClient.db();
}
