const express = require('express');
const app = express();
const fs = require("fs");
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const port = process.env.PORT || 8000;

app.get("/config.js", (_, res) => {
    res.send(`const CONFIG=${JSON.stringify({
        letterCount: 5,
    })}`);
});

app.use("/", express.static("./frontend"));

const valid_guesses = fs.readFileSync('valid_guesses.txt', 'utf8').split("\n");
const possible_answers = fs.readFileSync('possible_answers.txt', 'utf8').split("\n");

for (let i=valid_guesses.length-1; i>=0; i--) {
    if (valid_guesses.length === 0) {
        delete valid_guesses[i];
    }
}

for (let i=possible_answers.length-1; i>=0; i--) {
    if (possible_answers.length === 0) {
        delete possible_answers[i];
    }
}

let word;

let log;

const getRandomWord = () => {
    word = possible_answers[Math.floor(Math.random()*possible_answers.length)].toUpperCase();
    log = [];
}    

getRandomWord();


io.on("connection", (socket) => {
    console.log(`Got connection from socket ${socket.id}`);

    socket.emit("newWord");
    for (let i=0; i<log.length; i++) {
        socket.emit("validation", log[i][0], i, log[i][1]);
    }

    socket.on("newRandomWord", () => {
        getRandomWord();
        io.emit("newWord");
    });

    socket.on("newWord", (str) => {
        if (!valid_guesses.includes(str.toLowerCase())) {
            socket.emit("invalidNewWord");
            return;
        }
        log = [];
        word = str.toUpperCase();
        io.emit("newWord");
    });

    socket.on("validate", (str, i) => {
        if (!valid_guesses.includes(str.join("").toLowerCase())) {
            socket.emit("invalid");
            return;
        }
        const types = [];
        const unaccountedGuesses = {};
        for (let i=0; i<str.length; i++) {
            if (str[i] === word[i]) {
                types[i] = "green";
            } else {
                if (unaccountedGuesses.hasOwnProperty(word[i])) {
                    unaccountedGuesses[word[i]]++;
                } else {
                    unaccountedGuesses[word[i]] = 1;
                }
                types[i] = "grey";
            }
        }
        for (let i=0; i<str.length; i++) {
            if (types[i] === "green") {
                continue;
            }

            if (unaccountedGuesses[str[i]] > 0) {
                unaccountedGuesses[str[i]]--;
                types[i] = "yellow";
            }
        }
        log.push([types, str]);
        io.emit("validation", types, i, str);
    });
});

server.listen(port, () => {
    console.log(`Listening on port ${port}`)
});