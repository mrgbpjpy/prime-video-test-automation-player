# 🎬 Prime Video Test Automation Player

A full-stack video uploader, converter, and streaming platform with real-time UI feedback and test automation simulation.

- 📤 Upload any `.mp4`, `.mov`, or compatible video file
- 🔄 Convert the video into HLS format (`.m3u8` + `.ts`) using FFmpeg
- 🖼️ Auto-generate a thumbnail for the video
- 📺 Stream videos via a custom React + Vite video player with real-time progress
- 🧪 Simulate UI test automation steps using Playwright preview

🌐 **Live Demo**: [https://frontend-mu-two-39.vercel.app/](https://frontend-mu-two-39.vercel.app/)

---

## 🔧 Tech Stack

- **Frontend**: React + TypeScript + Vite → [Deployed to Vercel](https://frontend-mu-two-39.vercel.app/)
- **Backend**: Node.js + Express + FFmpeg → Deployed to Render
- **Video Processing**: FFmpeg (HLS conversion, thumbnail generation)
- **Uploads**: Multer handles file storage
- **Streaming**: HLS served with CORS support
- **Test Automation (Simulated)**: Playwright-style UI preview built into the UI

---

## 📁 Folder Structure

```
prime-video-test-automation-player/
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── AppWithTestPreview.tsx    # UI simulates automation flow
│   │   ├── VideoPlayer.tsx
│   │   └── ...
│   ├── vite.config.ts
│   └── .env                          # VITE_API_BASE_URL
│
├── backend/
│   ├── server.ts
│   ├── uploads/
│   ├── videos/
│   └── ...
└── README.md
```

---

## ⚙️ Environment Variables

### Frontend (`frontend/.env`)
```
VITE_API_BASE_URL=https://your-backend-on-render.com
```

### Backend (Render)
Set the following environment variables on Render:

| Key       | Value         |
|-----------|---------------|
| `PORT`    | 5000          |
| `NODE_ENV`| production    |

---

## 🧠 TypeScript Fix for Vite

Add this to `frontend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["vite/client"]
  }
}
```

---

## 🏃 Local Development

### Backend (Express + FFmpeg)
```bash
cd backend
npm install
npx ts-node server.ts
```

### Frontend (Vite + React)
```bash
cd frontend
npm install
npm run dev
```

Visit: [http://localhost:5173](http://localhost:5173)

---

## 📤 Upload Workflow

1. Select a video file
2. Frontend sends it via `POST /upload`
3. Backend processes with FFmpeg
4. Generates `.m3u8` + `.ts` + thumbnail `.jpg`
5. Video plays back in browser

---

## ✅ Sample Output

- HLS: `/videos/your-file/index.m3u8`
- Thumbnail: `/thumbnails/your-file.jpg`

---

## 🚀 Deployment

- **Frontend**: Vercel  
- **Backend**: Render (ensure FFmpeg support)

---

## 👨‍💻 Author

Erick Esquilin  
[Portfolio](https://erick-esquilin-portfolio.vercel.app/)

---

## 📄 License

MIT
