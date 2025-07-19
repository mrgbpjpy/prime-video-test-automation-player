import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';

const app = express();
const PORT = process.env.PORT || 5000;

// Vercel frontend origin (update to your deployed domain)
const FRONTEND_ORIGIN = 'https://frontend-mu-two-39.vercel.app';

// Create folders if they don't exist
const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

ensureDir(path.join(__dirname, 'uploads'));
ensureDir(path.join(__dirname, 'videos'));
ensureDir(path.join(__dirname, 'public', 'thumbnails'));

// Middleware
app.use(cors({
  origin: FRONTEND_ORIGIN,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// File upload
const upload = multer({ dest: 'uploads/' });

// Serve HLS files
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

// Serve thumbnails
app.use('/thumbnails', express.static(path.join(__dirname, 'public', 'thumbnails')));

// Upload handler
app.post('/upload', upload.single('video'), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video file uploaded' });
  }

  const inputPath = req.file.path;
  const fileNameNoExt = path.parse(req.file.originalname).name.replace(/\s+/g, '_');
  const safeFileName = fileNameNoExt.replace(/[^a-zA-Z0-9-_]/g, '');
  const outputDir = path.join(__dirname, 'videos', safeFileName);
  const thumbnailPath = path.join(__dirname, 'public', 'thumbnails', `${safeFileName}.jpg`);
  const m3u8Path = path.join(outputDir, 'index.m3u8');

  try {
    fs.mkdirSync(outputDir, { recursive: true });

    console.log(`🎥 Starting HLS conversion for: ${req.file.originalname}`);

    ffmpeg(inputPath)
      .output(m3u8Path)
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
      .on('start', command => console.log('🔧 FFmpeg command:', command))
      .on('end', () => {
        console.log('✅ HLS conversion complete.');

        // Attempt to generate thumbnail
        ffmpeg(inputPath)
          .screenshots({
            count: 1,
            filename: `${safeFileName}.jpg`,
            folder: path.join(__dirname, 'public', 'thumbnails'),
            size: '640x360'
          })
          .on('end', () => {
            console.log('📸 Thumbnail created.');
            res.json({
              message: 'Upload and processing successful',
              streamUrl: `/videos/${safeFileName}/index.m3u8`,
              thumbnailUrl: `/thumbnails/${safeFileName}.jpg`
            });
          })
          .on('error', err => {
            console.warn('⚠️ Thumbnail failed:', err.message);
            res.json({
              message: 'Upload and processing successful (thumbnail skipped)',
              streamUrl: `/videos/${safeFileName}/index.m3u8`
            });
          });

      })
      .on('error', (err) => {
        console.error('❌ FFmpeg error:', err.message);
        return res.status(500).json({ error: 'Failed to convert video to HLS format' });
      })
      .run();

  } catch (err: any) {
    console.error('❌ Upload error:', err.message);
    res.status(500).json({ error: 'Upload processing failed' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
});
