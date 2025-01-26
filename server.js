const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const fetch = require('node-fetch');
const fs = require("fs");
const FormData = require('form-data');
const crypto = require("crypto");
const { pinterest, igdl, pinterest2, remini, mediafire, tiktok } = require('./downloader');
const app = express();
const PORT = 8080;


app.use(express.json({limit: '10mb'}))
// app.use(express.static('public')) // Hapus baris ini

//Endpoint for tiktok
app.post('/tiktok', async (req, res) => {
   try {
     const { text } = req.body;
      const result = await tiktok(text);
     res.json(result);
   } catch (error) {
      res.status(500).json({ message: error.message });
   }
});

// Endpoint for Pinterest
app.get('/pinterest', async (req, res) => {
  try {
    const { query } = req.query;
    const results = await pinterest(query);
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// Endpoint for Pinterest V2
app.get('/pinterest2', async (req, res) => {
  try {
    const { query } = req.query;
    const results = await pinterest2(query);
    res.json(results);
  } catch (error) {
     res.status(500).json({ message: error.message });
  }
});

// Endpoint for mediafire
app.get('/mediafire', async (req, res) => {
   try {
     const { query } = req.query;
     const results = await mediafire(query);
     res.json(results);
  } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


//endpoint for igdl
app.get('/igdl', async (req, res) => {
  try {
      const { query } = req.query;
      const results = await igdl(query);
      res.json(results);
  } catch (error) {
       res.status(500).json({ message: error.message });
    }
});
//Endpoint Remini
app.post('/remini', async (req, res) => {
    try {
        const { image } = req.body;
        const buffer = Buffer.from(image.split(",")[1], "base64");
        const enhancedImage = await remini(buffer);
        res.set('Content-Type', 'image/jpeg');
        res.send(enhancedImage);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});



app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
