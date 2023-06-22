require("dotenv").config();
const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const port = process.env.PORT || 9000;
const app = express();
//middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  // console.log(authorization);
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }

  //bearer token

  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      // console.log(err);
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASS}@cluster0.j4yufep.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)

    // Send a ping to confirm a successful connection
    const usersCollection = client.db("musicDB").collection("users");
    const classCollection = client.db("musicDB").collection("class");
    const feedbackCollection = client.db("musicDB").collection("feedback");

    const instructorCollection = client.db("musicDB").collection("instructor");
    const selectCollection = client.db("musicDB").collection("select");

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "5h",
      });
      res.send({ token });
    });

    // const verifyAdmin = async (req, res, next) => {
    //   const email = req.decoded.email;
    //   const query = { email: email };
    //   const user = await usersCollection.findOne(query);
    //   if (user?.role !== "admin") {
    //     return res
    //       .status(403)
    //       .send({ error: true, message: "forbidden access" });
    //   }
    //   next();
    // };
    // const verifyInstructor = async (req, res, next) => {
    //   const email = req.decoded.email;
    //   const query = { email: email };
    //   const user = await usersCollection.findOne(query);
    //   if (user?.role !== "instructor") {
    //     return res
    //       .status(403)
    //       .send({ error: true, message: "forbidden access" });
    //   }
    //   next();
    // };

    // user related api

    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      // console.log(user);
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      // console.log(existingUser);
      if (existingUser) {
        return res.send({ message: "user already exists" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      // console.log(email);
      // console.log(req.decoded.email);
      if (req.decoded.email !== email) {
        return res.send({ admin: false });
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });

    app.get("/users/instructor/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      // console.log(email);
      // console.log(req.decoded.email);
      if (req.decoded.email !== email) {
        return res.send({ instructor: false });
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { instructor: user?.role === "instructor" };
      res.send(result);
    });

    app.patch("/users/instructor/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "instructor",
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    //class related api
    app.get("/class", async (req, res) => {
      const result = await classCollection.find().toArray();
      console.log(result);
      res.send(result);
    });

    app.post("/class", async (req, res) => {
      const newClass = req.body;
      console.log(newClass);
      const result = await classCollection.insertOne(newClass);
      res.send(result);
    });

    app.get("/instructor", async (req, res) => {
      const result = await instructorCollection.find().toArray();
      // console.log(result);
      res.send(result);
    });

    app.post("/select", async (req, res) => {
      const item = req.body;
      // console.log(item);
      const result = await selectCollection.insertOne(item);
      res.send(result);
    });

    app.get("/select", verifyJWT, async (req, res) => {
      const email = req.query.email;
      // console.log(email);
      if (!email) {
        return res.send([]);
      }

      const decodedEmail = req.decoded.email;
      // console.log(decodedEmail, email);
      if (email != decodedEmail) {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }
      const query = { email: email };
      const result = await selectCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/select/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await selectCollection.deleteOne(query);
      res.send(result);
    });

    app.post("/feedBack", async (req, res) => {
      const newFeedback = req.body;
      console.log(newFeedback);
      const result = await feedbackCollection.insertOne(newFeedback);
      res.send(result);
    });

    //create payment intent

    app.post("/create-payment", async (req, res) => {
      const { price } = req.body;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: usd,
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Music Minds");
});

app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
