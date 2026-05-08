class ProductModel {
  constructor(db) { // ← terima db dari luar
    this.col = db.getCollection('products');
  }

  async findAll() {
    return await this.col.find().toArray();
  }

  async insertOne(name, price) {
    return await this.col.insertOne({ name, price });
  }

  async updateOne(name, newPrice) {
    return await this.col.updateOne({ name }, { $set: { price: newPrice } });
  }

  async deleteOne(name) {
    return await this.col.deleteOne({ name });
  }
}

module.exports = ProductModel;
