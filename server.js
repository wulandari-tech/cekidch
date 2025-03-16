const http = require('http');
const fs = require('fs');
const fetch = require('node-fetch'); // Pastikan sudah di-install: npm install node-fetch
const formidable = require('formidable'); // Untuk parsing form data

const PORT = 3000;
const PICSART_API_ENDPOINT = 'https://api.picsart.io/image/v1/upscale'; // GANTI dengan endpoint yang BENAR!
const JWT_TOKEN = 'eyJraWQiOiI5NzIxYmUzNi1iMjcwLTQ5ZDUtOTc1Ni05ZDU5N2M4NmIwNTEiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJhdXRoLXNlcnZpY2UtNDAwMjczZDMtOTRlNC00MzVhLWFlNDgtMzhkOTQ1NjgzMDk1IiwiYXVkIjoiNDY4MDIxNjI0MDIxMTAxIiwibmJmIjoxNzQyMTYwNTc4LCJzY29wZSI6WyJiMmItYXBpLmdlbl9haSIsImIyYi1hcGkuaW1hZ2VfYXBpIl0sImlzcyI6Imh0dHBzOi8vYXBpLnBpY3NhcnQuY29tL3Rva2VuLXNlcnZpY2UiLCJvd25lcklkIjoiNDY4MDIxNjI0MDIxMTAxIiwiaWF0IjoxNzQyMTYwNTc4LCJqdGkiOiJjNjkxNzVhNC04MjU0LTQ5NjAtYTE5Yy1hODU5OGNiOTZlM2UifQ.XSuUrmntGGKzTuEZdGo2k1-So098JV2tzK5_vwlOyIVqXYFtlNGWbbLnwEbVOozJOuBubtRAhXaCUu1aQGhBjHYmo6LoqzlGh5sD0_H-C8Z2rsMzGIocN3f19gGa486earuacw_q9xfJTkAUFSIO0mFdQ4BRcIiMO9ZHo_fI9xQPZjXwD5LYDEy2fX7eevtvken16hNdTZZVzD05t690lbMJiGUtOJFIG90fZetjyZ3WMNfw9nycBM0KiJz9i_v4rp6czTqs_wLfYrsh6j7s5NY9BhojtNR0DQMuuSYY4oZNimE87dnYtXWRJ_WaLx-PJ4iDj_kjwgEz-hAkRyDz0g'; // GANTI dengan token JWT Anda!

const server = http.createServer(async (req, res) => {
    // --- CORS (Cross-Origin Resource Sharing) ---
    // Izinkan semua origins (HANYA untuk development! Jangan gunakan ini di production)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight requests (OPTIONS)
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }


    if (req.url === '/' && req.method === 'GET') {
        // --- Tampilkan halaman HTML (index.html) ---
        fs.readFile('index.html', (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });

    } else if (req.url === '/upscale' && req.method === 'POST') {
        // --- Handle upload gambar dan kirim ke API Picsart ---
        const form = new formidable.IncomingForm();

        form.parse(req, async (err, fields, files) => {
            if (err) {
                console.error('Error parsing form:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Error processing upload' }));
                return;
            }
            
            // Periksa apakah file gambar ada
            if (!files.image || !files.image[0]) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'No image file uploaded' }));
                return;
            }
           
            const imageFile = files.image[0];

            // Baca file gambar
            const imageBuffer = fs.readFileSync(imageFile.filepath);
            const base64Image = imageBuffer.toString('base64');
             // Hapus file sementara setelah dibaca
            fs.unlinkSync(imageFile.filepath);

            // Buat request ke API Picsart
            try {
                const picsartResponse = await fetch(PICSART_API_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${JWT_TOKEN}`,
                        'Content-Type': 'application/json' // Sesuaikan jika perlu
                    },
                    body: JSON.stringify({
                        image_data: base64Image, // GANTI dengan key yang benar!
                        scale_factor: 2, // GANTI atau tambahkan parameter lain sesuai dokumentasi
                        // ... parameter lain ...
                    })
                });

                if (!picsartResponse.ok) {
                    const errorData = await picsartResponse.json();
                    console.error('Picsart API Error:', picsartResponse.status, errorData);
                    res.writeHead(picsartResponse.status, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: `Picsart API Error: ${picsartResponse.status} - ${JSON.stringify(errorData)}` }));
                    return;
                }

                const result = await picsartResponse.json();

                // Kirim kembali data gambar yang di-upscale ke client
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ upscaled_image: result.upscaled_image })); // Ganti "upscaled_image" jika perlu

            } catch (error) {
                console.error('Error calling Picsart API:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Error calling Picsart API' }));
            }
        });

    } else {
        // --- Handle URL yang tidak ditemukan ---
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
