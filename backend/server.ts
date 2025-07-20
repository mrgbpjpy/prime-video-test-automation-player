import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ CORS configuration (frontend Vercel URL)
app.use(cors({
  origin: 'https://frontend-mu-two-39.vercel.app',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true,
}));

app.options('*', cors());

// ✅ Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/videos', express.static(path.join(__dirname, 'videos')));
app.use('/thumbnails', express.static(path.join(__dirname, 'thumbnails')));

// ✅ Ensure required directories
['uploads', 'videos', 'thumbnails'].forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath);
});

// ✅ Multer upload config
const upload = multer({
  dest: path.join(__dirname, 'uploads'),
  limits: { fileSize: 500 * 1024 * 1024 },
});

// ✅ Health route
app.get('/', (_req: Request, res: Response) => {
  res.send(`
    <html><body><h1>✅ Backend OK</h1><p>POST /upload to send video.</p></body></html>
  `);
});

// ✅ Upload & HLS conversion
app.post('/upload', upload.single('video'), async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const inputPath = req.file.path;
  const baseName = path.parse(req.file.originalname).name.replace(/\s+/g, '_');
  const outputDir = path.join(__dirname, 'videos', baseName);
  const thumbnailPath = path.join(__dirname, 'thumbnails', `${baseName}.jpg`);

  try {
    fs.mkdirSync(outputDir, { recursive: true });

    const ffmpeg = spawn('ffmpeg', [
      '-i', inputPath,
      '-vf', 'scale=w=360:h=640:force_original_aspect_ratio=decrease',
      '-c:a', 'aac',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-f', 'hls',
      '-hls_time', '4',
      '-hls_list_size', '0',
      '-hls_segment_filename', path.join(outputDir, 'segment_%03d.ts'),
      path.join(outputDir, 'index.m3u8'),
      '-y'
    ]);

    ffmpeg.stderr.on('data', data => console.log('[FFmpeg]', data.toString()));

    ffmpeg.on('close', code => {
      if (code !== 0) {
        return res.status(500).json({ error: 'Video conversion failed' });
      }

      // ✅ Thumbnail
      spawn('ffmpeg', [
        '-i', inputPath,
        '-ss', '00:00:01',
        '-vframes', '1',
        thumbnailPath,
        '-y'
      ]).on('close', () => {
        fs.unlinkSync(inputPath);
        res.json({
          streamUrl: `/videos/${baseName}/index.m3u8`,
          thumbnailUrl: `/thumbnails/${baseName}.jpg`,
        });
      });
    });
  } catch (err) {
    console.error('Upload failed', err);
    res.status(500).json({ error: 'Upload error' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
