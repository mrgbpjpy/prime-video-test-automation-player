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

// Serve static HLS video files
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

// Serve HTML on /
app.get('/', (req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Prime Video Backend Server</title>
      <style>
        body { font-family: Arial; text-align: center; margin-top: 40px; background-color: #f4f4f4; }
        input { margin: 20px auto; display: block; }
        video { width: 80%; margin-top: 20px; }
        img { margin-top: 10px; border: 2px solid #000; }
      </style>
    </head>
    <body>
      <h1>🚀 Prime Video Server is Running</h1>
      <form enctype="multipart/form-data" method="post" action="/upload">
        <input type="file" name="video" accept="video/*" required />
        <button type="submit">Upload</button>
      </form>
      <p>Upload a video to stream it as HLS!</p>
    </body>
    </html>
  `);
});

// Multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Upload endpoint
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
      fs.unlinkSync(inputPath); // Cleanup

      if (code === 0) {
        // Generate thumbnail
        spawn('ffmpeg', [
          '-i', outputM3U8,
          '-ss', '00:00:01.000',
          '-vframes', '1',
          thumbnailPath
        ]);

        const streamUrl = `/videos/${safeFileName}/index.m3u8`;
        const thumbUrl = `/thumbnails/${safeFileName}.jpg`;

        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Upload Successful</title>
            <style>
              body { font-family: Arial; text-align: center; margin-top: 40px; background-color: #f0f0f0; }
              video { width: 80%; margin-top: 20px; }
              img { margin-top: 10px; border: 2px solid #000; }
            </style>
          </head>
          <body>
            <h2>✅ Upload Successful</h2>
            <video controls src="${streamUrl}" poster="${thumbUrl}"></video>
            <p><strong>Thumbnail:</strong></p>
            <img src="${thumbUrl}" width="300" />
            <br><br>
            <a href="/">Upload Another</a>
          </body>
          </html>
        `);
      } else {
        res.status(500).send('FFmpeg failed to convert video.');
      }
    });
  } catch (err: any) {
    console.error('❌ Upload error:', err.message);
    res.status(500).send('Upload processing failed.');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${PORT}`);
});
