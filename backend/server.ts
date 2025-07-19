import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for all routes and static assets
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

// Upload config
const upload = multer({ dest: 'uploads/' });

// Serve /videos/ folder statically for .m3u8 and .ts files
app.use('/videos', express.static(path.join(__dirname, 'videos'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.m3u8')) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    } else if (filePath.endsWith('.ts')) {
      res.setHeader('Content-Type', 'video/mp2t');
    }
  }
}));

// Video upload + HLS processing
app.post('/upload', upload.single('video'), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video file uploaded' });
  }

  const inputPath = req.file.path;
  const fileName = path.parse(req.file.originalname).name.replace(/\s+/g, '_');
  const outputDir = path.join(__dirname, 'videos', fileName);
  const outputM3U8 = path.join(outputDir, 'output.m3u8');
  const segmentPattern = path.join(outputDir, 'output%d.ts');

  // Ensure output directory exists
  fs.mkdirSync(outputDir, { recursive: true });

  const ffmpeg = spawn('ffmpeg', [
    '-i', inputPath,
    '-codec:v', 'libx264',
    '-codec:a', 'aac',
    '-start_number', '0',
    '-hls_time', '10',
    '-hls_list_size', '0',
    '-hls_segment_filename', segmentPattern, // critical for .ts segments
    '-f', 'hls',
    outputM3U8
  ]);

  ffmpeg.stderr.on('data', (data) => {
    console.error(`FFmpeg error: ${data}`);
  });

  ffmpeg.on('exit', (code) => {
    fs.unlinkSync(inputPath); // Cleanup uploaded raw file

    if (code === 0) {
      const streamUrl = `/videos/${fileName}/output.m3u8`;
      return res.status(200).json({ streamUrl });
    } else {
      return res.status(500).json({ error: 'FFmpeg failed to convert video.' });
    }
  });
});

// Health check route
app.get('/', (req: Request, res: Response) => {
  res.send(`
    <html>
      <head><title>Backend Status</title></head>
      <body style="font-family:sans-serif; text-align:center; padding:40px;">
        <h1>✅ Backend is Live!</h1>
        <p>Video HLS server running on Render.</p>
        <p><code>GET /</code> and <code>POST /upload</code> endpoints available.</p>
      </body>
    </html>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
