const express = require("express");
const cors = require("cors");


const app = express();


app.use(cors());
app.use(express.json());


const port = 9090;

const rootRouter = require("./routes/index");


app.get("/",(req,res)=>{
    res.json({"asjfoi":"fwef"});
});

app.use("/api/v1/", rootRouter);

app.listen(port, () => {
    console.log(`listening at port ${port}`);
})