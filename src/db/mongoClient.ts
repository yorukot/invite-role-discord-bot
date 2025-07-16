import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI || '';
if (!uri) throw new Error('MONGODB_URI not set in environment');

export const mongoClient = new MongoClient(uri);

let isConnected = false;

export async function connectMongo() {
  try {
    if (!isConnected) {
      await mongoClient.connect();
      isConnected = true;
      console.log('已連接到 MongoDB');
    }
    return mongoClient;
  } catch (error) {
    console.error('MongoDB 連接失敗:', error);
    isConnected = false;
    throw error;
  }
}

// 優雅關閉連接
export async function closeMongo() {
  if (isConnected) {
    await mongoClient.close();
    isConnected = false;
    console.log('MongoDB 連接已關閉');
  }
} 