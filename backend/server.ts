import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 5000;

// Define allowed origins
const ALLOWED_ORIGINS = [
  'https://frontend-mu-two-39.vercel.app',
  'http://localhost:3001',
];

// CORS middleware configuration
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, origin || '*');
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Handle preflight requests
app.options('*', cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, origin || '*');
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());
app.use('/videos', express.static(path.join(__dirname, 'videos')));
app.use('/thumbnails', express.static(path.join(__dirname, 'thumbnails')));

const upload = multer({ dest: 'uploads/' }).single('video');

// Error handling for multer
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError && err.code === 'FIELD_NAME') {
    console.error('❌ Multer error: Unexpected field. Expected "video" field in form-data');
    res.status(400).json({ error: 'Unexpected field. Use "video" as the form-data field name' });
    return;
  }
  next(err);
});

app.post('/upload', (req: Request, res: Response, next: NextFunction) => {
  console.log('📥 Upload endpoint hit');
  upload(req, res, (err) => {
    const origin = req.get('origin');
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    if (err instanceof multer.MulterError) {
      console.error('❌ Multer error:', err.message);
      return res.status(400).json({ error: err.message });
    }
    if (err) {
      console.error('❌ Upload error:', err.message);
      return res.status(500).json({ error: 'Upload failed' });
    }
    if (!req.file) {
      console.error('❌ No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, path: tempPath } = req.file;
    const baseFilename = path.parse(originalname).name;
    const outputDir = path.join(__dirname, 'videos', baseFilename);

    console.log(`📁 Processing file: ${originalname}, tempPath: ${tempPath}`);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, 'index.m3u8');
    const thumbnailPath = path.join(__dirname, 'thumbnails', `${baseFilename}.jpg`);

    const ffmpegArgs = [
      '-i', tempPath,
      '-y', // Overwrite output files
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-g', '48',
      '-sc_threshold', '0',
      '-hls_time', '10',
      '-hls_list_size', '0',
      '-hls_segment_filename', path.join(outputDir, 'segment_%03d.ts'),
      '-f', 'hls',
      '-crf', '20',
      outputPath,
    ];

    console.log(`🎬 FFmpeg command: ffmpeg ${ffmpegArgs.join(' ')}`);
    const ffmpeg = spawn('ffmpeg', ffmpegArgs);

    ffmpeg.on('error', (err) => {
      console.error('❌ FFmpeg spawn error:', err.message);
      try {
        fs.unlinkSync(tempPath);
      } catch (cleanupErr) {
        console.error('❌ Failed to delete temp file:', cleanupErr);
      }
      return res.status(500).json({ error: 'FFmpeg failed to start' });
    });

    ffmpeg.stderr.on('data', (data) => {
      console.log(`FFmpeg stderr: ${data}`);
    });

    ffmpeg.on('close', (code) => {
      console.log(`📼 FFmpeg exited with code ${code}`);
      try {
        fs.unlinkSync(tempPath);
      } catch (err) {
        console.error('❌ Failed to delete temp file:', err);
      }

      if (code !== 0) {
        console.error(`❌ FFmpeg failed with code ${code}`);
        return res.status(500).json({ error: 'FFmpeg video processing failed' });
      }

      const thumbnailArgs = [
        '-i', tempPath,
        '-ss', '00:00:02.000',
        '-vframes', '1',
        '-vf', 'scale=320:-1',
        '-f', 'image2',
        '-update', '1',
        thumbnailPath,
      ];

      console.log(`📸 Thumbnail command: ffmpeg ${thumbnailArgs.join(' ')}`);
      const thumbnail = spawn('ffmpeg', thumbnailArgs);

      thumbnail.stderr.on('data', (data) => {
        console.log(`FFmpeg thumbnail stderr: ${data}`);
      });

      thumbnail.on('error', (err) => {
        console.error('❌ Thumbnail generation error:', err.message);
        return res.status(500).json({ error: 'Thumbnail generation failed' });
      });

      thumbnail.on('close', (thumbnailCode) => {
        console.log(`📸 Thumbnail generation exited with code ${thumbnailCode}`);
        if (thumbnailCode === 0) {
          return res.json({
            message: 'Upload and processing successful',
            streamUrl: `/videos/${baseFilename}/index.m3u8`,
            thumbnailUrl: `/thumbnails/${baseFilename}.jpg`,
          });
        } else {
          console.error(`❌ Thumbnail generation failed with code ${thumbnailCode}`);
          return res.status(500).json({ error: 'FFmpeg thumbnail generation failed' });
        }
      });
    });
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const origin = req.get('origin');
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  console.error('❌ Server error:', err.message, err.stack);
  res.status(500).json({ error: 'Internal server error' });
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  const origin = req.get('origin');
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.status(200).json({ status: 'OK' });
});

// Log registered routes for debugging
console.log('Registered routes:');
app._router.stack.forEach((r: any) => {
  if (r.route && r.route.path) {
    console.log(`Route: ${r.route.path}`);
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running on http://0.0.0.0:${PORT}`);
});
