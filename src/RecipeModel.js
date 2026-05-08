class RecipeModel {
  constructor(db) {
    this.col = db.getCollection('recipes');
  }

  async findAll() {
    return await this.col.find().toArray();
  }

  async insertOne(data) {
    return await this.col.insertOne(data);
  }

  async updateOne(recipe_name, updateData) {
    return await this.col.updateOne({ recipe_name }, { $set: updateData });
  }

  async deleteOne(recipe_name) {
    return await this.col.deleteOne({ recipe_name });
  }
}

module.exports = RecipeModel;
