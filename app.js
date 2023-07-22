const express = require("express");
const bodyParser = require("body-parser");

const qoohs = [];

const getTimestamp = (timestamp) => {
    var currentOffset = timestamp.getTimezoneOffset();
    var ISTOffset = 330;    // IST offset UTC +5:30 
    timestamp = new Date(timestamp.getTime() + (ISTOffset + currentOffset)*60000);
    let options = {
        day: "numeric",
        month: "long",
        year: "numeric",
    };
    let hours = timestamp.getHours();
    let timeFormat = "AM";
    if (hours > 12) {
        hours = hours - 12;
        timeFormat = "PM";
    }
    hours = hours.toString();
    if (hours.length === 1) {
        hours = "0" + hours;
    }
    let minutes = timestamp.getMinutes().toString();
    if (minutes.length === 1) {
        minutes = "0" + minutes;
    }
    let time = hours + ":" + minutes + " " + timeFormat + " IST";
    return time + ", " + timestamp.toLocaleDateString("en-US", options);
};

function Qooh(question, author, timestamp) {
    this.question = question;
    this.author = author;
    this.timestamp = timestamp;
}

const app = express();
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.get("/", (req, res) => {
    res.render("home", {qoohs: qoohs});
});

app.get("/compose", (req, res) => {
    res.render("compose");
});

app.post("/compose", (req, res) => {
    let question = req.body.question;
    let author = req.body.author;
    let timestamp = getTimestamp();
    if (author === "") {
        author = "Anonymous"
    }
    let qooh = new Qooh(question, author, timestamp);
    qoohs.push(qooh);
    res.redirect("/");
});

app.listen(process.env.PORT || 3000, () => {
    console.log("Server running on port " + (process.env.PORT || 3000));
});