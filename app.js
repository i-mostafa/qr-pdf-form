require("dotenv").config();
const express = require("express");
const qrcode = require("qrcode");
const fileUpload = require("express-fileupload");
const util = require("util");
const uuid = require("uuid");
const mongoose = require("mongoose");
const session = require("express-session");

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

const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
  },
};

app.use(session(sessionConfig));

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());

app.set("view engine", "ejs");
app.set("views", "views");

const isAuthenticated = (req, res, next) => {
  console.log(req.session);
  if (
    req.session.user &&
    req.session.user.username === process.env.ADMIN_USERNAME
  ) {
    return next();
  }
  res.redirect("/login");
};

app.get("/login", (req, res) => {
  res.render("login");
});
app.post("/login", (req, res) => {
  if (
    req.body.username === process.env.ADMIN_USERNAME &&
    req.body.password === process.env.ADMIN_PASSWORD
  ) {
    req.session.user = {
      username: req.body.username,
    };
    res.redirect("/");
  } else {
    res.redirect("/login");
  }
});

app.get("/", isAuthenticated, (req, res) => {
  res.render("new");
});
app.post("/new", isAuthenticated, (req, res) => {
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
