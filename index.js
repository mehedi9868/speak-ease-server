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
        const userCollection = client.db("speakEaseDb").collection("users");
        const instructorsCollection = client.db('speakEaseDb').collection('instructors')
        const classesCollection = client.db('speakEaseDb').collection('classes')
        const selectedClassCollection = client.db('speakEaseDb').collection('selectedClasses')
        const enrolledClassCollection = client.db('speakEaseDb').collection('enrolledClasses')
        const paymentCollection = client.db('speakEaseDb').collection('payments')

        const classCollection = client.db('MindFulness').collection('allClasses')

        const arrivingClassCollection = client.db('MindFulness').collection('arrivingClasses')

        // users related apis
        app.get('/current-user', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const result = await userCollection.findOne(query)
            res.send(result)
        })
        app.get('/all-users', async (req, res) => {
            const result = await userCollection.find().toArray()
            res.send(result)
        })

        app.post('/all-users', async (req, res) => {
            const user = req.body;
            const query = { email: user?.email }
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({})
            }
            const result = await userCollection.insertOne(user)
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
            const result = await userCollection.updateOne(query, updatedDoc)
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

        // selected class related apis:
        app.post('/selected-classes', async (req, res) => {
            const selectedClass = req.body;
            const result = await selectedClassCollection.insertOne(selectedClass)
            res.send(result)
        })
        app.get('/selected-classes', async (req, res) => {
            const email = req.query.email;
            const query = { studentEmail: email }
            const result = await selectedClassCollection.find(query).toArray()
            res.send(result)
        })
        app.delete('/selected-classes/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await selectedClassCollection.deleteOne(query)
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

        // payment related apis:
        app.post("/create-payment-intent", async (req, res) => {
            const { price } = req.body;
            const amount = Math.round(price * 100);
            const stripeClient = stripe(process.env.STRIPE_KEY);
            try {
                // Create a PaymentIntent with the order amount and currency
                const paymentIntent = await stripeClient.paymentIntents.create({
                    amount: amount,
                    currency: "usd",
                    automatic_payment_methods: {
                        enabled: true,
                    },
                });

                res.send({
                    clientSecret: paymentIntent.client_secret,
                });
            } catch (error) {
                console.log(error);
                res.status(500).send({ error: "An error occurred while creating the PaymentIntent." });
            }
        });
        app.post('/payment', async (req, res) => {
            const payment = req.body;
            const insertResult = await paymentCollection.insertOne(payment);

            const enrolledQuery = { studentEmail: payment.email, classId: payment.classId }
            const enrolledClass = await selectedClassCollection.findOne(enrolledQuery)
            const enrolledInsertResult = await enrolledClassCollection.insertOne(enrolledClass)

            const enrolledDeleteResult = await selectedClassCollection.deleteOne(enrolledQuery)

            const classQuery = { _id: new ObjectId(payment.classId) };
            const classDocument = await classCollection.findOne(classQuery); // Fetch the latest document

            if (classDocument && classDocument.seats > 0) {
                const updatedSeats = classDocument.seats - 1;
                const updateEnrolledStudents = classDocument.enrolledStudents + 1;
                const updateResult = await classCollection.updateOne(
                    classQuery,
                    { $set: { seats: updatedSeats, enrolledStudents: updateEnrolledStudents } }
                );

                res.send({ insertResult, updateResult, enrolledDeleteResult, enrolledInsertResult });
            }
        });
        app.get('/payment-history', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const result = await paymentCollection.find(query).sort({ date: -1 }).toArray()
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

// basic server running check :
app.get("/", (req, res) => {
    res.send("Speak Ease server is running...");
})

app.listen(port, () => {
    console.log(`Speak Ease server is running on port:${port}`);
})