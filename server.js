const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const security = require('./security');

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
    // If file doesn't exist, create it with default structure
    if (err.code === 'ENOENT') {
      console.log('Database file not found, creating a new one...');
      const defaultData = { users: [], messages: [], rooms: [{ name: 'General' }] };
      fs.writeFileSync(dbFilePath, JSON.stringify(defaultData, null, 2), 'utf8');
      console.log('New database file created successfully.');
      return defaultData;
    }
    return { users: [], messages: [], rooms: [{ name: 'General' }] }; // Return default data
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
// Initialize database with "General" room if it's empty
let db = readDatabase();

// Load initial data from database
let users = db.users;
let messages = db.messages;
let rooms = db.rooms || [{ name: 'General' }]; // Ensure rooms exist, default to 'General'

let globalUsername = "Guest";
let globalProfileImageBase64 = "";
let clients = [];

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

  // Send existing messages to the new client
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
  message = security.sanitizeString(message); // Sanitize message

  const messageData = {
    message: message,
    username: globalUsername,
    profileImageBase64: globalProfileImageBase64,
    room: room
  };

  messages.push(messageData);

  // Keep only the latest 200 messages
  if (messages.length > 200) {
    messages.shift();
  }

  clients.forEach(client => {
    client.res.write(`data: ${JSON.stringify(messageData)}\n\n`);
  });

  // Update database
  db.messages = messages;
  writeDatabase(db);

  res.status(200).send('Message sent');
});

app.post('/update-profile', (req, res) => {
  const { username, profileImageBase64 } = req.body;
  globalUsername = username || "Guest";
  globalProfileImageBase64 = profileImageBase64 || "";

  // Update database
  db.users = [{ username: globalUsername, profileImageBase64: globalProfileImageBase64 }]; // Store only one user
  writeDatabase(db);

  res.json({ username: globalUsername, profileImageBase64: globalProfileImageBase64 });
});
// Add this endpoint to serve the rooms data
app.get('/chat-rooms', (req, res) => {
  res.json(rooms); // Send the rooms array as a JSON response
});
app.post('/create-room', (req, res) => {
  const { name } = req.body;
  // Check if room already exists
  if (rooms.find(room => room.name === name)) {
    return res.status(400).json({ message: 'Room already exists' });
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
  console.log(`Server listening on port ${port}`);
});
