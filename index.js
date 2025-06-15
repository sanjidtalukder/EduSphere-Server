const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@edusphere.t5abej9.mongodb.net/user?retryWrites=true&w=majority&appName=eduSphere`;

// Create MongoDB client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    console.log("✅ Successfully connected to MongoDB!");

    const db = client.db("user");
    const articlesCollection = db.collection("AllUser");
    const likesCollection = db.collection("Likes");
    const commentsCollection = db.collection("Comments");

    // ✅ Get all articles
    app.get('/articles', async (req, res) => {
      const result = await articlesCollection.find().sort({ _id: -1 }).toArray();
      res.send(result);
    });

    // ✅ Get featured (latest 6) articles
    app.get('/articles/featured', async (req, res) => {
      const result = await articlesCollection.find().sort({ _id: -1 }).limit(6).toArray();
      res.send(result);
    });

    // ✅ Get articles by category
    app.get('/articles/category/:category', async (req, res) => {
      const category = req.params.category;
      const result = await articlesCollection.find({ category }).toArray();
      res.send(result);
    });

    // ✅ Get single article by ID (now properly using ObjectId)
    app.get('/articles/:id', async (req, res) => {
      const { id } = req.params;
      let query;

      // If valid ObjectId
      if (/^[0-9a-fA-F]{24}$/.test(id)) {
        query = { _id: new ObjectId(id) };
      } else {
        return res.status(400).json({ message: "Invalid article ID format" });
      }

      const result = await articlesCollection.findOne(query);
      if (!result) {
        return res.status(404).json({ message: "Article not found" });
      }

      res.json(result);
    });

    // ✅ Get top 3 contributors
    app.get('/top-contributors', async (req, res) => {
      const contributors = await articlesCollection.aggregate([
        {
          $group: {
            _id: "$author_name",
            totalArticles: { $sum: 1 },
            photo: { $first: "$author_photo" },
          },
        },
        { $sort: { totalArticles: -1 } },
        { $limit: 3 },
      ]).toArray();
      res.send(contributors);
    });

    // ✅ Get total likes for an article
    app.get('/articles/:id/likes', async (req, res) => {
      const articleId = req.params.id;
      const likeDoc = await likesCollection.findOne({ articleId });
      const totalLikes = likeDoc?.likedBy?.length || 0;
      res.send({ totalLikes });
    });

    // ✅ Like an article
    app.post('/articles/:id/like', async (req, res) => {
      const articleId = req.params.id;
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ success: false, message: "Email is required" });
      }

      const existing = await likesCollection.findOne({ articleId });

      if (existing) {
        const alreadyLiked = existing.likedBy.includes(email);
        if (alreadyLiked) {
          return res.send({ success: false, message: "Already liked" });
        }

        await likesCollection.updateOne(
          { articleId },
          { $push: { likedBy: email } }
        );
      } else {
        await likesCollection.insertOne({ articleId, likedBy: [email] });
      }

      const updated = await likesCollection.findOne({ articleId });
      res.send({ success: true, likes: updated.likedBy.length, userLiked: true });
    });

    // ✅ Get all comments for an article
    app.get('/articles/:id/comments', async (req, res) => {
      const articleId = req.params.id;
      const comments = await commentsCollection
        .find({ articleId })
        .sort({ date: 1 })
        .toArray();
      res.send(comments);
    });

    // ✅ Post a comment
    app.post('/articles/:id/comment', async (req, res) => {
      const articleId = req.params.id;
      const comment = req.body;

      if (!comment?.user_name || !comment?.comment) {
        return res.status(400).json({ success: false, message: "Incomplete comment data" });
      }

      comment.articleId = articleId;
      comment.date = new Date();

      const result = await commentsCollection.insertOne(comment);
      comment._id = result.insertedId;
      res.send(comment); // Return the new comment to frontend
    });

    // ✅ Create a new article
    app.post('/articles', async (req, res) => {
      const newArticle = req.body;
      newArticle.createdAt = new Date();

      try {
        const result = await articlesCollection.insertOne(newArticle);
        res.send({ success: true, insertedId: result.insertedId });
      } catch (error) {
        console.error("❌ Error posting article:", error);
        res.status(500).send({ success: false, message: "Server error" });
      }
    });

  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
  }
}
run().catch(console.dir);

// Root route
app.get('/', (req, res) => {
  res.send('✅ eduSphere server is live!');
});

// Start server
app.listen(port, () => {
  console.log(`🚀 my-eduSphere-server is running on port ${port}`);
});
