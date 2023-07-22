const express = require("express");
const ip = require("ip");
const http = require("http");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

var dbConnection;
var Post;
const postSchema = new mongoose.Schema({
    content: {type: String},
    author: {type: String},
    createdAt: {type: Number},
    ipAddress: {type: Buffer},
    ipGeolocation: {type: Object}
}, { collection: "posts" });

const setupDB = async () => {
    dbConnection = mongoose.createConnection(`${process.env.MONGODB_URI}/postsDB`)
    Post = dbConnection.model("post", postSchema);
    console.log("Database setup complete")
}

const formatDuration = sec => {
    if (sec < 0) sec = -sec;
    let time = {
        year: Math.floor(sec / 31536000000),
        day: Math.floor(sec / 86400000),
        hour: Math.floor(sec / 3600000) % 24,
        minute: Math.floor(sec / 60000) % 60,
        second: Math.floor(sec / 1000) % 60,
    };
    let formattedDuration = Object.entries(time)
        .filter(val => val[1] !== 0)
        .map(([key, val]) => `${val} ${key}${val !== 1 ? "s" : ""}`);
    return formattedDuration[0];
};

app.get("/", async (req, res) => {
    let posts = await Post.find({}).sort({createdAt: -1});
    let postArray = [];
    posts.forEach((post) => {
        postArray.push({
            content: post.content,
            author: post.author,
            createdAt: formatDuration(Date.now() - (post.createdAt * 1000))
        });
    });
    res.render("home", {posts: postArray});
});

app.get("/write", async (req, res) => {
    res.render("write");
});

const getIpFromRequest = (req) => {
    let ips = (
        req.headers['cf-connecting-ip'] ||
        req.headers['x-real-ip'] ||
        req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress || ''
    ).split(',');

    return ips[0].trim();
};

app.post("/write", async (req, res) => {
    if (!Post || !dbConnection) {
        res.send("Could not publish post, please try again later.");
        return;
    }
    let content = req.body.content;
    let author = req.body.author;

    if (content === "") {
        res.send("You need to write some text in content!");
        return;
    }

    if (author === "") {
        author = "Anonymous"
    }

    let options = {
        hostname: "ip-api.com",
        path: `/json/${getIpFromRequest(req)}`,
        // path: `/json/24.48.0.1`,
        method: "GET"
    };

    let newPost = new Post({
        content: content,
        author: author,
        createdAt: Math.floor(Date.now() / 1000),
        ipAddress: ip.toBuffer(getIpFromRequest(req))
    });

    let httpRequest = http.request(options, (httpResponse) => {
        let data = ""

        httpResponse.on("data", (chunk) => {
            data += chunk;
        });

        // Ending the response 
        httpResponse.on("end", async () => {
            if (data !== undefined) {
                newPost.ipGeolocation = JSON.parse(data);
            } else {
                newPost.ipGeolocation = {};
            }
            await newPost.save();
            res.redirect("/");
        });

    }).on("error", async (err) => {
        newPost.ipGeolocation = {};
        await newPost.save();
        res.redirect("/");
    }).end();
});

setupDB()

app.listen(process.env.PORT || 3000, () => {
    console.log(`Server running on port ${process.env.PORT || 3000}`);
});

module.exports = app;