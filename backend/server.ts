import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Ensure required folders exist
const folders = ['uploads', 'videos', 'thumbnails', 'public'];
folders.forEach(folder => {
  const fullPath = path.join(__dirname, folder);
  if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
});

// ✅ CORS (Allow all during dev)
app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.options('*', cors());

// ✅ Serve static files
app.use('/videos', express.static(path.join(__dirname, 'videos')));
app.use('/thumbnails', express.static(path.join(__dirname, 'thumbnails')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ✅ File upload config
const upload = multer({
  dest: path.join(__dirname, 'uploads'),
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB
});

// ✅ Root route
app.get('/', (_req: Request, res: Response) => {
  res.send(`
    <html>
      <head><title>Prime Video Backend</title></head>
      <body style="font-family:sans-serif;padding:40px;">
        <h1>🚀 Prime Video Backend</h1>
        <p>POST a video file to <code>/upload</code> for HLS conversion.</p>
      </body>
    </html>
  `);
});

// ✅ Upload & HLS route
app.post('/upload', upload.single('video'), (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const inputPath = req.file.path;
  const baseName = path.parse(req.file.originalname).name.replace(/\s+/g, '_');
  const outputDir = path.join(__dirname, 'videos', baseName);
  const thumbnailPath = path.join(__dirname, 'thumbnails', `${baseName}.jpg`);

  try {
    fs.mkdirSync(outputDir, { recursive: true });

    const ffmpegArgs = [
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

    const convert = spawn('ffmpeg', ffmpegArgs);
    convert.stderr.on('data', data => console.log('[FFmpeg]', data.toString()));

    convert.on('close', code => {
      if (code !== 0) {
        console.error('❌ FFmpeg conversion failed.');
        return res.status(500).json({ error: 'HLS conversion failed' });
      }

      // ✅ Generate thumbnail
      const thumbArgs = ['-i', inputPath, '-ss', '00:00:01', '-vframes', '1', thumbnailPath, '-y'];
      spawn('ffmpeg', thumbArgs).on('close', () => {
        fs.unlinkSync(inputPath); // Clean up uploaded file

        res.json({
          streamUrl: `/videos/${baseName}/index.m3u8`,
          thumbnailUrl: `/thumbnails/${baseName}.jpg`
        });
      });
    });

  } catch (err) {
    console.error('❌ Server error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Start the server
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});
