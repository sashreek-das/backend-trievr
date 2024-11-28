const express = require("express");
const { User, Ticket } = require("../db")
const jwt = require("jsonwebtoken")
const { JWT_SECRET } = require("../config");
const { authMiddleware } = require("./middleware");

const router = express.Router();


router.post('/signup', async (req, res) => {
    try {

        const existingUser = await User.findOne({
            email: req.body.email
        })
        if (existingUser) {
            res.status(409).json({
                mssg: "account exists with this email"
            })
        }
        const user = await User.create({
            email: req.body.email,
            password: req.body.password
        });
        const userId = user._id;

        const token = jwt.sign({ userId }, JWT_SECRET);

        res.json({
            mssg: "user created",
            token,
            userId
        })
    }
    catch (error) {
        console.error('Error while Signup', error)
        res.status(500).json({
            mssg: "Internal server error"
        })
    }
})


router.post('/signin', async (req, res) => {
    try {
        const user = await User.findOne({
            email: req.body.email,
            password: req.body.password
        });

        if (user) {
            const token = jwt.sign({ userId: user._id }, JWT_SECRET);
            return res.json({
                mssg:"signed in",
                token,
                userId: user._id
            });
        }
        res.status(401).json({
            mssg: "error logging in "
        })
    }
    catch (error) {
        console.error("error in signin");
        res.status(500).json({
            mssg: 'Internal server error'
        });
    }

})


router.get("/myTasks", authMiddleware, async (req, res) => {
    try {
        const userId = req.userId; // User ID set by authMiddleware
        console.log("Fetching tasks for user:", userId);

        const tasks = await Ticket.find({ userId: userId });

        console.log("Tasks found:", tasks);

        if (tasks.length === 0) {
            return res.status(404).json({ message: "No tasks found assigned to you." });
        }

        return res.json({
            message: "Tasks assigned to you fetched successfully.",
            tasks: tasks
        });
    } catch (error) {
        console.error("Error fetching tasks:", error);
        return res.status(500).json({ message: "An error occurred while fetching your tasks." });
    }
});



router.post('/addFriend/:friendId', authMiddleware, async (req, res) => {
    try {
        const { friendId } = req.params;
        const userId = req.userId; // Extracted from auth middleware (assumes userId is added to req)

        // Check if the friendId is valid and different from the userId
        if (userId === friendId) {
            return res.status(400).json({ message: "You cannot friend yourself." });
        }

        // Find the user who wants to add a friend
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Check if the user is already friends with the target user
        if (user.userFriends.some(friend => friend.userId.toString() === friendId)) {
            return res.status(400).json({ message: "User is already a friend." });
        }

        // Add the friend to the user's userFriends array
        user.userFriends.push({ userId: friendId });
        await user.save();

        return res.status(200).json({ message: "Friend added successfully." });
    } catch (error) {
        console.error("Error adding friend:", error);
        return res.status(500).json({ message: "An error occurred while adding the friend." });
    }
});



router.get('/friends', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId; // Extracted from auth middleware (assumes userId is added to req)

        // Find the user
        const user = await User.findById(userId).populate('userFriends.userId', 'email name'); // Populate the userFriends array with friend details
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Return the list of friends
        return res.status(200).json({ friends: user.userFriends });
    } catch (error) {
        console.error("Error fetching friends:", error);
        return res.status(500).json({ message: "An error occurred while fetching friends." });
    }
});

router.get('/all', authMiddleware, async (req, res) => {
    try {
        // Find all users in the database
        const users = await User.find({}, 'email name'); // Specify the fields to return

        if (!users || users.length === 0) {
            return res.status(404).json({ message: "No users found." });
        }

        return res.status(200).json({ users });
    } catch (error) {
        console.error("Error fetching users:", error);
        return res.status(500).json({ message: "An error occurred while fetching users." });
    }
});

