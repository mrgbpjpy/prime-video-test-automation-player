import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Setting up Multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Serve processed videos statically
app.use('/videos', express.static(path.join(__dirname, 'videos')));

// Upload endpoint
app.post('/upload', upload.single('video'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const { filename, path: inputPath } = req.file;
  //const inputPath = req.file.path;
  const outputDir = path.join(__dirname, 'videos', req.file.filename); // ✅ fixed from 'video' → 'videos'
  fs.mkdirSync(outputDir, { recursive: true });

    convertToHLS(inputPath, outputDir, () => {
    const m3u8Url = `http://localhost:${PORT}/videos/${filename}/index.m3u8`;
    res.json({ message: 'Upload and conversion successful', url: m3u8Url });
  });

});

// Function to spawn FFmpeg for HLS conversion
function convertToHLS(inputPath: string, outputDir: string, callback: () => void): void {
  const args = [
    '-i', inputPath,
    '-codec', 'copy',
    '-start_number', '0',
    '-hls_time', '10',
    '-hls_list_size', '0',
    '-f', 'hls',
    path.join(outputDir, 'index.m3u8'),
  ];

  const ffmpeg = spawn('ffmpeg', args);

  ffmpeg.stderr.on('data', (data) => console.error(`FFmpeg error: ${data}`));

  ffmpeg.on('close', (code) => {
    if (code === 0) {
      console.log('✅ HLS conversion completed.');
      callback();
    } else {
      console.error(`❌ FFmpeg exited with code ${code}`);
    }
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
