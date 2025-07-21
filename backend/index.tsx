// index.tsx
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/bun';
import { MultipartReader } from 'hono/utils/multipart';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { spawn } from 'child_process';

const app = new Hono();

const FRONTEND_ORIGIN = 'https://frontend-mu-two-39.vercel.app';
const ALLOWED_ORIGINS = [FRONTEND_ORIGIN, 'http://localhost:3000'];

app.use('/*', cors({
  origin: (origin) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return origin;
    return ''; // deny anything else
  },
  credentials: true,
  allowMethods: ['POST', 'GET', 'OPTIONS'],
  allowHeaders: ['Content-Type']
}));

// Serve static HLS and thumbnails
app.use('/videos/*', serveStatic({ root: './' }));
app.use('/thumbnails/*', serveStatic({ root: './' }));

// Upload endpoint
app.post('/upload', async (c) => {
  const contentType = c.req.header('content-type') || '';
  const match = contentType.match(/boundary=(.*)$/);
  if (!match) return c.json({ error: 'Invalid multipart request' }, 400);

  const boundary = match[1];
  const reader = new MultipartReader(c.req.raw, boundary);
  const form = await reader.readForm();
  const file = form.files('video')?.[0];

  if (!file) return c.json({ error: 'No video file provided' }, 400);

  const tempPath = file.tempfile;
  const filename = file.originalName.replace(/\.[^/.]+$/, '');
  const videosDir = join('./videos', filename);
  const thumbnailPath = join('./thumbnails', `${filename}.jpg`);
  const outputM3U8 = join(videosDir, 'index.m3u8');

  if (!existsSync(videosDir)) mkdirSync(videosDir, { recursive: true });
  if (!existsSync('./thumbnails')) mkdirSync('./thumbnails');

  // Spawn ffmpeg to convert to HLS
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
    outputM3U8
  ]);

  await new Promise<void>((resolve, reject) => {
    ffmpeg.on('close', (code) => code === 0 ? resolve() : reject(new Error('FFmpeg failed')));
    ffmpeg.on('error', reject);
  });

  // Create thumbnail
  const thumbnail = spawn('ffmpeg', [
    '-i', outputM3U8,
    '-ss', '00:00:02.000',
    '-vframes', '1',
    '-vf', 'scale=320:-1',
    '-y', thumbnailPath
  ]);

  await new Promise<void>((resolve, reject) => {
    thumbnail.on('close', (code) => code === 0 ? resolve() : reject(new Error('Thumbnail failed')));
    thumbnail.on('error', reject);
  });

  return c.json({
    message: 'Upload successful',
    streamUrl: `/videos/${filename}/index.m3u8`,
    thumbnailUrl: `/thumbnails/${filename}.jpg`
  });
});

// Health check
app.get('/health', (c) => c.json({ status: 'OK' }));

// Start server
Bun.serve({
  port: Number(Bun.env.PORT || 3000),
  fetch: app.fetch
});
