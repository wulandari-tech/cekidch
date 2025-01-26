const express = require('express');
const path = require('path');
const { default: makeWASocket, useSingleFileAuthState } = require('@adiwajshing/baileys');
const app = express();
const { state, saveState } = useSingleFileAuthState('./auth_info.json');
const conn = makeWASocket({
  auth: state,
});
conn.ev.on('creds.update', saveState);
app.get('/cekidch', async (req, res) => {
  const text = req.query.text;
  if (!text) return res.send('Masukkan Link Channel Terlebih Dahulu!');
  if (!text.includes('https://whatsapp.com/channel/')) return res.send('Link tautan tidak valid');
  const result = text.split('https://whatsapp.com/channel/')[1];
  try {
    const metadata = await conn.query({
      tag: 'iq',
      attrs: {
        type: 'get',
        xmlns: 'w:biz:catalog',
        to: `newsletter.${result}@broadcast`,
      },
      content: [{ tag: 'newsletter', attrs: { jid: `${result}@broadcast` } }],
    });
    const channelInfo = metadata.content?.[0]?.attrs;
    const subscribers = channelInfo.subscribers || 'Tidak diketahui';
    const name = channelInfo.name || 'Tidak diketahui';
    const id = `${result}@newsletter`;
    const state = channelInfo.state || 'Tidak diketahui';
    const verified = channelInfo.verified === 'true' ? 'Terverifikasi' : 'Tidak';
    const teks = `
* *ID :* ${id}
* *Nama :* ${name}
* *Total Pengikut :* ${subscribers}
* *Status :* ${state}
* *Verified :* 
${verified}
    `.trim();
    res.send(teks);
  } catch (error) {
    console.error('Error:', error);
    res.send('Channel tidak ditemukan atau terjadi kesalahan saat mengambil data.');
  }
});
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.listen(8080, () => {
  console.log('Server started on port 8080');
});
