import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const app = express();
const PORT = process.env.PORT || 5000;

const FRONTEND_ORIGIN = 'https://frontend-mu-two-39.vercel.app';

app.use(cors({
  origin: FRONTEND_ORIGIN,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.options('*', cors({
  origin: FRONTEND_ORIGIN,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());
app.use('/videos', express.static(path.join(__dirname, 'videos')));
app.use('/thumbnails', express.static(path.join(__dirname, 'thumbnails')));

const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('video'), (req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', FRONTEND_ORIGIN);
  res.setHeader('Access-Control-Allow-Credentials', 'true');

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
    outputPath
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
      thumbnailPath
    ]);

    thumbnail.on('close', (thumbnailCode) => {
      if (thumbnailCode === 0) {
        return res.json({
          message: 'Upload and processing successful',
          streamUrl: `/videos/${baseFilename}/index.m3u8`,
          thumbnailUrl: `/thumbnails/${baseFilename}.jpg`
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

// Error handling middleware with proper signature
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', FRONTEND_ORIGIN);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  console.error('❌ Server error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
  next(); // Call next() to ensure middleware chain completes
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
