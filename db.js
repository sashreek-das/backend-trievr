const mongoose = require("mongoose");
const uri = "mongodb+srv://21051167:sashreek@cluster0.gpnmg5z.mongodb.net/";

mongoose.connect(uri)
    .then(() => {
        console.log("connceted to db");
    })
    .catch((error) => {
        console.error("error connecting to db", error);
    });

mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to db')
})
mongoose.connection.on('error', (error) => {
    console.log('Mongoose connection error')
})
mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected to db')
})



const friendSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to the User model
        required: true
    }
}, { _id: false }); // Don't generate _id for sub-schema documents

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    tasksTaken: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ticket'
    }],
    userFriends: [friendSchema], // Existing friends array
    friendRequestsReceived: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' // References the users who sent friend requests
    }],
    friendRequestsSent: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' // References the users to whom friend requests were sent
    }],
    name: {
        type: String,
        required: false
    }
}, {
    timestamps: true
});

const ticketSchema = new mongoose.Schema({
    task: {
        type: String,
        required: true
    },
    taken: {
        type: Number,
        default: 0
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },  // Reference to the User model
    takenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    takenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }

}, {
    timestamps: true
});




const User = mongoose.model("User", userSchema);
const Ticket = mongoose.model("Ticket", ticketSchema);

module.exports = {
    User,
    Ticket
}