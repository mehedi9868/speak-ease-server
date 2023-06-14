const express = require("express");
const cors = require("cors");
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

//mongodb connect:

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kpjgmam.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        // collections 
        const usersCollection = client.db("speakEaseDb").collection("users");
        const instructorsCollection = client.db('speakEaseDb').collection('instructors')
        const classesCollection = client.db('speakEaseDb').collection('classes')
        const selectedClassesCollection = client.db('speakEaseDb').collection('selectedClasses')

        // users related apis
        app.get('/current-user', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const result = await usersCollection.findOne(query)
            res.send(result)
        })
        app.get('/all-users', async (req, res) => {
            const result = await usersCollection.find().toArray()
            res.send(result)
        })

        app.post('/all-users', async (req, res) => {
            const user = req.body;
            const query = { email: user?.email }
            const existingUser = await usersCollection.findOne(query);
            if (existingUser) {
                return res.send({})
            }
            const result = await usersCollection.insertOne(user)
            res.send(result)
        })

        app.put('/all-users/:id', async (req, res) => {
            const id = req.params.id;
            const role = req.query.role;
            const query = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    role: role
                }
            }
            const result = await usersCollection.updateOne(query, updatedDoc)
            res.send(result)
        })

        // instractors related apis:
        app.get('/instructors', async (req, res) => {
            const result = await instructorsCollection.find().toArray()
            res.send(result)
        })

        // class related apis:
        app.get('/all-classes', async (req, res) => {
            const result = await classesCollection.find().toArray()
            res.send(result)
        })
        app.get('/all-classes', async (req, res) => {
            const email = req.query.email;
            const query = { instructorEmail: email }
            const result = await classesCollection.find(query).toArray()
            res.send(result)
        })

        app.post('/all-classes', async (req, res) => {
            const classes = req.body
            const result = await classesCollection.insertOne(classes)
            res.send(result)
        })
        app.post('/selected-classes', async (req, res) => {
            const selectedClass = req.body;
            const result = await selectedClassesCollection.insertOne(selectedClass)
            res.send(result)
        })
        app.get('/selected-classes', async (req, res) => {
            const email = req.query.email;
            const query = { studentEmail: email }
            const result = await selectedCollection.find(query).toArray()
            res.send(result)
        })
        app.delete('/selected-classes/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await selectedCollection.deleteOne(query)
            res.send(result)
        })

        app.put('/all-classes/:id', async (req, res) => {
            const id = req.params.id;
            const status = req.query.status;
            const feedback = req.query.feedback;
            if (status == 'approved') {
                const query = { _id: new ObjectId(id) }
                const updatedDoc = {
                    $set: {
                        status: 'Approved'
                    }
                }
                const result = await classesCollection.updateOne(query, updatedDoc)
                res.send(result)
            }
            if (status == 'denied') {
                const query = { _id: new ObjectId(id) }
                const updatedDoc = {
                    $set: {
                        status: 'Denied'
                    }
                }
                const result = await classesCollection.updateOne(query, updatedDoc)
                res.send(result)
            }
            if (feedback) {
                const query = { _id: new ObjectId(id) }
                const updatedDoc = {
                    $set: {
                        feedback: feedback
                    }
                }
                const result = await classesCollection.updateOne(query, updatedDoc)
                res.send(result)
            }
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

// basic server running check :
app.get("/", (req, res) => {
    res.send("Speak Ease server is running...");
})

app.listen(port, () => {
    console.log(`Speak Ease server is running on port:${port}`);
})