router.get('/myCreatedTasks', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId; // User ID set by authMiddleware
        console.log("Fetching tasks created by user:", userId);

        // Find tasks created by the logged-in user
        const tasks = await Ticket.find({ createdBy: userId }).populate('assignedTo', 'email name'); // 'assignedTo' is assumed to be the field linking the task to the user working on it.

        console.log("Tasks found:", tasks);

        if (tasks.length === 0) {
            return res.status(404).json({ message: "No tasks found created by you." });
        }

        // Send back the tasks with the assigned user details
        return res.json({
            message: "Tasks created by you fetched successfully.",
            tasks: tasks.map(task => ({
                taskId: task._id,
                title: task.title,
                description: task.description,
                assignedTo: task.assignedTo // This will include the user details of the person assigned
            }))
        });
    } catch (error) {
        console.error("Error fetching created tasks:", error);
        return res.status(500).json({ message: "An error occurred while fetching your created tasks." });
    }
});


router.post('/sendFriendRequest/:friendId', authMiddleware, async (req, res) => {
    try {
        const { friendId } = req.params;
        const userId = req.userId; // Extract from auth middleware

        const sender = await User.findById(userId);
        const recipient = await User.findById(friendId);

        // Check if the friend request was already sent or if they are already friends
        if (sender.friendRequestsSent.includes(friendId) || recipient.friendRequestsReceived.includes(userId)) {
            return res.status(400).json({ message: "Friend request already sent." });
        }
        
        if (sender.userFriends.some(friend => friend.userId.equals(friendId))) {
            return res.status(400).json({ message: "User is already a friend." });
        }

        // Add the friend request
        sender.friendRequestsSent.push(friendId);
        recipient.friendRequestsReceived.push(userId);

        await sender.save();
        await recipient.save();

        res.status(200).json({ message: "Friend request sent." });
    } catch (err) {
        console.error("Error sending friend request:", err);
        res.status(500).json({ message: "Error sending friend request." });
    }
});





router.post('/approveFriendRequest/:friendId', authMiddleware, async (req, res) => {
    try {
        const { friendId } = req.params;
        const userId = req.userId; // Extracted from auth middleware

        const user = await User.findById(userId);
        const friend = await User.findById(friendId);

        // Check if the friend request exists
        if (!user.friendRequestsReceived.includes(friendId)) {
            return res.status(400).json({ message: "No friend request to approve." });
        }

        // Approve the friend request
        user.userFriends.push({ userId: friendId });
        friend.userFriends.push({ userId: userId });

        // Remove from pending requests
        user.friendRequestsReceived.pull(friendId);
        friend.friendRequestsSent.pull(userId);

        await user.save();
        await friend.save();

        res.status(200).json({ message: "Friend request approved." });
    } catch (err) {
        console.error("Error approving friend request:", err);
        res.status(500).json({ message: "Error approving friend request." });
    }
});




router.post('/rejectFriendRequest/:friendId', authMiddleware, async (req, res) => {
    try {
        const { friendId } = req.params;
        const userId = req.userId; // Extracted from auth middleware

        const user = await User.findById(userId);
        const friend = await User.findById(friendId);

        // Check if the friend request exists
        if (!user.friendRequestsReceived.includes(friendId)) {
            return res.status(400).json({ message: "No friend request to reject." });
        }

        // Remove from pending requests
        user.friendRequestsReceived.pull(friendId);
        friend.friendRequestsSent.pull(userId);

        await user.save();
        await friend.save();

        res.status(200).json({ message: "Friend request rejected." });
    } catch (err) {
        console.error("Error rejecting friend request:", err);
        res.status(500).json({ message: "Error rejecting friend request." });
    }
});


router.get('/friendRequests', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId; // Extracted from the auth middleware

        // Find the user and populate the friendRequestsReceived array
        const user = await User.findById(userId).populate('friendRequestsReceived', 'email name');
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Send back the received friend requests
        return res.status(200).json({ friendRequestsReceived: user.friendRequestsReceived });
    } catch (err) {
        console.error("Error fetching friend requests:", err);
        return res.status(500).json({ message: "Failed to fetch friend requests." });
    }
});

module.exports = router;