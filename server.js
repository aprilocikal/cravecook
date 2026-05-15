const express = require("express");
const cors = require("cors");
const path = require("path");
const Database = require("./src/Database");
const RecipeModel = require("./src/RecipeModel");

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let db, rm;

async function initDb() {
  db = new Database();
  await db.connect();
  rm = new RecipeModel(db);
}

// Get all recipes
app.get("/api/recipes", async (req, res) => {
  try {
    const recipes = await rm.findAll();
    res.json(recipes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get top 50 recipes for user menu (sorted by total_minutes asc)
app.get("/api/recipes/top50", async (req, res) => {
  try {
    const col = db.getCollection("recipes");
    const recipes = await col
      .find({ img_src: { $ne: null, $exists: true } })
      .sort({ total_minutes: 1 })
      .limit(50)
      .toArray();
    console.log(
      "Returning top 50 (sorted by time). First 3:",
      recipes
        .slice(0, 3)
        .map((r) => ({ n: r.recipe_name, m: r.total_minutes })),
    );
    res.json(recipes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search all recipes by name
app.get("/api/recipes/search", async (req, res) => {
  try {
    const q = req.query.q || "";
    const col = db.getCollection("recipes");
    const recipes = await col
      .find({
        recipe_name: { $regex: q, $options: "i" },
      })
      .sort({ total_minutes: 1 })
      .limit(50)
      .toArray();
    res.json(recipes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Analytics endpoint
app.get("/api/analytics", async (req, res) => {
  try {
    const col = db.getCollection("recipes");

    // Total
    const total = await col.countDocuments();

    // Rating distribution
    const ratingDist = await col
      .aggregate([
        { $match: { rating: { $ne: null } } },
        {
          $bucket: {
            groupBy: "$rating",
            boundaries: [1, 2, 3, 4, 4.5, 5, 5.1],
            default: "Other",
            output: { count: { $sum: 1 } },
          },
        },
      ])
      .toArray();

    // Top 10 cuisines
    const cuisines = await col
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
    const avgResult = await col
      .aggregate([
        { $match: { rating: { $ne: null } } },
        {
          $group: {
            _id: null,
            avg: { $avg: "$rating" },
            max: { $max: "$rating" },
            min: { $min: "$rating" },
          },
        },
      ])
      .toArray();

    // Servings distribution
    const servings = await col
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
    const topRated = await col
      .find({ rating: { $gte: 4.9 } })
      .sort({ rating: -1 })
      .limit(5)
      .project({ recipe_name: 1, rating: 1, cuisine_path: 1 })
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
app.post("/api/recipes", async (req, res) => {
  try {
    const data = req.body;
    await rm.insertOne(data);
    res.json({ message: "Recipe added successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a recipe
app.put("/api/recipes/:name", async (req, res) => {
  try {
    const { name } = req.params;
    const updateData = req.body;
    await rm.updateOne(name, updateData);
    res.json({ message: "Recipe updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a recipe
app.delete("/api/recipes/:name", async (req, res) => {
  try {
    const { name } = req.params;
    await rm.deleteOne(name);
    res.json({ message: "Recipe deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  })
  .catch(console.error);
