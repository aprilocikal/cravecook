const fs = require('fs');
const Database = require('./src/Database');
require('dotenv').config();

async function importData() {
  console.log("Reading recipes.json...");
  const data = JSON.parse(fs.readFileSync('recipes.json', 'utf8'));
  
  console.log("Connecting to MongoDB Atlas...");
  const db = new Database();
  await db.connect();
  
  const col = db.getCollection('recipes');
  
  console.log("Dropping old collection...");
  try {
    await col.drop();
  } catch (e) {
    // collection might not exist yet, that's fine
  }
  
  console.log(`Inserting ${data.length} recipes into MongoDB Atlas...`);
  await col.insertMany(data);
  
  console.log("Import completed successfully!");
  await db.close();
  process.exit(0);
}

importData().catch(console.error);
