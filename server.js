const express = require('express');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const path = require('path'); // Import modul 'path'

const app = express();
const port = 3000;

app.use(express.json());
// Hapus atau komentari baris ini:
// app.use(express.static('.')); // Tidak diperlukan lagi

// Route untuk halaman utama (index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html')); // Kirim file index.html
});

app.post('/lookup', async (req, res) => {
  const phoneNumber = req.body.phoneNumber;

  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number is required.' });
  }

  try {
    const response = await fetch(`https://free-lookup.net/${phoneNumber}`);
    response.headers.set('Cache-Control', 'no-store');

    if (!response.ok) {
      return res.status(response.status).json({ error: `HTTP Error: ${response.statusText}` });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const infos = $('ul.report-summary__list > div');

    if (infos.length === 0) {
        return res.status(404).json({ error: 'Phone number information not found.' });
    }

    const result = {};
    for (let i = 0; i < infos.length; i += 2) {
      const key = $(infos[i]).text().trim();
      const value = (i + 1 < infos.length) ? $(infos[i + 1]).text().trim() : 'No information';
      result[key] = value || 'No information';
    }
     res.json(result);


  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred during lookup.' });
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
