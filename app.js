require("dotenv").config();
const express = require("express");
const qrcode = require("qrcode");
const fileUpload = require("express-fileupload");
const util = require("util");
const uuid = require("uuid");
const mongoose = require("mongoose");

const app = express();

mongoose.connect(
  process.env.MONGO_URI,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  () => console.log("Connected to MongoDB")
);

const Result = mongoose.model("Result", {
  id: String,
  sampleType: String,
  collectedDateTime: String,
  result: String,
  resultDate: String,
  patientNumber: String,
  accession: String,
  patientName: String,
  nationality: String,
  sex: String,
  dob: String,
  requestDate: String,
  verifyDate: String,
  idNumber: String,
  payer: String,
  imgSrc: String,
  qrSrc: String,
});

app.use(express.static("public"));
app.use(fileUpload());

app.set("view engine", "ejs");
app.set("views", "views");

app.get("/", (req, res) => {
  res.render("new");
});
app.post("/new", (req, res) => {
  const run = async () => {
    const { image } = req.files;
    const moveFile = util.promisify(image.mv);
    const userId = uuid.v4();

    const fileName = `${userId}.png`;
    const filePath = `/uploads/${fileName}`;
    await moveFile("./public" + filePath);
    req.body.imgSrc = filePath;
    const qrFileName = `/qr/${userId}.png`;
    const qrPath = "./public" + qrFileName;
    await qrcode.toFile(qrPath, process.env.APP_URL + "/results/" + userId);
    req.body.qrSrc = qrFileName;
    req.body.id = userId;

    const result = await new Result(req.body).save();
    result.APP_URL = process.env.APP_URL;

    res.render("template", result);
  };
  run();
  //   res.redirect("/");
});

app.get("/results/:id", (req, res) => {
  const run = async () => {
    const result = await Result.findOne({ id: req.params.id });
    result.APP_URL = process.env.APP_URL;

    res.render("template", result);
  };
  run();
});

app.listen(process.env.PORT, () => {
  console.log("Server is running on port " + process.env.PORT);
});
