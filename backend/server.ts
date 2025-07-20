import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ CORS: Allow all origins for dev; lock down in production
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

// ✅ Preflight requests for mobile Safari / iOS
app.options('*', cors());

app.use(express.json());

// ✅ Serve static files
app.use('/videos', express.static(path.join(__dirname, 'videos')));
app.use('/thumbnails', express.static(path.join(__dirname, 'thumbnails')));
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Ensure required directories exist
['uploads', 'videos', 'thumbnails'].forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath);
});

// ✅ Setup Multer for file uploads
const upload = multer({
  dest: path.join(__dirname, 'uploads'),
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB
});

// ✅ Health check route
app.get('/', (_req: Request, res: Response) => {
  res.send(`
    <html>
      <head><title>Prime Video Backend</title></head>
      <body style="font-family:sans-serif;padding:40px;">
        <h1>🚀 Prime Video Backend</h1>
        <p>Backend is running on port <b>${PORT}</b>.</p>
        <p>POST a video file to <code>/upload</code> for HLS conversion.</p>
      </body>
    </html>
  `);
});

// ✅ Upload and HLS conversion route
app.post('/upload', upload.single('video'), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const inputPath = req.file.path;
  const baseName = path.parse(req.file.originalname).name.replace(/\s+/g, '_');
  const outputDir = path.join(__dirname, 'videos', baseName);
  const thumbnailPath = path.join(__dirname, 'thumbnails', `${baseName}.jpg`);

  try {
    fs.mkdirSync(outputDir, { recursive: true });

    const hlsArgs = [
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
    ];

    const ffmpegConvert = spawn('ffmpeg', hlsArgs);

    ffmpegConvert.stderr.on('data', data => console.log(`[FFmpeg] ${data}`));

    ffmpegConvert.on('close', code => {
      if (code !== 0) {
        console.error('❌ FFmpeg HLS conversion failed');
        return res.status(500).json({ error: 'HLS conversion failed' });
      }

      // ✅ Generate thumbnail
      const thumbArgs = [
        '-i', inputPath,
        '-ss', '00:00:01',
        '-vframes', '1',
        thumbnailPath,
        '-y'
      ];

      spawn('ffmpeg', thumbArgs).on('close', () => {
        fs.unlinkSync(inputPath); // Cleanup uploaded file

        res.json({
          streamUrl: `/videos/${baseName}/index.m3u8`,
          thumbnailUrl: `/thumbnails/${baseName}.jpg`
        });
      });
    });

  } catch (error) {
    console.error('❌ Server error during upload', error);
    res.status(500).json({ error: 'Server error during upload' });
  }
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`✅ Backend running at http://localhost:${PORT}`);
});
