const http = require('http');
const fs = require('fs');
const fetch = require('node-fetch');
const formidable = require('formidable');

const PORT = 3000;
const PICSART_API_ENDPOINT = 'https://api.picsart.io/image/v1/upscale'; // Asumsi endpoint
const JWT_TOKEN = 'eyJraWQiOiI5NzIxYmUzNi1iMjcwLTQ5ZDUtOTc1Ni05ZDU5N2M4NmIwNTEiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJhdXRoLXNlcnZpY2UtYTBmNjc5MTEtYjMzZC00MGU3LTlkYWItMTkxNTA0NDNjZjk0IiwiYXVkIjoiNDY4MDIxNjI0MDIxMTAxIiwibmJmIjoxNzQyMTYyMTM2LCJzY29wZSI6WyJiMmItYXBpLmdlbl9haSIsImIyYi1hcGkuaW1hZ2VfYXBpIl0sImlzcyI6Imh0dHBzOi8vYXBpLnBpY3NhcnQuY29tL3Rva2VuLXNlcnZpY2UiLCJvd25lcklkIjoiNDY4MDIxNjI0MDIxMTAxIiwiaWF0IjoxNzQyMTYyMTM2LCJqdGkiOiJiYjlhM2ZlZC1jM2M2LTQ3OTEtYTAzMC0yY2MwNzg1Mzk5ZmYifQ.C2pOgC43kX_KXoCWj9DQXUioAyF2X03cfC_0F1swkuYMdNglCbvuwuYhFtzg_WMM4vPbB476u8Hto0L7y-LaQ9QL_4kxpiVXJUFBiPTyE2YZDjfTOesZ48B13MUDIMqg2kVBJ0a0vKNbGAl-XoRdaDELVtcrPMCPi7Fn9oGEIPfG-TwehC16V74P8AC3uSWdbWMjmFte0i_rh7RhE3eM70h7AsyYdCp3Qw5MbZgMrOmZ-YQB-twlJ9l2E_zTKkcTF8OIg2FzM46ud06w0AktvWZPUdrwjzz0PR3uwE4nKZhhT2ZhVh9yP_4wUEhyH1OvFuyRx2YWhEtW6MHW-SOHpw';

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.url === '/' && req.method === 'GET') {
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
        const form = new formidable.IncomingForm();

        form.parse(req, async (err, fields, files) => {
            if (err) {
                console.error('Error parsing form:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Error processing upload' }));
                return;
            }
            if (!files.image || !files.image[0]) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'No image file uploaded' }));
                return;
            }
            const imageFile = files.image[0];
            const imageBuffer = fs.readFileSync(imageFile.filepath);
            const base64Image = imageBuffer.toString('base64');
            fs.unlinkSync(imageFile.filepath);
            try {
                const picsartResponse = await fetch(PICSART_API_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${JWT_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        image: base64Image, // Ganti 'image_data' menjadi 'image' (sesuai asumsi)
                        factor: 2,        // Ganti nama parameter dan nilai (sesuai asumsi)
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
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ upscaled_image: result.data })); // Ganti 'upscaled_image' dan 'result.data' (sesuai asumsi)

            } catch (error) {
                console.error('Error calling Picsart API:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Error calling Picsart API' }));
            }
        });

    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
