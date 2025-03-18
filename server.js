const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const validator = require('validator');
const app = express();
const port = 3000;


app.use(helmet());


const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100 
});
app.use(limiter);


app.use(bodyParser.json());
app.use(express.static(__dirname));


function validateInput(input) {
    return {
        username: validator.isLength(input.username || '', { min: 3, max: 30 }) &&
                 validator.isAlphanumeric(input.username || ''),
        password: validator.isLength(input.password || '', { min: 6 })
    };
}

function loadData() {
    try {
        const data = fs.readFileSync('data.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { users: {}, messages: [] };
    }
}

function saveData(data) {
    try {
        fs.writeFileSync('data.json', JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error saving data:', error);
        return false;
    }
}

function isAdmin(token) {
    return token === ADMIN_USERNAME;
}
function errorHandler(err, req, res, next) {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'daftar.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/request', (req, res) => {
    res.sendFile(path.join(__dirname, 'request.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

const ADMIN_USERNAME = "wanzofc";
const ADMIN_PASSWORD = "wanzo321";


app.post('/signup', (req, res) => {
    try {
        const { username, password } = req.body;
        
        
        const validation = validateInput({ username, password });
        if (!validation.username || !validation.password) {
            return res.status(400).json({
                success: false,
                message: 'Invalid username or password format. Username should be alphanumeric (3-30 chars) and password at least 6 chars'
            });
        }

        const data = loadData();

        if (data.users[username]) {
            return res.status(400).json({
                success: false,
                message: 'Username sudah terdaftar.'
            });
        }

        data.users[username] = { password };
        if (!saveData(data)) {
            throw new Error('Failed to save user data');
        }

        res.status(201).json({
            success: true,
            message: 'Pendaftaran berhasil!'
        });
    } catch (error) {
        next(error);
    }
});

app.post('/login', (req, res) => {
    try {
        const { username, password } = req.body;
        const validation = validateInput({ username, password });
        if (!validation.username || !validation.password) {
            return res.status(400).json({
                success: false,
                message: 'Format username atau password tidak valid'
            });
        }

        const data = loadData();
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            return res.status(200).json({
                success: true,
                message: 'Admin login berhasil!',
                token: ADMIN_USERNAME
            });
        }

        if (!data.users[username] || data.users[username].password !== password) {
            return res.status(401).json({
                success: false,
                message: 'Username atau password salah'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Login berhasil!',
            token: username
        });
    } catch (error) {
        next(error);
    }
});

app.post('/send-message', (req, res) => {
    try {
        const { token, message } = req.body;
        const data = loadData();

        if (!token || !data.users[token]) {
            return res.status(403).json({
                success: false,
                message: 'Akses ditolak. Login dulu.'
            });
        }

        if (!message || typeof message !== 'string' || message.length < 1) {
            return res.status(400).json({
                success: false,
                message: 'Pesan tidak valid.'
            });
        }

        const newMessage = {
            sender: token,
            message: validator.escape(message),
            timestamp: new Date().toISOString(),
            id: Date.now(),
            replies: []
        };

        data.messages.push(newMessage);
        if (!saveData(data)) {
            throw new Error('Failed to save message');
        }

        res.status(201).json({
            success: true,
            message: 'Pesan terkirim!'
        });
    } catch (error) {
        next(error);
    }
});

const adminRoutes = [
    {
        path: '/get-messages',
        method: 'get',
        handler: (req, res) => {
            const data = loadData();
            res.status(200).json({
                success: true,
                messages: data.messages
            });
        }
    },
    {
        path: '/reply-message',
        method: 'post',
        handler: (req, res) => {
            const { messageId, reply } = req.body;
            const data = loadData();

            const message = data.messages.find(m => m.id === parseInt(messageId));
            if (!message) {
                return res.status(404).json({
                    success: false,
                    message: 'Pesan tidak ditemukan.'
                });
            }

            message.replies.push({
                sender: "admin",
                message: validator.escape(reply),
                timestamp: new Date().toISOString(),
            });

            if (!saveData(data)) {
                throw new Error('Failed to save reply');
            }

            res.status(200).json({
                success: true,
                message: 'Balasan terkirim!'
            });
        }
    }
];

function adminMiddleware(req, res, next) {
    const token = req.query.token || req.body.token;
    
    if (!isAdmin(token)) {
        return res.status(403).json({
            success: false,
            message: 'Akses ditolak.'
        });
    }
    next();
}

adminRoutes.forEach(route => {
    app[route.method](route.path, adminMiddleware, route.handler);
});

app.use(errorHandler);
app.listen(port, '0.0.0.0', () => {
    console.log(`Server berjalan di http://0.0.0.0:${port}`);
});
