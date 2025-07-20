import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*';

// Ensure required directories exist
const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};
ensureDir(path.join(__dirname, 'uploads'));
ensureDir(path.join(__dirname, 'videos'));
ensureDir(path.join(__dirname, 'public', 'thumbnails'));

// Middleware
app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json());

// Multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Serve HLS video segments
app.use(
  '/videos',
  express.static(path.join(__dirname, 'videos'), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.m3u8')) {
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      } else if (filePath.endsWith('.ts')) {
        res.setHeader('Content-Type', 'video/mp2t');
      }
    }
  })
);

// Serve thumbnails
app.use('/thumbnails', express.static(path.join(__dirname, 'public', 'thumbnails')));

// Upload + Convert Route
app.post('/upload', upload.single('video'), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video file uploaded' });
  }

  const inputPath = req.file.path;
  const filename = path.parse(req.file.originalname).name.replace(/\s+/g, '_');
  const outputDir = path.join(__dirname, 'videos', filename);
  const thumbnailDir = path.join(__dirname, 'public', 'thumbnails');
  const outputM3U8 = path.join(outputDir, 'index.m3u8');

  // Create directory for HLS output
  fs.mkdirSync(outputDir, { recursive: true });

  // Start FFmpeg HLS conversion
  ffmpeg(inputPath)
    .output(outputM3U8)
    .addOptions([
      '-preset veryfast',
      '-g 48',
      '-sc_threshold 0',
      '-hls_time 10',
      '-hls_list_size 0',
      '-hls_segment_filename', path.join(outputDir, 'segment_%03d.ts'),
      '-f hls'
    ])
    .videoCodec('libx264')
    .audioCodec('aac')
    .outputOptions('-crf 20')
    .on('start', (command: string) => {
      console.log('🎬 FFmpeg command:', command);
    })
    .on('end', () => {
      console.log('✅ HLS conversion complete');

      // Generate thumbnail
      ffmpeg(inputPath)
        .screenshots({
          count: 1,
          filename: `${filename}.jpg`,
          folder: thumbnailDir,
          size: '640x360'
        })
        .on('end', () => {
          console.log('📸 Thumbnail created');
          res.json({
            message: 'Upload and processing successful',
            streamUrl: `/videos/${filename}/index.m3u8`,
            thumbnailUrl: `/thumbnails/${filename}.jpg`
          });
        })
        .on('error', (thumbErr: Error) => {
          console.error('❌ Thumbnail error:', thumbErr);
          res.status(500).json({ error: 'Thumbnail generation failed' });
        });
    })
    .on('error', (err: Error) => {
      console.error('❌ FFmpeg error:', err);
      res.status(500).json({ error: 'Video processing failed' });
    })
    .run();
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
