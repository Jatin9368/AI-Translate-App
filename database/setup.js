/**
 * MongoDB Setup Script
 * Run: node database/setup.js
 * This creates the database and indexes for optimal performance.
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '../backend/.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_translate_app';

async function setup() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const db = mongoose.connection.db;

  // Create translations collection with indexes
  const collections = await db.listCollections({ name: 'translations' }).toArray();
  if (collections.length === 0) {
    await db.createCollection('translations');
    console.log('✅ Created translations collection');
  }

  const translationsCol = db.collection('translations');

  // Create indexes for fast queries
  await translationsCol.createIndex({ timestamp: -1 });
  await translationsCol.createIndex({ sourceLang: 1, targetLang: 1 });
  await translationsCol.createIndex({ inputText: 'text', translatedText: 'text' });

  console.log('✅ Indexes created');
  console.log('🎉 Database setup complete!');

  await mongoose.disconnect();
}

setup().catch(err => {
  console.error('❌ Setup failed:', err);
  process.exit(1);
});
