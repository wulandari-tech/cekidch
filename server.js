const express = require('express');
const app = express();

app.get('/cekidch', async (req, res) => {
  const text = req.query.text;
  if (!text) return res.send("linkchnya");
  if (!text.includes("https://whatsapp.com/channel/")) return res.send("Link tautan tidak valid");
  let result = text.split('https://whatsapp.com/channel/')[1];
  let response = await conn.newsletterMetadata("invite", result);
  let teks = ` * *ID :* ${response.id} * *Nama :* ${response.name} * *Total Pengikut :* ${response.subscribers} * *Status :* ${response.state} * *Verified :* ${response.verification == "VERIFIED" ? "Terverifikasi" : "Tidak"} `;
  res.send(teks);
});

app.listen(3000, () => {
  console.log('Server started on port 3000');
});
