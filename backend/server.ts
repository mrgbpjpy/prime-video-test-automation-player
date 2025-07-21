import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import 'dotenv/config';

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);
const FRONTEND_ORIGIN = 'https://frontend-mu-two-39.vercel.app';

const ALLOWED_ORIGINS = [FRONTEND_ORIGIN, 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, origin || '*');
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

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
  credentials: true
}));

app.use(express.json());
app.use('/videos', express.static(path.join(__dirname, 'videos')));
app.use('/thumbnails', express.static(path.join(__dirname, 'thumbnails')));

const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('video'), (req: Request, res: Response) => {
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
  const outputPath = path.join(outputDir, 'index.m3u8');
  const thumbnailPath = path.join(__dirname, 'thumbnails', `${baseFilename}.jpg`);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

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
    outputPath
  ]);

  ffmpeg.on('close', (code) => {
    try {
      fs.unlinkSync(tempPath);
    } catch (err) {
      console.warn('Failed to delete temp file:', err);
    }

    if (code !== 0) {
      return res.status(500).json({ error: 'FFmpeg processing failed' });
    }

    const thumbnail = spawn('ffmpeg', [
      '-i', outputPath,
      '-ss', '00:00:02.000',
      '-vframes', '1',
      '-vf', 'scale=320:-1',
      '-f', 'image2',
      '-y',
      thumbnailPath
    ]);

    thumbnail.on('close', (thumbCode) => {
      if (thumbCode !== 0) {
        return res.status(500).json({ error: 'Thumbnail generation failed' });
      }

      return res.json({
        message: 'Upload and processing successful',
        streamUrl: `/videos/${baseFilename}/index.m3u8`,
        thumbnailUrl: `/thumbnails/${baseFilename}.jpg`
      });
    });

    thumbnail.on('error', (err) => {
      return res.status(500).json({ error: 'Thumbnail error' });
    });
  });

  ffmpeg.on('error', (err) => {
    return res.status(500).json({ error: 'FFmpeg execution error' });
  });
});

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK' });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const origin = req.get('origin');
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  console.error('Server error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running on http://0.0.0.0:${PORT}`);
});
