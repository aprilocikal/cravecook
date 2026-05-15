const fs = require("fs");
const Database = require("./src/Database");
require("dotenv").config();

async function importData() {
  console.log("Reading recipes.json...");
  const data = JSON.parse(fs.readFileSync("recipes.json", "utf8"));

  console.log("Connecting to MongoDB Atlas...");
  const db = new Database();
  await db.connect();

  const col = db.getCollection("recipes");

  console.log("Dropping old collection...");
  try {
    await col.drop();
  } catch (e) {
    // collection might not exist yet, that's fine
  }

  function parseTimeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== "string") return 999999;
    let totalMinutes = 0;
    const hoursMatch = timeStr.match(/(\d+)\s*hrs?/);
    const minsMatch = timeStr.match(/(\d+)\s*mins?/);
    if (hoursMatch) totalMinutes += parseInt(hoursMatch[1]) * 60;
    if (minsMatch) totalMinutes += parseInt(minsMatch[1]);
    return totalMinutes === 0 ? 999999 : totalMinutes;
  }

  const processedData = data.map((recipe) => ({
    ...recipe,
    total_minutes: parseTimeToMinutes(recipe.total_time),
  }));

  console.log(
    `Inserting ${processedData.length} recipes into MongoDB Atlas...`,
  );
  await col.insertMany(processedData);

  console.log("Import completed successfully!");
  await db.close();
  process.exit(0);
}

importData().catch(console.error);
