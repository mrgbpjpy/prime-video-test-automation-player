import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Static file serving
app.use('/videos', express.static(path.join(__dirname, 'videos'), {
  setHeaders: (res, filePath) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (filePath.endsWith('.m3u8')) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    } else if (filePath.endsWith('.ts')) {
      res.setHeader('Content-Type', 'video/mp2t');
    }
  }
}));

app.use('/thumbnails', express.static(path.join(__dirname, 'public', 'thumbnails')));

// Multer setup
const upload = multer({ dest: 'uploads/' });

// POST /upload
app.post('/upload', upload.single('video'), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video file uploaded' });
  }

  const inputPath = req.file.path;
  const originalName = path.parse(req.file.originalname).name;
  const safeFileName = originalName.replace(/[^a-zA-Z0-9-_]/g, '_');
  const outputDir = path.join(__dirname, 'videos', safeFileName);
  const outputM3U8 = path.join(outputDir, 'index.m3u8');
  const segmentPattern = path.join(outputDir, 'segment_%03d.ts');
  const thumbnailPath = path.join(__dirname, 'public', 'thumbnails', `${safeFileName}.jpg`);

  try {
    fs.mkdirSync(outputDir, { recursive: true });

    const ffmpeg = spawn('ffmpeg', [
      '-i', inputPath,
      '-codec:v', 'libx264',
      '-codec:a', 'aac',
      '-start_number', '0',
      '-hls_time', '10',
      '-hls_list_size', '0',
      '-hls_segment_filename', segmentPattern,
      '-f', 'hls',
      outputM3U8
    ]);

    ffmpeg.stderr.on('data', (data) => {
      console.error(`FFmpeg error: ${data}`);
    });

    ffmpeg.on('close', (code) => {
      fs.unlinkSync(inputPath); // Cleanup uploaded file

      if (code === 0) {
        const streamUrl = `/videos/${safeFileName}/index.m3u8`;
        const thumbnailUrl = `/thumbnails/${safeFileName}.jpg`;

        // Generate thumbnail
        spawn('ffmpeg', [
          '-i', outputM3U8,
          '-ss', '00:00:01.000',
          '-vframes', '1',
          thumbnailPath
        ]);

        res.status(200).json({ streamUrl, thumbnailUrl });
      } else {
        res.status(500).json({ error: 'FFmpeg failed to convert video.' });
      }
    });

  } catch (err: any) {
    console.error('Upload error:', err.message);
    res.status(500).json({ error: 'Upload processing failed' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
});
