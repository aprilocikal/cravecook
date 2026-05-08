const rl = require('readline-sync');
const Database = require('./src/Database');
const ProductModel = require('./src/ProductModel');

async function main() {
  const db = new Database();
  await db.connect();

  const pm = new ProductModel(db); // ← inject db yang sudah connect

  while (true) {
    console.log('MongoDB Demo Application using CLI\n');
    console.log('1. Tampilkan semua produk\n2. Tambah produk\n3. Perbarui produk\n4. Hapus produk\n5. Keluar');

    const pilih = rl.question('Pilih menu: '); // ← hapus await, readline-sync itu sync

    if (pilih === '1') {
      console.log('\n----Daftar Produk----');
      const data = await pm.findAll();
      data.forEach((element, index) => {
        console.log(`${index + 1}. ${element.name} - ${element.price}`); // ← pakai backtick
      });
      console.log('---------------------\n');
    }
    else if (pilih === '2') {
      const name = rl.question('Nama produk: ');
      const price = Number(rl.question('Harga produk: '));
      await pm.insertOne(name, price);
      console.log('Produk ditambahkan!\n');
    }
    else if (pilih === '3') {
      console.log('\n----Daftar Produk----');
      const data = await pm.findAll();
      if (data.length === 0) {
        console.log('Belum ada produk untuk diperbarui.\n');
        continue;
      }
      data.forEach((element, index) => {
        console.log(`${index + 1}. ${element.name} - ${element.price}`);
      });
      console.log('---------------------\n');

      const no = Number(rl.question('Pilih nomor produk yang ingin diperbarui: '));
      if (no > 0 && no <= data.length) {
        const selectedProduct = data[no - 1];
        const newPrice = Number(rl.question(`Harga baru untuk ${selectedProduct.name}: `));
        await pm.updateOne(selectedProduct.name, newPrice);
        console.log(`Produk ${selectedProduct.name} berhasil diperbarui!\n`);
      } else {
        console.log('Nomor produk tidak valid.\n');
      }
    }
    else if (pilih === '4') {
      console.log('\n----Daftar Produk----');
      const data = await pm.findAll();
      if (data.length === 0) {
        console.log('Belum ada produk untuk dihapus.\n');
        continue;
      }
      data.forEach((element, index) => {
        console.log(`${index + 1}. ${element.name} - ${element.price}`);
      });
      console.log('---------------------\n');

      const no = Number(rl.question('Pilih nomor produk yang ingin dihapus: '));
      if (no > 0 && no <= data.length) {
        const selectedProduct = data[no - 1];
        await pm.deleteOne(selectedProduct.name);
        console.log(`Produk ${selectedProduct.name} berhasil dihapus!\n`);
      } else {
        console.log('Nomor produk tidak valid.\n');
      }
    }
    else if (pilih === '5') {
      await db.close();
      break;
    }
    else {
      console.log('Pilihan tidak valid, coba lagi.\n'); // ← bonus: handle input invalid
    }
  }
}

main().catch(console.error);
