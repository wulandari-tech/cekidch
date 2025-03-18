const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static(__dirname));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html')); // Kirim file index.html
});
app.get('/daftar', (req, res) => {
    res.sendFile(path.join(__dirname, 'daftar.html')); // Kirim file index.html
});
app.get('/request', (req, res) => {
    res.sendFile(path.join(__dirname, 'request.html')); // Kirim file index.html
});
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html')); // Kirim file index.html
});
// --- Admin Credentials (HARDCODED FOR THIS EXAMPLE - DO NOT DO THIS IN PRODUCTION!) ---
const ADMIN_USERNAME = "wanzofc";
const ADMIN_PASSWORD = "wanz321";

// --- Data Handling (Simpan ke data.json) ---

function loadData() {
    try {
        const data = fs.readFileSync('data.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { users: {}, messages: [] };
    }
}

function saveData(data) {
    fs.writeFileSync('data.json', JSON.stringify(data, null, 2), 'utf8');
}

// --- Helper Function: Check Admin Token ---
function isAdmin(token) {
    return token === ADMIN_USERNAME; //  Simple check for this example
}

// --- Endpoint ---

// Signup
app.post('/signup', (req, res) => {
    const { username, password } = req.body;
    const data = loadData();

    if (data.users[username]) {
        return res.status(400).json({ message: 'Username sudah terdaftar.' });
    }

    data.users[username] = { password };
    saveData(data);
    res.status(201).json({ message: 'Pendaftaran berhasil!' });
});

// Login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const data = loadData();
    // Check for admin login
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        return res.status(200).json({ message: 'Admin login berhasil!', token: ADMIN_USERNAME });
    }

    if (!data.users[username] || data.users[username].password !== password) {
        return res.status(401).json({ message: 'Username atau password salah.' });
    }
    res.status(200).json({ message: 'Login berhasil!', token: username });
});

// Kirim Pesan
app.post('/send-message', (req, res) => {
    const { token, message } = req.body;
    const data = loadData();

    if (!data.users[token]) {
        return res.status(403).json({ message: 'Akses ditolak. Login dulu.' });
    }

    const newMessage = {
        sender: token,
        message,
        timestamp: new Date().toISOString(),
        id: Date.now(),
        replies: []
    };

    data.messages.push(newMessage);
    saveData(data);
    res.status(201).json({ message: 'Pesan terkirim!' });
});

// Ambil Pesan (Admin Only)
app.get('/get-messages', (req, res) => {
    const { token } = req.query;
    const data = loadData();

    if (!isAdmin(token)) {
        return res.status(403).json({ message: 'Akses ditolak.' });
    }

    res.status(200).json({ messages: data.messages });
});

// Balas Pesan (Admin Only)
app.post('/reply-message', (req, res) => {
    const { token, messageId, reply } = req.body;
    const data = loadData();

    if (!isAdmin(token)) {
        return res.status(403).json({ message: 'Akses ditolak.' });
    }

    const message = data.messages.find(m => m.id === parseInt(messageId)); //messageId comes as string
    if (!message) {
        return res.status(404).json({ message: 'Pesan tidak ditemukan.' });
    }

    message.replies.push({
        sender: "admin",
        message: reply,
        timestamp: new Date().toISOString(),
    });
    saveData(data);
    res.status(200).json({ message: 'Balasan terkirim!' });
});

// --- New Endpoints for User Management (Admin Only) ---

// Get All Users
app.get('/get-users', (req, res) => {
    const { token } = req.query;
    const data = loadData();

    if (!isAdmin(token)) {
        return res.status(403).json({ message: 'Akses ditolak.' });
    }

    // Return usernames and passwords (SECURITY RISK!  Don't do this in production!)
    const users = Object.keys(data.users).map(username => ({
        username,
        password: data.users[username].password //  SECURITY RISK - sending passwords!
    }));
    res.status(200).json({ users });
});

// Create User (Admin Only)
app.post('/create-user', (req, res) => {
    const { token, username, password } = req.body;
    const data = loadData();

    if (!isAdmin(token)) {
        return res.status(403).json({ message: 'Akses ditolak.' });
    }
    if (data.users[username]) {
      return res.status(400).json({ message: 'Username sudah terdaftar.' });
    }

    data.users[username] = { password };
    saveData(data);
    res.status(201).json({ message: 'User berhasil dibuat!' });
});

// Delete User (Admin Only)
app.delete('/delete-user', (req, res) => {
    const { token, username } = req.body; // Get username from request body.
    const data = loadData();

    if (!isAdmin(token)) {
        return res.status(403).json({ message: 'Akses ditolak.' });
    }

    if (!data.users[username]) {
        return res.status(404).json({ message: 'User tidak ditemukan.' });
    }

    delete data.users[username];

    //Also delete the messages from that user.
    data.messages = data.messages.filter(msg => msg.sender !== username);
    saveData(data);
    res.status(200).json({ message: 'User berhasil dihapus!' });
});

// --- NEW: Get User Replies (for inbox) ---
app.get('/get-user-replies', (req, res) => {
    const { token } = req.query; // User's token.
    const data = loadData();

    if (!data.users[token]) {
        return res.status(403).json({ message: 'Akses ditolak. Login dulu.' });
    }

    // Find messages sent by the user *and* that have replies.
    const userMessagesWithReplies = data.messages
        .filter(message => message.sender === token && message.replies.length > 0);

    res.status(200).json({ replies: userMessagesWithReplies });
});


app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});
