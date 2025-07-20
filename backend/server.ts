import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import ffmpeg from 'fluent-ffmpeg';

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for all routes and static assets
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

// Set up Multer for file uploads
// const upload = multer({ dest: 'uploads/' }); // Removed duplicate declaration

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
app.use('/thumbnails', express.static(path.join(__dirname, 'public', 'thumbnails')));

// Set up Multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Video upload + HLS processing
app.post('/upload', upload.single('video'), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video file uploaded' });
  }

  const inputPath = req.file.path;
  const fileName = path.parse(req.file.originalname).name.replace(/\s+/g, '_');
  const outputDir = path.join(__dirname, 'videos', fileName);
  // const outputM3U8 = path.join(outputDir, 'output.m3u8');
  const segmentPattern = path.join(outputDir, 'output%d.ts');

  // Create output directory
  fs.mkdirSync(outputDir, { recursive: true });

  const outputM3U8 = path.join(outputDir, 'output.m3u8');

  // Run FFmpeg to create HLS + thumbnail
  ffmpeg(inputPath)
    .output(path.join(outputDir, 'index.m3u8'))
 .addOptions([
  '-preset veryfast',
  '-g 48',
  '-sc_threshold 0',
  '-hls_time 10',
  '-hls_list_size 0',
  '-hls_segment_filename', path.join(outputDir, 'segment_%03d.ts'),
  '-f hls'
])
.videoCodec('libx264') // Re-encode to H.264
.audioCodec('aac')     // Re-encode audio
.outputOptions('-crf 20')

    .on('start', command => console.log('FFmpeg command:', command))
    .on('end', () => {
      console.log('✅ HLS conversion completed.');

      // Generate thumbnail separately
      ffmpeg(inputPath)
        .screenshots({
          count: 1,
          filename: `${fileName}.jpg`,
          folder: path.join(__dirname, 'public', 'thumbnails'),
          size: '640x360'
        })
        .on('end', () => {
          console.log('📸 Thumbnail created');
          res.json({
            message: 'Upload and processing successful',
            streamUrl: `/videos/${fileName}/index.m3u8`,
            thumbnailUrl: `/thumbnails/${fileName}.jpg`
          });
        });
    })
    .on('error', err => {
      console.error('❌ FFmpeg error:', err);
      res.status(500).json({ error: 'Failed to process video' });
    })
    .run();
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
