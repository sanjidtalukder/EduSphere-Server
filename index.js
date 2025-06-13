const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// MongoDB URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@edusphere.t5abej9.mongodb.net/user?retryWrites=true&w=majority&appName=eduSphere`;

// Create Mongo Client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    console.log("✅ Successfully connected to MongoDB!");

    const db = client.db("user");
    const articlesCollection = db.collection("AllUser");

    // Get latest 6 articles
    app.get('/articles', async (req, res) => {
      const result = await articlesCollection.find().sort({ _id: -1 }).limit(6).toArray();
      res.send(result);
    });

    // Get articles by category
    app.get('/articles/category/:category', async (req, res) => {
      const category = req.params.category;
      const result = await articlesCollection.find({ category }).toArray();
      res.send(result);
    });

    // Get article by ID
    app.get('/articles/:id', async (req, res) => {
      const id = req.params.id;
      const result = await articlesCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

//Category section 
    app.get('/articles/category/:category', async (req, res) => {
  const category = req.params.category;
  const result = await articlesCollection.find({ category }).toArray();
  res.send(result);
});


  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('🎓 eduSphere server is live!');
});

app.listen(port, () => {
  console.log(`🚀 my-eduSphere-server is running on port ${port}`);
});
