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
  }
});

async function run() {
  try {
    await client.connect();
    console.log(" Successfully connected to MongoDB!");

    const db = client.db("user");
    const articlesCollection = db.collection("AllUser");
    const likesCollection = db.collection("Likes");
    const commentsCollection = db.collection("Comments");

    //  Get all articles
    app.get('/articles', async (req, res) => {
      const result = await articlesCollection.find().sort({ _id: -1 }).toArray();
      res.send(result);
    });

    //  Get featured (latest 6) articles
    app.get('/articles/featured', async (req, res) => {
      const result = await articlesCollection.find().sort({ _id: -1 }).limit(6).toArray();
      res.send(result);
    });

    // Get articles by category
    app.get('/articles/category/:category', async (req, res) => {
      const category = req.params.category;
      const result = await articlesCollection.find({ category }).toArray();
      res.send(result);
    });

    //  Get single article by ID (handles string or ObjectId)
    app.get('/articles/:id', async (req, res) => {
      const { id } = req.params;
      let query;

      // Check if it's a valid 24-char hex string to use as ObjectId
      // if (/^[0-9a-fA-F]{24}$/.test(id)) {
      //   try {
      //     query = { _id: new ObjectId(id) };
      //   } catch {
      //     query = { _id: id };
      //   }
      // } else {
      //   query = { _id: id };
      // }

      query = { _id: id };

      console.log(query)

      const result = await articlesCollection.findOne(query);

      if (!result) {
        return res.status(404).json({ message: "Article not found" });
      }

      res.json(result);
    });

    //  Get top 3 contributors
    app.get('/top-contributors', async (req, res) => {
      const contributors = await articlesCollection.aggregate([
        {
          $group: {
            _id: "$author_name",
            totalArticles: { $sum: 1 },
            photo: { $first: "$author_photo" }
          }
        },
        { $sort: { totalArticles: -1 } },
        { $limit: 3 }
      ]).toArray();
      res.send(contributors);
    });

    //  Get total likes for an article
    app.get('/articles/:id/likes', async (req, res) => {
      const articleId = req.params.id;
      const likeDoc = await likesCollection.findOne({ articleId });
      const totalLikes = likeDoc?.likedBy?.length || 0;
      res.send({ totalLikes });
    });

    //  Like an article
    app.post('/articles/:id/like', async (req, res) => {
      const articleId = req.params.id;
      const { email } = req.body;

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

      res.send({ success: true, message: "Liked successfully" });
    });

    //  Get all comments for an article
    app.get('/articles/:id/comments', async (req, res) => {
      const articleId = req.params.id;
      const comments = await commentsCollection
        .find({ articleId })
        .sort({ date: 1 })
        .toArray();
      res.send(comments);
    });

    //  Post a comment
    app.post('/articles/:id/comment', async (req, res) => {
      const articleId = req.params.id;
      const comment = req.body;
      comment.articleId = articleId;
      comment.date = new Date();
      await commentsCollection.insertOne(comment);
      res.send({ success: true, message: "Comment added" });
    });

  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
  }
}
run().catch(console.dir);

// Root route
app.get('/', (req, res) => {
  res.send(' eduSphere server is live!');
});

// Start server
app.listen(port, () => {
  console.log(` my-eduSphere-server is running on port ${port}`);
});
