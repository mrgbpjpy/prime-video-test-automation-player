import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors());
app.use(express.json());

// Set up Multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Serve HLS output statically from /videos
app.use('/videos', express.static(path.join(__dirname, 'videos'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.m3u8')) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    } else if (filePath.endsWith('.ts')) {
      res.setHeader('Content-Type', 'video/mp2t');
    }
  }
}));

// Upload endpoint
app.post('/upload', upload.single('video'), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video file uploaded' });
  }

  const inputPath = req.file.path;
  const fileNameNoExt = path.parse(req.file.originalname).name.replace(/\s+/g, '_');
  const outputDir = path.join(__dirname, 'videos', fileNameNoExt);

  // Create output directory
  fs.mkdirSync(outputDir, { recursive: true });

  const outputM3U8 = path.join(outputDir, 'output.m3u8');

  // FFmpeg HLS conversion
  const ffmpeg = spawn('ffmpeg', [
    '-i', inputPath,
    '-codec:v', 'libx264',
    '-codec:a', 'aac',
    '-strict', 'experimental',
    '-start_number', '0',
    '-hls_time', '10',
    '-hls_list_size', '0',
    '-f', 'hls',
    outputM3U8
  ]);

  ffmpeg.stderr.on('data', (data) => {
    console.error(`FFmpeg error: ${data}`);
  });

  ffmpeg.on('exit', (code) => {
    if (code === 0) {
      const streamUrl = `/videos/${fileNameNoExt}/output.m3u8`;
      const thumbnailUrl = ''; // Optional
      return res.status(200).json({ streamUrl, thumbnailUrl });
    } else {
      return res.status(500).json({ error: 'FFmpeg failed to process video' });
    }
  });
});

// ✅ Root GET route to verify backend is live
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Backend Status</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background: #f5f5f5;
          color: #333;
          text-align: center;
          padding: 50px;
        }
        .status {
          background: #fff;
          border-radius: 10px;
          padding: 20px;
          display: inline-block;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .status h1 {
          color: green;
        }
        .info {
          margin-top: 10px;
          font-size: 0.9em;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="status">
        <h1>✅ Backend is Live!</h1>
        <p>Express server is up and running on Render.</p>
        <div class="info">URL: <code>https://prime-video-backend.onrender.com</code></div>
      </div>
    </body>
    </html>
  `);
});


app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
