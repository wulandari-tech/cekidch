const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let clients = [];
let chatMessages = [];
let globalUsername = "Guest";
let globalProfileImageBase64 = "";

app.get('/', (req, res) => {
    fs.readFile('index.html', (err, data) => {
        if (err) {
            res.writeHead(500);
            return res.end('Error loading index.html');
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
    });
});

app.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const clientId = Date.now();
    const newClient = {
        id: clientId,
        res
    };
    clients.push(newClient);

    chatMessages.forEach(message => {
        newClient.res.write(`data: ${JSON.stringify(message)}\n\n`);
    });

    req.on('close', () => {
        console.log(`${clientId} Connection closed`);
        clients = clients.filter(client => client.id !== clientId);
    });
});

app.post('/send-message', (req, res) => {
    const { message, username, profileImageBase64 } = req.body;
    if (message) {
        const messageData = { message, username: globalUsername, profileImageBase64: globalProfileImageBase64 };
        chatMessages.push(messageData);

        if (chatMessages.length > 20) {
            chatMessages.shift();
        }

        clients.forEach(client => {
            client.res.write(`data: ${JSON.stringify(messageData)}\n\n`);
        });
        res.status(200).send('Message sent');
    } else {
        res.status(400).send('Message is required');
    }
});

app.post('/update-profile', (req, res) => {
    const { username, profileImageBase64 } = req.body;
    globalUsername = username || "Guest";
    globalProfileImageBase64 = profileImageBase64 || "";
    res.json({ username: globalUsername, profileImageBase64: globalProfileImageBase64 });
});

const port = 8080;
server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
