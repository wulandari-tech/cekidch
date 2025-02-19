const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const security = require('./security'); // Pastikan file ini ada!

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const dbFilePath = path.join(__dirname, 'database.json');

// Helper function to read data from database.json
function readDatabase() {
    try {
        const data = fs.readFileSync(dbFilePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading database file:', err);
        // Jika file tidak ada, buat dengan struktur default
        if (err.code === 'ENOENT') {
            console.log('Database file tidak ditemukan, membuat yang baru...');
            const defaultData = { users: [], messages: [], rooms: [{ name: 'General' }] };
            fs.writeFileSync(dbFilePath, JSON.stringify(defaultData, null, 2), 'utf8');
            console.log('File database baru dibuat.');
            return defaultData;
        }
        return { users: [], messages: [], rooms: [{ name: 'General' }] }; // Kembalikan data default
    }
}

// Helper function to write data to database.json
function writeDatabase(data) {
    try {
        fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        console.error('Error writing to database file:', err);
    }
}

// Inisialisasi database
let db = readDatabase();

// Load data awal dari database
let users = db.users;
let messages = db.messages;
let rooms = db.rooms || [{ name: 'General' }];

// Gunakan objek untuk menyimpan nama pengguna yang telah diambil
const takenUsernames = new Set(users.map(user => user.username));

let globalProfileImageBase64 = "";
let clients = [];

app.use(express.static(path.join(__dirname, ''))); // Melayani file statis  CSS, JS)

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html')); // Kirim file index.html
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

    // Kirim pesan yang ada ke klien baru
    messages.forEach(message => {
        newClient.res.write(`data: ${JSON.stringify(message)}\n\n`);
    });

    req.on('close', () => {
        console.log(`${clientId} Connection closed`);
        clients = clients.filter(client => client.id !== clientId);
    });
});

app.post('/send-message', (req, res) => {
    let { message, username, profileImageBase64, room } = req.body;
    message = security.sanitizeString(message); // Sanitasi pesan

    const messageData = {
        message: message,
        username: username, // Gunakan nama pengguna yang dikirim dari klien
        profileImageBase64: profileImageBase64,
        room: room
    };

    messages.push(messageData);

    // Batasi jumlah pesan
    if (messages.length > 200) {
        messages.shift();
    }

    clients.forEach(client => {
        client.res.write(`data: ${JSON.stringify(messageData)}\n\n`);
    });

    db.messages = messages;
    writeDatabase(db);

    res.status(200).send('Message sent');
});

app.post('/update-profile', (req, res) => {
    let { username, profileImageBase64 } = req.body;
    username = security.sanitizeString(username); // Sanitasi nama pengguna

    // Periksa apakah nama pengguna sudah digunakan
    if (takenUsernames.has(username)) {
        return res.status(400).json({ message: 'Nama pengguna sudah digunakan.' });
    }

    // Jika nama pengguna baru, tambahkan ke set
    if (!users.find(user => user.username === username)) {
        takenUsernames.add(username);
    }

    // Update profil
    globalUsername = username || "Guest"; // Jika kosong, gunakan "Guest"
    globalProfileImageBase64 = profileImageBase64 || "";

    // Perbarui atau buat pengguna
    let existingUserIndex = users.findIndex(user => user.username === globalUsername);
    if (existingUserIndex !== -1) {
        // Perbarui pengguna yang ada
        users[existingUserIndex] = { username: globalUsername, profileImageBase64: globalProfileImageBase64 };
    } else {
        // Buat pengguna baru
        const newUser = { username: globalUsername, profileImageBase64: globalProfileImageBase64 };
        users.push(newUser);
    }

    // Update database
    db.users = users;
    writeDatabase(db);

    res.json({ username: globalUsername, profileImageBase64: globalProfileImageBase64 });
});

// Endpoint untuk mendapatkan daftar ruang obrolan
app.get('/chat-rooms', (req, res) => {
    res.json(rooms);
});

app.post('/create-room', (req, res) => {
    const { name } = req.body;
    // Check jika ruang sudah ada
    if (rooms.find(room => room.name === name)) {
        return res.status(400).json({ message: 'Ruang sudah ada' });
    }

    const newRoom = { name: security.sanitizeString(name) };
    rooms.push(newRoom);

    // Update database
    db.rooms = rooms;
    writeDatabase(db);

    res.status(201).json(rooms);
});

app.get('/load-data', (req, res) => {
    res.json({ username: globalUsername, profileImageBase64: globalProfileImageBase64, rooms: rooms });
});

app.get('/messages/:room', (req, res) => {
    const roomName = req.params.room;
    const roomMessages = messages.filter(message => message.room === roomName);
    res.json(roomMessages);
});

const port = 8080;
server.listen(port, () => {
    console.log(`Server mendengarkan di port ${port}`);
});
