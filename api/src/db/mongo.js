import { MongoClient } from 'mongodb';
import { config } from '../config.js';

export const mongo = new MongoClient(config.mongoUrl, {
  serverSelectionTimeoutMS: 3000,
});
export const mongoDb = () => mongo.db();

export const toursCollection = () => mongoDb().collection('tours');



/*export const mongoClient = new MongoClient(config.mongoUrl, {
  serverSelectionTimeoutMS: 10000,
});

export async function getMongoDb() {
  await mongoClient.connect();
  return mongoClient.db();
}*/
