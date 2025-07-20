import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  'http://localhost:3000',
  'https://frontend-mu-two-39.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy does not allow access from origin ${origin}`));
    }
  }
}));

app.use(express.json());

// Set up Multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Serve processed videos and thumbnails
app.use('/videos', express.static(path.join(__dirname, 'videos')));
app.use('/thumbnails', express.static(path.join(__dirname, 'thumbnails')));

// Upload route
app.post('/upload', upload.single('video'), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const originalName = req.file.originalname;
  const baseName = path.parse(originalName).name;
  const inputPath = req.file.path;
  const outputDir = path.join(__dirname, 'videos', baseName);
  const outputPath = path.join(outputDir, 'index.m3u8');
  const thumbnailPath = path.join(__dirname, 'thumbnails', `${baseName}.jpg`);

  try {
    // Create output directories
    fs.mkdirSync(outputDir, { recursive: true });
    fs.mkdirSync(path.dirname(thumbnailPath), { recursive: true });

    // Generate HLS using FFmpeg
    await new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i', inputPath,
        '-codec:v', 'libx264',
        '-codec:a', 'aac',
        '-flags', '+cgop',
        '-g', '30',
        '-hls_time', '2',
        '-hls_playlist_type', 'vod',
        path.join(outputDir, 'index.m3u8')
      ]);

      ffmpeg.stderr.on('data', (data) => {
        console.error(`FFmpeg stderr: ${data}`);
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve(true);
        } else {
          reject(`FFmpeg exited with code ${code}`);
        }
      });
    });

    // Generate thumbnail
    await new Promise((resolve, reject) => {
      const thumbnail = spawn('ffmpeg', [
        '-i', inputPath,
        '-ss', '00:00:01.000',
        '-vframes', '1',
        thumbnailPath
      ]);

      thumbnail.stderr.on('data', (data) => {
        console.error(`FFmpeg thumbnail stderr: ${data}`);
      });

      thumbnail.on('close', (code) => {
        if (code === 0) {
          resolve(true);
        } else {
          reject(`Thumbnail FFmpeg exited with code ${code}`);
        }
      });
    });

    // Respond with stream path
    res.json({
      message: 'Upload and processing successful',
      streamUrl: `/videos/${baseName}/index.m3u8`,
      thumbnailUrl: `/thumbnails/${baseName}.jpg`
    });
  } catch (error) {
    console.error('Processing error:', error);
    res.status(500).json({ error: 'Processing failed' });
  } finally {
    fs.unlinkSync(inputPath); // Clean up temp upload
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
