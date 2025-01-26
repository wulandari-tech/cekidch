const express = require('express');
const path = require('path'); // Import modul path
const app = express();

// Endpoint untuk cek ID channel
app.get('/cekidch', async (req, res) => {
  const text = req.query.text;
  if (!text) return res.send("linkchnya");
  if (!text.includes("https://whatsapp.com/channel/")) return res.send("Link tautan tidak valid");
  let result = text.split('https://whatsapp.com/channel/')[1];
  
  // Simulasi data response (ganti dengan koneksi sebenarnya)
  let response = {
    id: result,
    name: "Nama Channel",
    subscribers: 1000,
    state: "Aktif",
    verification: "VERIFIED"
  };

  let teks = `
    *ID:* ${response.id}
    *Nama:* ${response.name}
    *Total Pengikut:* ${response.subscribers}
    *Status:* ${response.state}
    *Verified:* ${response.verification === "VERIFIED" ? "Terverifikasi" : "Tidak"}
  `;
  res.send(teks);
});

// Middleware untuk melayani index.html dari root direktori
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Menjalankan server
app.listen(8080, () => {
  console.log('Server started on port 8080');
});
