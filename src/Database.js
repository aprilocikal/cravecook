const mongodb = require('mongodb');
require('dotenv').config();

class Database {
  constructor() {
    this.client = new mongodb.MongoClient(process.env.MONGO_URI);
    this.db = null;
  }

  async connect() {
    await this.client.connect();
    this.db = this.client.db('demo-db');
    console.log('Connected!\n');
  }

  getCollection(name) {
    return this.db.collection(name);
  }

  async close() {
    await this.client.close();
    console.log('Bye!');
  }
}

module.exports = Database;
