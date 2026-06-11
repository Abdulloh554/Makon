const mongoose = require('mongoose');
const config = require('./index');

let connected = false;

async function connectDB() {
  try {
    await mongoose.connect(config.mongodb.uri, { serverSelectionTimeoutMS: 1500 });
    console.log('MongoDB connected:', config.mongodb.uri);
    connected = true;
  } catch (err) {
    console.warn('MongoDB unavailable, using in-memory storage.');
    connected = false;
  }
}

function connectDBAsync() {
  connectDB().catch(() => {});
}

function isConnected() {
  return connected;
}

async function closeDB() {
  if (connected) {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
    connected = false;
  }
}

module.exports = { connectDB: connectDBAsync, isConnected, closeDB };
