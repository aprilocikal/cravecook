const mongodb = require('mongodb');
const rl = require('readline-sync');
require('dotenv').config();

const client = new mongodb.MongoClient(process.env.MONGO_URI);

async function main() {
    await client.connect();
    console.log('Connected to Database!');
    
    const db = client.db('aida-db').collection('mahasiswa');
    
    // Tampilkan semua data dulu
    const semuaData = await db.find({}).toArray();
    console.log('\n=== Data Mahasiswa ===');
    semuaData.forEach((item, index) => {
        console.log(`${index + 1}. Nama: ${item.nama} - NPM: ${item.npm}`);
    });
    
    // Input dari user
    const npmCari = rl.question('\nMasukkan NPM yang mau diupdate: ');
    const namaBaru = rl.question('Masukkan nama baru: ');
    const npmBaru = rl.question('Masukkan NPM baru: ');
    
    // Update data
    const result = await db.updateOne(
        { npm: npmCari },
        { $set: { nama: namaBaru, npm: npmBaru } }
    );
    
    if (result.modifiedCount > 0) {
        console.log('✅ Data berhasil diupdate!');
    } else {
        console.log('❌ Data tidak ditemukan!');
    }
}

main().catch(console.error);