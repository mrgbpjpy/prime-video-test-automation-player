import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

const app = express();
const PORT = process.env.PORT || 5000;

// Allow both local and Vercel frontend origins
const allowedOrigins = [
  'http://localhost:3000',
  'https://frontend-mu-two-39.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS error: ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle OPTIONS requests for CORS preflight
app.options('*', cors());

// Middleware
app.use(express.json());
app.use('/videos', express.static(path.join(__dirname, 'videos')));
app.use('/thumbnails', express.static(path.join(__dirname, 'thumbnails')));

// Multer for handling uploads
const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('video'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { filename, path: inputPath } = req.file;
  const baseName = filename.split('.')[0];
  const outputDir = path.join(__dirname, 'videos', baseName);
  const outputM3U8 = path.join(outputDir, 'index.m3u8');
  const thumbnailPath = path.join(__dirname, 'thumbnails', `${baseName}.jpg`);

  // Create output directory if not exists
  fs.mkdirSync(outputDir, { recursive: true });

  // FFmpeg to convert to HLS and generate thumbnail
  const ffmpeg = spawn('ffmpeg', [
    '-i', inputPath,
    '-vf', 'scale=1280:-2',
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-strict', '-2',
    '-start_number', '0',
    '-hls_time', '10',
    '-hls_list_size', '0',
    '-f', 'hls',
    outputM3U8
  ]);

  // Generate thumbnail
  const ffmpegThumbnail = spawn('ffmpeg', [
    '-i', inputPath,
    '-ss', '00:00:01.000',
    '-vframes', '1',
    thumbnailPath
  ]);

  ffmpeg.on('close', (code) => {
    if (code !== 0) {
      return res.status(500).json({ error: 'Video conversion failed' });
    }

    fs.unlinkSync(inputPath); // Remove uploaded file
    res.json({
      message: 'Upload and processing successful',
      streamUrl: `/videos/${baseName}/index.m3u8`,
      thumbnailUrl: `/thumbnails/${baseName}.jpg`
    });
  });

  ffmpeg.stderr.on('data', (data) => {
    console.error(`[FFmpeg stderr] ${data}`);
  });

  ffmpegThumbnail.stderr.on('data', (data) => {
    console.error(`[Thumbnail stderr] ${data}`);
  });

  ffmpegThumbnail.on('close', (code) => {
    if (code !== 0) {
      console.error('Thumbnail generation failed');
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
