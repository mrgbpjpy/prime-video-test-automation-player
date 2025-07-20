import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  'http://localhost:3000',
  'https://frontend-mu-two-39.vercel.app'
];

const corsOptions: cors.CorsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS error: ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // ✅ Fixes Express 5 CORS issue

app.use(express.json());
app.use('/videos', express.static(path.join(__dirname, 'videos')));
app.use('/thumbnails', express.static(path.join(__dirname, 'thumbnails')));

const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('video'), (req: Request, res: Response) => {
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
    fs.unlinkSync(tempPath);
    if (code === 0) {
      const thumbnail = spawn('ffmpeg', [
        '-i', path.join(outputDir, 'index.m3u8'),
        '-ss', '00:00:02.000',
        '-vframes', '1',
        thumbnailPath
      ]);

      thumbnail.on('close', () => {
        return res.json({
          message: 'Upload and processing successful',
          streamUrl: `/videos/${baseFilename}/index.m3u8`,
          thumbnailUrl: `/thumbnails/${baseFilename}.jpg`
        });
      });
    } else {
      return res.status(500).json({ error: 'FFmpeg failed' });
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
