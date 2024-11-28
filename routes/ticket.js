const express = require("express");
const { authMiddleware } = require("./middleware");
const { User, Ticket } = require("../db");


const router = express.Router();

router.post('/createTask', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const { task } = req.body;


        const newTask = new Ticket({
            task,
            userId,
            taken: 0
        });

        await newTask.save();

        return res.status(201).json({
            message: "Task created successfully",
            task: newTask
        });
    } catch (error) {
        console.error("Error creating task:", error);
        return res.status(500).json({ message: "An error occurred while creating the task" });
    }
});



router.get("/allTasks", authMiddleware, async (req, res) => {
    try {
        const tasks = await Ticket.find({});
        return res.json({ tasks });
    } catch (error) {
        res.status(500).json({ error: "Error fetching tasks from the database" });
    }
});




router.get("/assignedTasks", authMiddleware, async (req, res) => {
    try {
        const userId = req.userId; // Get the logged-in user's ID from the request

        // Find the user
        const user = await User.findById(userId).populate('tasksTaken');
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Send the user's assigned tasks
        return res.json({
            message: "Assigned tasks retrieved successfully",
            tasks: user.tasksTaken
        });
    } catch (error) {
        console.error("Error retrieving assigned tasks:", error);
        return res.status(500).json({ message: "An error occurred while retrieving assigned tasks" });
    }
});


router.get("/remainingTasks", authMiddleware, async (req, res) => {
    try {
        const remainingTasks = await Ticket.find({ taken: { $in: [0, 1] } });
        res.json({
            message: "Remaining tasks fetched successfully",
            tasks: remainingTasks
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Error fetching remaining tasks" });
    }
});


router.get("/my-tickets", authMiddleware, async (req, res) => {
    const { userId } = req; // Access userId from the middleware

    try {
        const tickets = await Ticket.find({
            $or: [
                { userId: userId },  // Check if the user created the ticket
                { takenBy: userId }   // Check if the user took the ticket
            ]
        })
        .populate("userId", "name email")  // Optional: Populate user details for createdBy (userId)
        .populate("takenBy", "name email"); // Optional: Populate user details for takenBy

        if (!tickets || tickets.length === 0) {
            return res.status(404).json({ message: "No tickets found." });
        }

        return res.status(200).json(tickets);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
    }
});


module.exports = router;











router.get("/takeTask/:taskId", authMiddleware, async (req, res) => {
    try {
        const { taskId } = req.params;
        const { userId: providedUserId } = req.query; // Retrieve userId from query parameters if provided
        const task = await Ticket.findById(taskId);

        console.log("Task found:", task);

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        if (task.taken < 2) {
            task.taken += 1; // Increment the taken count
            if(!task.takenBy){
                task.takenBy = [req.userId];
            }
            else if(!task.takenBy.includes(req.userId)){
                task.takenBy.push(req.userId);
            }
            await task.save(); // Save the task to the database

            // Log the updated task details after saving
            console.log("Updated Task:", task);

            // Determine which user should be assigned the task
            const userIdToAssign = providedUserId || req.userId; // Use provided userId or logged-in userId

            // Find the user who is taking the task
            const user = await User.findById(userIdToAssign);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            // Check if the task is already in the user's taken tasks array
            if (!user.tasksTaken.includes(taskId)) {
                user.tasksTaken.push(taskId); // Push the taskId to the user's array
            }

            // Log the updated user details
            console.log("Updated User Tasks:", user.tasksTaken);

            // Save the user with the updated tasksTaken array
            await user.save();

            return res.json({
                message: "Task assigned to the user. Continue with the given task",
                task: task
            });
        } else {
            // Log the taken status if it's already 2 or more
            console.log("Task already taken by 2 people");

            return res.status(400).json({
                message: "Sorry, this task has already been taken by 2 people"
            });
        }
    } catch (error) {
        // Log any error for debugging
        console.error("Error:", error);

        return res.status(500).json({ message: "An error occurred while taking the task" });
    }
});



router.post("/complete-task/:taskId", authMiddleware, async (req, res) => {
    const { taskId } = req.params;

    try {
        const task = await Ticket.findById(taskId);

        if (!task) return res.status(404).json({ message: "Task not found" });

        // Set the verification request
        task.verifyFinishedTasks = true;
        await task.save();

        return res.status(200).json({ message: "Task completion submitted for verification." });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Error marking task as complete." });
    }
});


router.post("/verify-task/:taskId", authMiddleware, async (req, res) => {
    const { taskId } = req.params;

    try {
        const task = await Ticket.findById(taskId);

        if (!task) return res.status(404).json({ message: "Task not found" });
        if (!task.verifyFinishedTasks) return res.status(400).json({ message: "No completion request for this task." });

        // Verify completion or reassign task
        if (req.body.verify === true) {
            task.verifyFinishedTasks = false; // Reset verification field
            task.taken = 2; // Mark task as completed
        } else {
            task.taken = 1; // Reset taken count if not verified
            task.takenBy = null;
            task.verifyFinishedTasks = false; // Reset verification field
        }

        await task.save();

        return res.status(200).json({ message: req.body.verify ? "Task verified as complete." : "Task reassigned." });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Error verifying task completion." });
    }
});
