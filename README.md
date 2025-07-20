# 🎬 Prime Video Test Automation Player

Live Project [Prime Video Player Demo](https://frontend-mu-two-39.vercel.app/)

This project simulates a lightweight version of a Prime Video-like uploader and player system using a full-stack TypeScript application. It allows you to:

- Upload a video from a frontend React UI
- Convert the video to HLS format using FFmpeg on the backend
- Generate a thumbnail for the uploaded video
- Stream the video using a custom player
- Simulate a test log to validate video upload & playback process

## 📁 Project Structure

```
prime-video-test-automation-player/
├── backend/
│   ├── server.ts                # Node + Express backend with FFmpeg
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # React frontend for uploading and viewing
│   │   ├── VideoPlayer.tsx      # HLS player component
│   │   └── App.css              # Styles
├── public/
│   └── index.html               # Static assets and entry point
```

## 🚀 Features

- Uploads video files to the backend
- Converts to adaptive bitrate `.m3u8` (HLS) segments using FFmpeg
- Auto-generates a thumbnail (`.jpg`)
- Displays upload progress
- Streams the video with `hls.js` via a React component
- Real-time test simulation log for QA validation

## 🧰 Tech Stack

- Frontend: React (TypeScript), `hls.js`
- Backend: Express (TypeScript), FFmpeg, Multer
- Deployment: Supports local dev + Render.com
- Format: `.ts`, `.m3u8`, `.jpg`

## 📦 Requirements

- Node.js `^18.x` or `^20.x`
- FFmpeg (must be installed and available in your system PATH)
- [Render.com](https://render.com/) for deployment (or run locally)

## ⚙️ Setup Instructions

### 1. Clone the Repo

```bash
git clone https://github.com/mrgbpjpy/prime-video-test-automation-player.git
cd prime-video-test-automation-player
```

### 2. Backend (Express + FFmpeg)

```bash
cd backend
npm install
npx ts-node server.ts
```

> 📌 Make sure FFmpeg is installed (`ffmpeg -version`).

### 3. Frontend (React App)

```bash
cd frontend
npm install
npm start
```

To point the frontend to your backend, you can add a `.env` file in `/frontend`:

```
REACT_APP_API_BASE_URL=http://localhost:5000
```

## 📂 Upload Behavior

- Upload any `.mp4`, `.mov`, or other FFmpeg-supported formats
- The backend:
  - Stores original upload in `uploads/`
  - Converts to HLS and saves to `videos/<filename>/index.m3u8`
  - Creates a thumbnail in `thumbnails/<filename>.jpg`
- The frontend:
  - Shows progress bar + logs
  - Renders video using `hls.js` and `VideoPlayer.tsx`

## 🌐 Deployment (Render)

1. Set your **start command** in Render to:

```bash
npx ts-node server.ts
```

2. Use the default Node version or specify it in `package.json` like:

```json
"engines": {
  "node": "20.x"
}
```

## 📧 Author Info

**Erick Esquilin**  
📩 Email: [mrgbpjpy@gmail.com](mailto:mrgbpjpy@gmail.com)

## 🧪 Sample Test Simulation Log

The frontend logs actions like:

- File selection
- Upload progress
- Backend conversion status
- Completion confirmation

These logs simulate automated test behaviors without using Playwright or Cypress.

## 🛠 Troubleshooting

- **TS1127 / TS1160 Errors?**
  - Avoid emojis or invisible Unicode in `server.ts`
  - Close all template strings properly
- **Video Not Playing?**
  - Ensure FFmpeg output is generating `.m3u8` correctly
  - Check browser compatibility for HLS (`hls.js` handles this)
- **iPhone Safari?**
  - Native HLS playback supported, but test with hosted video to avoid local CORS

## 📝 License

MIT – use this project freely or fork to customize for your own QA video test tools.

## 🙌 Acknowledgments

- [FFmpeg](https://ffmpeg.org/)
- [React](https://reactjs.org/)
- [Render](https://render.com/)
