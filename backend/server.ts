import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Ensure required folders exist
const requiredDirs = ['uploads', 'videos', 'thumbnails', 'public'];
requiredDirs.forEach((dir) => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✅ Created folder: ${fullPath}`);
  }
});

// ✅ CORS configuration for frontend hosted on Vercel
app.use(cors({
  origin: ['https://frontend-mu-two-39.vercel.app'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

// ✅ FIXED: CORS preflight for Express 5 (avoid crash)
app.options('*', cors()); // ✅ FIXED: Replaced '/{*}' with '*' to avoid path-to-regexp error

// ✅ Middleware for JSON and static files
app.use(express.json());
app.use('/videos', express.static(path.join(__dirname, 'videos')));
app.use('/thumbnails', express.static(path.join(__dirname, 'thumbnails')));
app.use(express.static(path.join(__dirname, 'public')));

// ✅ File upload handling using Multer
const upload = multer({
  dest: path.join(__dirname, 'uploads'),
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB
});

// ✅ Health check endpoint
app.get('/', (_req: Request, res: Response) => {
  res.send(`
    <html>
      <head><title>Prime Video Backend</title></head>
      <body style="font-family:sans-serif;padding:40px;">
        <h1>🚀 Prime Video Backend</h1>
        <p>POST a video file to <code>/upload</code> for HLS conversion.</p>
      </body>
    </html>
  `);
});

// ✅ Upload route for processing video with FFmpeg
app.post('/upload', upload.single('video'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const inputPath = req.file.path;
  const baseName = path.parse(req.file.originalname).name.replace(/\s+/g, '_');
  const outputDir = path.join(__dirname, 'videos', baseName);
  const thumbnailPath = path.join(__dirname, 'thumbnails', `${baseName}.jpg`);

  try {
    fs.mkdirSync(outputDir, { recursive: true });

    const ffmpegArgs = [
      '-y',
      '-i', inputPath,
      '-vf', 'scale=w=360:h=640:force_original_aspect_ratio=decrease',
      '-c:a', 'aac',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-f', 'hls',
      '-hls_time', '4',
      '-hls_list_size', '0',
      '-hls_segment_filename', path.join(outputDir, 'segment_%03d.ts'),
      path.join(outputDir, 'index.m3u8')
    ];

    const convert = spawn('ffmpeg', ffmpegArgs);
    convert.stderr.on('data', (data) => console.log(`[FFmpeg] ${data}`));

    convert.on('close', (code) => {
      if (code !== 0) {
        console.error('❌ FFmpeg conversion failed.');
        return res.status(500).json({ error: 'HLS conversion failed' });
      }

      const thumbArgs = [
        '-y',
        '-i', inputPath,
        '-ss', '00:00:01',
        '-vframes', '1',
        thumbnailPath
      ];

      const thumbnail = spawn('ffmpeg', thumbArgs);
      thumbnail.stderr.on('data', (data) => console.log(`[Thumbnail] ${data}`));

      thumbnail.on('close', () => {
        fs.unlinkSync(inputPath); // cleanup uploaded file
        console.log('✅ Video converted and thumbnail created.');

        res.json({
          streamUrl: `/videos/${baseName}/index.m3u8`,
          thumbnailUrl: `/thumbnails/${baseName}.jpg`
        });
      });
    });

  } catch (err) {
    console.error('❌ Server error:', err);
    res.status(500).json({ error: 'Server-side processing error' });
  }
});

// ✅ Start the backend server
app.listen(PORT, () => {
  console.log(`✅ Backend running at http://localhost:${PORT}`);
});
