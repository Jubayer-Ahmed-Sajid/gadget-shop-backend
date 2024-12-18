const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require("mongodb");
const jwt = require("jsonwebtoken");
const app = express();
require("dotenv").config();
//middlewares
app.use(cors());
app.use(express.json());
// verify token
const verifyToken = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ message: "Token is required" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_KEY, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "Invalid token" });
    }
    req.decoded = decoded;
    next();
  });
};
// Verify seller
const verifySeller = async (req, res, next) => {
  const email = req.decoded.email;
  const query = { email: email };
  const result = await userCollection.findOne(query);
  console.log(result);
  if (result.role != "seller") {
    return res.send({ message: "Not a seller" });
  }
  next();
};
// mongodb

const url = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.vqva6ft.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(url, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
const userCollection = client.db("gadget-shop").collection("users");
const productCollection = client.db("gadget-shop").collection("products");
async function run() {
  try {
    await client.connect();

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    // insert user

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = userCollection.findOne(query);
      if (!existingUser) {
        return res.send({ message: "user already exists" });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const result = await userCollection.findOne({ email });
      res.send(result);
    });
    //Product related apis

    app.post("/add-product", verifyToken, verifySeller, async (req, res) => {
      const product = req.body;
      const result = await productCollection.insertOne(product);
      res.send(result);
    });

    app.get("/all-products", async (req, res) => {
      
      const { title, sorts, category, brand } = req.query;
      const query = {};
      if (title) {
        query.title = { $regex: title, $options: "i" };
      }
      if (category) {
        query.category = category;
      }
      if (brand) {
        query.brand = { $regex: brand, $options: "i" };
      }
      const sortOptions = sorts === "asc" ? 1 : -1;
      console.log(query)
      const products = await productCollection
        .find(query)
        .sort({ fl_price: sortOptions })
        .toArray();

      const productInfo =await productCollection.find(
        {},
        { projection: { category: 1, brand: 1 } }
      ).toArray();

      const brands = [...new Set(productInfo.map((product) => product.brand))];
      const categories = [
        ...new Set(productInfo.map((product) => product.category))
      ];
      const totalProduct = await productCollection.countDocuments(query);
      res.send({ products, brands, categories, totalProduct });
    });

  } finally {
    //   await client.close();
  }
}
run().catch(console.dir);

// Jwt
app.post("/jwt", async (req, res) => {
  const userEmail = req.body;
  const token = jwt.sign(userEmail, process.env.ACCESS_TOKEN_KEY, {
    expiresIn: "10d",
  });
  res.send({ token });
});

//apis
app.get("/", (req, res) => {
  res.send("Server is running");
});
app.listen(port, () => {
  console.log(`Server is running at port ${port}`);
});
