// index.js
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: ['https://frontend-mu-two-39.vercel.app', 'http://localhost:3000'] }));
app.use(express.json());

// Set up Multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Serve processed videos statically
app.use('/videos', express.static(path.join(__dirname, 'videos')));

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Upload route
app.post('/upload', upload.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const inputPath = req.file.path;
  const outputDir = path.join(__dirname, 'videos');
  const outputFile = `${Date.now()}.m3u8`;
  const outputPath = path.join(outputDir, outputFile);

  // Create output dir if not exists
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  // Convert to HLS
  ffmpeg(inputPath)
    .outputOptions([
      '-codec: copy',
      '-start_number 0',
      '-hls_time 10',
      '-hls_list_size 0',
      '-f hls'
    ])
    .output(outputPath)
    .on('end', () => {
      fs.unlinkSync(inputPath); // remove original uploaded file
      res.json({ url: `/videos/${outputFile}` });
    })
    .on('error', (err) => {
      console.error('FFmpeg error:', err);
      res.status(500).json({ error: 'Video processing failed' });
    })
    .run();
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
