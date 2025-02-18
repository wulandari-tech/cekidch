const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const app = express();
const server = http.createServer(app);

app.use(express.json()); // Middleware untuk parsing body JSON
app.use(express.urlencoded({ extended: true })); // Middleware untuk parsing URL-encoded data

let clients = []; // Array untuk menyimpan klien SSE
let chatMessages = []; // Array untuk menyimpan pesan

// Routing untuk index.html
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

// Endpoint untuk SSE
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

    // Kirim pesan-pesan yang sudah ada saat klien terhubung
    chatMessages.forEach(message => {
        newClient.res.write(`data: ${message}\n\n`);
    });

    req.on('close', () => {
        console.log(`${clientId} Connection closed`);
        clients = clients.filter(client => client.id !== clientId);
    });
});

// Endpoint untuk menerima pesan dari client
app.post('/send-message', (req, res) => {
    const message = req.body.message;
    if (message) {
        chatMessages.push(message); // Simpan pesan
        // Batasi jumlah pesan yang disimpan (opsional)
        if (chatMessages.length > 20) {
            chatMessages.shift(); // Hapus pesan paling lama
        }

        // Kirim pesan ke semua klien SSE
        clients.forEach(client => {
            client.res.write(`data: ${message}\n\n`);
        });
        res.status(200).send('Message sent');
    } else {
        res.status(400).send('Message is required');
    }
});

const port = 8080;
server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
