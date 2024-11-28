const express = require("express");

const router = express.Router();

const userRouter = require("./user");

const ticketRouter = require("./ticket");

router.use("/user", userRouter);

router.use("/ticket" , ticketRouter);

module.exports = router