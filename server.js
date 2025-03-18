const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static(__dirname)); // Sajikan file statis

// --- Data Handling (Simpan ke data.json) ---

function loadData() {
    try {
        const data = fs.readFileSync('data.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // Jika file belum ada atau error, buat struktur data awal
        return { users: {}, messages: [] };
    }
}

function saveData(data) {
    fs.writeFileSync('data.json', JSON.stringify(data, null, 2), 'utf8');
}


// --- Endpoint ---

// Signup
app.post('/signup', (req, res) => {
    const { username, password } = req.body;
    const data = loadData();

    if (data.users[username]) {
        return res.status(400).json({ message: 'Username sudah terdaftar.' });
    }

    data.users[username] = { password }; // Simpan password (seharusnya di-hash!)
    saveData(data);
    res.status(201).json({ message: 'Pendaftaran berhasil!' });
});

// Login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const data = loadData();

    if (!data.users[username] || data.users[username].password !== password) {
        return res.status(401).json({ message: 'Username atau password salah.' });
    }

    // Sesi sederhana (gunakan JWT atau library sesi yang lebih baik di produksi)
    res.status(200).json({ message: 'Login berhasil!', token: username }); // Kirim "token" sederhana
});


// Kirim Pesan (Perlu token)
app.post('/send-message', (req, res) => {
    const { token, message } = req.body;
    const data = loadData();

    if (!data.users[token]) {
        return res.status(403).json({ message: 'Akses ditolak.  Login dulu.' });
    }
  const now = new Date();
    const newMessage = {
        sender: token,
        message,
        timestamp: now.toISOString(), //  ISO 8601 format
        id: Date.now(),  // ID unik berdasarkan timestamp
        replies: [] //  Untuk menyimpan balasan dari admin
    };

    data.messages.push(newMessage);
    saveData(data);
    res.status(201).json({ message: 'Pesan terkirim!' });
});

// Ambil Pesan (Hanya untuk admin - token khusus)
app.get('/get-messages', (req, res) => {
    const { token } = req.query;
     const data = loadData();

     const adminUsername = Object.keys(data.users)[0];
    if (token !== adminUsername ) { //  Token admin harus sama dengan username admin
        return res.status(403).json({ message: 'Akses ditolak.' });
    }

    res.status(200).json({ messages: data.messages });
});


// Balas Pesan (Hanya untuk admin - token khusus + ID pesan)
app.post('/reply-message', (req, res) => {
    const { token, messageId, reply } = req.body;
    const data = loadData();

    const adminUsername = Object.keys(data.users)[0]; // Dapatkan username admin pertama

    if (token !== adminUsername) { //  Token admin sederhana.  Harusnya lebih aman.
        return res.status(403).json({ message: 'Akses ditolak.' });
    }

    const message = data.messages.find(m => m.id === messageId);
    if (!message) {
        return res.status(404).json({ message: 'Pesan tidak ditemukan.' });
    }

      const now = new Date();
    message.replies.push({
      sender: "admin", // Atau username admin yang sebenarnya.
      message: reply,
      timestamp: now.toISOString(),
    });
    saveData(data);
    res.status(200).json({ message: 'Balasan terkirim!' });
});
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html')); // Kirim file index.html
});
app.get('/request', (req, res) => {
    res.sendFile(path.join(__dirname, 'request.html')); // Kirim file index.html
});
app.get('/daftar', (req, res) => {
    res.sendFile(path.join(__dirname, 'daftar.html')); // Kirim file index.html
});

app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});
