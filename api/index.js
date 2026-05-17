const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('../src/Database');
const RecipeModel = require('../src/RecipeModel');

const app = express();

app.use(cors());
app.use(express.json());

let db, rm;

async function initDb() {
  if (!db) {
    db = new Database();
    await db.connect();
    rm = new RecipeModel(db);
  }
}

// Middleware to ensure DB is connected
app.use(async (req, res, next) => {
  try {
    await initDb();
    next();
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed: ' + error.message });
  }
});

// Get all recipes
app.get('/api/recipes', async (req, res) => {
  try {
    const recipes = await rm.findAll();
    res.json(recipes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get top 50 recipes for user menu
app.get('/api/recipes/top50', async (req, res) => {
  try {
    const recipes = await db.getCollection("Recipes").aggregate([
      { $match: { img_src: { $ne: null, $exists: true } } },
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
      { $unwind: { path: '$ratings', preserveNullAndEmptyArrays: true } },
      { $sort: { "times.totalTime": 1 } },
      { $limit: 50 }
    ]).toArray();
    res.json(recipes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search all recipes by name
app.get('/api/recipes/search', async (req, res) => {
  try {
    const q = req.query.q || '';
    const recipes = await db.getCollection("Recipes").aggregate([
      {
        $match: {
          recipeName: { $regex: q, $options: "i" },
        }
      },
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
      { $unwind: { path: '$ratings', preserveNullAndEmptyArrays: true } },
      { $sort: { "times.totalTime": 1 } },
      { $limit: 50 }
    ]).toArray();
    res.json(recipes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single recipe by _id
app.get("/api/recipes/id/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const recipe = await rm.findOne(id);
    if (!recipe) return res.status(404).json({ error: "Recipe not found" });
    res.json(recipe);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update recipe by _id
app.put("/api/recipes/id/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { ObjectId } = require("mongodb");
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid ID" });

    const updateData = req.body;
    await rm.updateOne(id, updateData);
    res.json({ message: "Recipe updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Analytics endpoint
app.get('/api/analytics', async (req, res) => {
  try {
    const recipesCol = db.getCollection("Recipes");
    const ratingsCol = db.getCollection("RecipeRatings");

    const total = await recipesCol.countDocuments();

    // Rating distribution
    const ratingDist = await ratingsCol
      .aggregate([
        { $match: { ratingScore: { $ne: null } } },
        {
          $bucket: {
            groupBy: "$ratingScore",
            boundaries: [1, 2, 3, 4, 4.5, 5, 5.1],
            default: "Other",
            output: { count: { $sum: 1 } },
          },
        },
      ])
      .toArray();

    // Top 10 cuisines
    const cuisines = await recipesCol
      .aggregate([
        { $match: { cuisine_path: { $ne: null } } },
        {
          $project: {
            cat: { $arrayElemAt: [{ $split: ["$cuisine_path", "/"] }, 1] },
          },
        },
        { $match: { cat: { $ne: "" } } },
        { $group: { _id: "$cat", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ])
      .toArray();

    // Avg rating
    const avgResult = await ratingsCol
      .aggregate([
        { $match: { ratingScore: { $ne: null } } },
        {
          $group: {
            _id: null,
            avg: { $avg: "$ratingScore" },
            max: { $max: "$ratingScore" },
            min: { $min: "$ratingScore" },
          },
        },
      ])
      .toArray();

    // Servings distribution
    const servings = await recipesCol
      .aggregate([
        { $match: { servings: { $ne: null } } },
        { $project: { s: { $toInt: "$servings" } } },
        { $match: { s: { $gt: 0 } } },
        {
          $bucket: {
            groupBy: "$s",
            boundaries: [1, 5, 10, 20, 50, 100],
            default: "100+",
            output: { count: { $sum: 1 } },
          },
        },
      ])
      .toArray();

    // Top 5 highest rated
    const topRated = await ratingsCol
      .aggregate([
        { $match: { ratingScore: { $gte: 4.9 } } },
        { $sort: { ratingScore: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'Recipes',
            localField: 'recipeId',
            foreignField: '_id',
            as: 'recipe'
          }
        },
        { $unwind: '$recipe' },
        {
          $project: {
            recipeName: '$recipe.recipeName',
            ratingScore: 1,
            cuisine_path: '$recipe.cuisine_path'
          }
        }
      ])
      .toArray();

    res.json({
      total,
      ratingDist,
      cuisines,
      avgResult: avgResult[0] || {},
      servings,
      topRated,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a recipe
app.post('/api/recipes', async (req, res) => {
  try {
    const data = req.body;
    await rm.insertOne(data);
    res.json({ message: 'Recipe added successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a recipe
app.put('/api/recipes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    await rm.updateOne(id, updateData);
    res.json({ message: 'Recipe updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a recipe
app.delete('/api/recipes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await rm.deleteOne(id);
    res.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = app;
