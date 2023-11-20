const express = require('express')
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000

//middlewares
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://book-beacon.web.app',
    'https://book-beacon.firebaseapp.com',
],
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())
// 
// 

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jtchhsy.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// custom middlewares
const verifyToken = async(req, res, next)=>{
  const token = req.cookies?.token
  console.log('value of token inside middleware', token);
  if(!token){
    return res.status(401).send({message: 'not authorized!'})
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
    if(err){
      console.log(err);
      return res.status(401).send({message: 'not authorized!'})
    }
    // if token is valid then it would be decoded
    console.log('value in the token', decoded);
    req.user = decoded
    next()
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const categoryCollection = client.db('BookBeaconDB').collection('category')
    const bookCollection = client.db('BookBeaconDB').collection('books')
    const userCollection = client.db('BookBeaconDB').collection('user')
    const reviewCollection = client.db('BookBeaconDB').collection('reviews')

    // auth api
    app.post('/jwt', async(req, res)=>{
      const user =req.body
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res
      .cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite:'none', 
        maxAge: 60 * 60 * 1000
      })
      .send({success: true})
    })

    app.post('/logout', async(req,res)=>{
      const user = req.body
      console.log('logout', user);
      res.clearCookie('token', {maxAge:0, secure: true, sameSite: 'none'}).send({success:true})
    })

    app.get('/reviews', async(req, res)=>{
        const result = await reviewCollection.find().toArray()
        res.send(result)
    })
    app.get('/category', async(req, res)=>{
        const cursor = categoryCollection.find()
        const result = await cursor.toArray()
        res.send(result)
    })
    app.get('/books', async(req, res)=>{
        const cursor = bookCollection.find()
        const result = await cursor.toArray()
        res.send(result)
    })
    app.post('/books', async(req, res)=>{
      const newbook =req.body
      console.log(newbook);
      const result = await bookCollection.insertOne(newbook)
      res.send(result)
  })
    app.get('/books/:id', async(req,res)=>{
      const id = req.params.id
      const query = {_id: new ObjectId(id)}
      
      const result = await bookCollection.findOne(query)
      res.send(result)
  })
    app.patch('/books/:id', async(req,res)=>{
      const id = req.params.id
        const filter = {_id: new ObjectId(id)}
      const updatedBook =req.body
      console.log(updatedBook);
      const updateDoc = {
        $set:{
          quantity: updatedBook.quantity
        }
      }
      const result = await bookCollection.updateOne(filter, updateDoc)
      res.send(result)
    })
    app.patch('/book/:id', async(req,res)=>{
      const id = req.params.id
        const filter = {_id: new ObjectId(id)}
      const updatedBook =req.body
      console.log(updatedBook);
      const updateDoc = {
        $set:{
          image: updatedBook.image,
          name: updatedBook.name,
          category: updatedBook.category,
          authorName: updatedBook.authorName,
          rating: updatedBook.rating,
        }
      }
      const result = await bookCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    // users API
    app.get('/borrowed',verifyToken, async(req, res)=>{
      console.log('token', req.cookies.token);
      console.log('valid token user', req.user);
      if(req.query.email !== req.user.email){
        return res.status(403).send({message: 'forbidden access'})
      }
      let query = {}
      if(req.query?.email){
        query = {email: req.query.email}
      }
      const result = await userCollection.find(query).toArray()
      res.send(result)
  })
    app.get('/borrow', async(req, res)=>{
      
      let query = {}
      if(req.query?.email){
        query = {email: req.query.email}
      }
      const result = await userCollection.find(query).toArray()
      res.send(result)
  })
    app.post('/borrowed', async(req, res)=>{
      const user = req.body
      console.log(user);
      const result = await userCollection.insertOne(user)
      res.send(result)
    })
    app.delete('/borrowed/:id', async(req,res)=>{
      const id = req.params.id
        const query = {_id: new ObjectId(id)}
        const result = await userCollection.deleteOne(query)
        res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', async(req,res)=>{
    res.send('BookBeacon is running')
})

app.listen(port, ()=>{
    console.log(`BookBeacon is running on port: ${port}`);
})