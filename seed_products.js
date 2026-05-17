const Database = require('./src/Database');
const ProductModel = require('./src/ProductModel');

async function seedProducts() {
  const db = new Database();
  try {
    await db.connect();
    const pm = new ProductModel(db);
    
    const products = [
      { name: 'Nasi Goreng Spesial', price: 35000 },
      { name: 'Mie Ayam Jamur', price: 25000 },
      { name: 'Es Teh Manis', price: 5000 }
    ];

    for (const p of products) {
      await pm.insertOne(p.name, p.price);
      console.log(`Inserted ${p.name}`);
    }
    
    console.log("Done seeding products!");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await db.close();
  }
}

seedProducts();
