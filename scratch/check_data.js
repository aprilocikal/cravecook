const Database = require('../src/Database');
const db = new Database();

async function check() {
  await db.connect();
  const col = db.getCollection('recipes');
  const data = await col.find({ total_minutes: { $exists: true } })
    .sort({ total_minutes: 1 })
    .limit(5)
    .toArray();
  if (data.length > 0) {
      console.log('Type of total_minutes:', typeof data[0].total_minutes);
      console.log('First 5:', data.map(d => ({ n: d.recipe_name, t: d.total_time, m: d.total_minutes })));
  }
  console.log(JSON.stringify(data, null, 2));
  await db.close();
}

check().catch(console.error);
