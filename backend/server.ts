import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.options('*', cors()); // Enable preflight requests

app.use(express.json());
app.use(express.static('public'));

// Serve videos and thumbnails
app.use('/videos', express.static(path.join(__dirname, 'videos')));
app.use('/thumbnails', express.static(path.join(__dirname, 'thumbnails')));

// Ensure upload and output directories exist
['uploads', 'videos', 'thumbnails'].forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath);
});

// Multer upload setup (max file size ~500MB)
const upload = multer({
  dest: path.join(__dirname, 'uploads'),
  limits: { fileSize: 500 * 1024 * 1024 }
});

// Homepage route (for server test)
app.get('/', (req: Request, res: Response) => {
  res.send(`
    <html>
      <head><title>Prime Video Backend</title></head>
      <body style="font-family:sans-serif;padding:40px;">
        <h1>🚀 Prime Video Backend Server</h1>
        <p>Backend is running on port <b>${PORT}</b>.</p>
        <p>POST your videos to <code>/upload</code> to convert them to HLS.</p>
      </body>
    </html>
  `);
});

// Upload + FFmpeg conversion route
app.post('/upload', upload.single('video'), async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const inputPath = req.file.path;
  const baseName = path.parse(req.file.originalname).name.replace(/\s+/g, '_');
  const outputDir = path.join(__dirname, 'videos', baseName);
  const thumbnailPath = path.join(__dirname, 'thumbnails', `${baseName}.jpg`);

  // Create output dir
  fs.mkdirSync(outputDir, { recursive: true });

  // FFmpeg command to convert to HLS and generate thumbnail
  const ffmpeg = spawn('ffmpeg', [
    '-i', inputPath,
    '-vf', 'scale=w=360:h=640:force_original_aspect_ratio=decrease',
    '-c:a', 'aac',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-f', 'hls',
    '-hls_time', '4',
    '-hls_list_size', '0',
    '-hls_segment_filename', path.join(outputDir, 'segment_%03d.ts'),
    path.join(outputDir, 'index.m3u8'),
    '-y' // Overwrite
  ]);

  ffmpeg.stderr.on('data', data => console.log(`[FFmpeg] ${data}`));

  ffmpeg.on('close', (code) => {
    if (code !== 0) {
      console.error('FFmpeg failed');
      return res.status(500).json({ error: 'Video conversion failed' });
    }

    // Generate thumbnail
    spawn('ffmpeg', [
      '-i', inputPath,
      '-ss', '00:00:01',
      '-vframes', '1',
      thumbnailPath,
      '-y'
    ]).on('close', () => {
      fs.unlinkSync(inputPath); // delete original upload

      res.json({
        streamUrl: `/videos/${baseName}/index.m3u8`,
        thumbnailUrl: `/thumbnails/${baseName}.jpg`
      });
    });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server is running at http://localhost:${PORT}`);
});
