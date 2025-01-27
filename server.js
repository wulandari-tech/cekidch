const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path'); // Tambahkan path
const { ImageUploadService } = require('node-upload-images');
const app = express();
const port = 8080;

const upload = multer({ dest: 'uploads/' }); // Folder temporary untuk menyimpan file

// Middleware untuk serve index.html
app.get('/', (req, res) => {
    // Ganti dengan path absolut lokasi index.html
    const indexPath = path.resolve(__dirname, '../index.html'); 
    res.sendFile(indexPath);
});

app.post('/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('No image file provided.');
        }

        const mime = req.file.mimetype;
        if (!/image/.test(mime)) {
            return res.status(400).send('File is not an image');
        }
        
        const service = new ImageUploadService('pixhost.to');
        const { directLink } = await service.uploadFromBinary(fs.readFileSync(req.file.path), 'wanzofc.jpg');
        
        fs.unlinkSync(req.file.path);

        res.json({ url: directLink.toString() });
    } catch (error) {
        console.error('Error during upload:', error);
        res.status(500).send('Internal Server Error' + error.message);
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
