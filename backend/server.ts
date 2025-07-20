import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const app = express();
const PORT = process.env.PORT || 5000;

// Define allowed origins
const ALLOWED_ORIGINS = [
  'https://frontend-mu-two-39.vercel.app',
  'http://localhost:3001',
];

// CORS middleware configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., non-browser clients like curl)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, origin || '*');
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Handle preflight requests
app.options('*', cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, origin || '*');
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());
app.use('/videos', express.static(path.join(__dirname, 'videos')));
app.use('/thumbnails', express.static(path.join(__dirname, 'thumbnails')));

const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('video'), (req: Request, res: Response) => {
  // Set CORS headers manually for this route (optional, as middleware handles it)
  const origin = req.get('origin');
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { originalname, path: tempPath } = req.file;
  const baseFilename = path.parse(originalname).name;
  const outputDir = path.join(__dirname, 'videos', baseFilename);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'index.m3u8');
  const thumbnailPath = path.join(__dirname, 'thumbnails', `${baseFilename}.jpg`);

  const ffmpeg = spawn('ffmpeg', [
    '-i', tempPath,
    '-vf', 'scale=1280:-2',
    '-c:v', 'libx264',
    '-profile:v', 'main',
    '-crf', '20',
    '-sc_threshold', '0',
    '-g', '48',
    '-keyint_min', '48',
    '-c:a', 'aac',
    '-ar', '48000',
    '-b:a', '128k',
    '-hls_time', '10',
    '-hls_playlist_type', 'vod',
    '-f', 'hls',
    outputPath,
  ]);

  ffmpeg.on('close', (code) => {
    try {
      fs.unlinkSync(tempPath); // Clean up temp file
    } catch (err) {
      console.error('❌ Failed to delete temp file:', err);
    }

    if (code !== 0) {
      return res.status(500).json({ error: 'FFmpeg video processing failed' });
    }

    const thumbnail = spawn('ffmpeg', [
      '-i', path.join(outputDir, 'index.m3u8'),
      '-ss', '00:00:02.000',
      '-vframes', '1',
      thumbnailPath,
    ]);

    thumbnail.on('close', (thumbnailCode) => {
      if (thumbnailCode === 0) {
        return res.json({
          message: 'Upload and processing successful',
          streamUrl: `/videos/${baseFilename}/index.m3u8`,
          thumbnailUrl: `/thumbnails/${baseFilename}.jpg`,
        });
      } else {
        return res.status(500).json({ error: 'FFmpeg thumbnail generation failed' });
      }
    });

    thumbnail.on('error', (err) => {
      console.error('❌ Thumbnail generation error:', err.message);
      return res.status(500).json({ error: 'Thumbnail generation failed' });
    });
  });

  ffmpeg.on('error', (err) => {
    console.error('❌ FFmpeg error:', err.message);
    try {
      fs.unlinkSync(tempPath); // Clean up temp file on error
    } catch (cleanupErr) {
      console.error('❌ Failed to delete temp file:', cleanupErr);
    }
    return res.status(500).json({ error: 'FFmpeg processing failed' });
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const origin = req.get('origin');
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  console.error('❌ Server error:', err.message, err.stack);
  res.status(500).json({ error: 'Internal server error' });
  next();
});

// Log registered routes for debugging
console.log('Registered routes:');
app._router.stack.forEach((r: any) => {
  if (r.route && r.route.path) {
    console.log(`Route: ${r.route.path}`);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
