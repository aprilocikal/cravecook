class RecipeModel {
  constructor(db) {
    this.db = db;
    this.recipes = db.getCollection('Recipes');
    this.times = db.getCollection('RecipeTimes');
    this.ratings = db.getCollection('RecipeRatings');
  }

  async findAll() {
    return await this.recipes.aggregate([
      {
        $lookup: {
          from: 'RecipeTimes',
          localField: '_id',
          foreignField: 'recipeId',
          as: 'times'
        }
      },
      {
        $lookup: {
          from: 'RecipeRatings',
          localField: '_id',
          foreignField: 'recipeId',
          as: 'ratings'
        }
      },
      {
        $unwind: { path: '$times', preserveNullAndEmptyArrays: true }
      },
      {
        $unwind: { path: '$ratings', preserveNullAndEmptyArrays: true }
      }
    ]).toArray();
  }

  async findOne(id) {
    const { ObjectId } = require('mongodb');
    const result = await this.recipes.aggregate([
      { $match: { _id: new ObjectId(id) } },
      {
        $lookup: {
          from: 'RecipeTimes',
          localField: '_id',
          foreignField: 'recipeId',
          as: 'times'
        }
      },
      {
        $lookup: {
          from: 'RecipeRatings',
          localField: '_id',
          foreignField: 'recipeId',
          as: 'ratings'
        }
      },
      { $unwind: { path: '$times', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$ratings', preserveNullAndEmptyArrays: true } }
    ]).toArray();
    return result[0];
  }

  async insertOne(data) {
    const { recipeName, servings, authorId, prepTime, cookTime, totalTime, ratingScore, ...other } = data;
    
    // 1. Insert into Recipes
    const recipeResult = await this.recipes.insertOne({
      recipeName,
      servings: parseInt(servings),
      authorId: authorId || "system",
      ...other
    });
    
    const recipeId = recipeResult.insertedId;

    // 2. Insert into RecipeTimes
    await this.times.insertOne({
      recipeId,
      prepTime: parseInt(prepTime) || 0,
      cookTime: parseInt(cookTime) || 0,
      totalTime: parseInt(totalTime) || 0
    });

    // 3. Insert into RecipeRatings
    await this.ratings.insertOne({
      recipeId,
      ratingScore: parseFloat(ratingScore) || 0.0
    });

    return recipeResult;
  }

  async updateOne(id, updateData) {
    const { ObjectId } = require('mongodb');
    const oid = new ObjectId(id);
    const { recipeName, servings, authorId, prepTime, cookTime, totalTime, ratingScore, ...other } = updateData;

    const promises = [];

    // Update Recipes
    if (recipeName !== undefined || servings !== undefined || authorId !== undefined || Object.keys(other).length > 0) {
      const up = {};
      if (recipeName !== undefined) up.recipeName = recipeName;
      if (servings !== undefined) up.servings = parseInt(servings);
      if (authorId !== undefined) up.authorId = authorId;
      Object.assign(up, other);
      promises.push(this.recipes.updateOne({ _id: oid }, { $set: up }));
    }

    // Update RecipeTimes
    if (prepTime !== undefined || cookTime !== undefined || totalTime !== undefined) {
      const up = {};
      if (prepTime !== undefined) up.prepTime = parseInt(prepTime);
      if (cookTime !== undefined) up.cookTime = parseInt(cookTime);
      if (totalTime !== undefined) up.totalTime = parseInt(totalTime);
      promises.push(this.times.updateOne({ recipeId: oid }, { $set: up }, { upsert: true }));
    }

    // Update RecipeRatings
    if (ratingScore !== undefined) {
      promises.push(this.ratings.updateOne({ recipeId: oid }, { $set: { ratingScore: parseFloat(ratingScore) } }, { upsert: true }));
    }

    return Promise.all(promises);
  }

  async deleteOne(id) {
    const { ObjectId } = require('mongodb');
    const oid = new ObjectId(id);
    await this.recipes.deleteOne({ _id: oid });
    await this.times.deleteMany({ recipeId: oid });
    await this.ratings.deleteMany({ recipeId: oid });
  }
}

module.exports = RecipeModel;
