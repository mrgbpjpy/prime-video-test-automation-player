# 🎬 Prime Video Test Automation Player

A full-stack video uploader and HLS streaming platform.

- Upload a video file
- Convert it to HLS (`.m3u8` and `.ts` segments) using FFmpeg
- Auto-generate a thumbnail
- Play the video with a React + Vite video player

🌐 **Live Site**: [https://frontend-mu-two-39.vercel.app/](https://frontend-mu-two-39.vercel.app/)

---

## 🔧 Tech Stack

- **Frontend**: React + TypeScript + Vite → [Deployed to Vercel](https://frontend-mu-two-39.vercel.app/)
- **Backend**: Node.js + Express + FFmpeg → Deployed to Render
- **Video Processing**: FFmpeg for HLS and thumbnail generation
- **Uploads**: Multer
- **Streaming**: HLS (`.m3u8`) served with CORS headers

---

## 📁 Folder Structure

```
prime-video-test-automation-player/
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── VideoPlayer.tsx
│   │   └── ...
│   ├── vite.config.ts
│   └── .env                # VITE_API_BASE_URL
│
├── backend/
│   ├── server.ts
│   ├── tsconfig.json
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
Set the following Render environment variables:

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

1. Select a `.mp4`, `.mov`, or other video file
2. Frontend sends it to backend via `POST /upload`
3. Backend:
   - Uses FFmpeg to convert to HLS
   - Generates a `.jpg` thumbnail
   - Responds with HLS and thumbnail paths
4. Video is streamed in the browser

---

## ✅ Sample Output

- HLS: `/videos/your-file/index.m3u8`
- Thumbnail: `/thumbnails/your-file.jpg`

---

## 🚀 Deployment

- **Frontend**: Vercel  
  🔗 https://frontend-mu-two-39.vercel.app/
- **Backend**: Render  
  ⚙️ Make sure Render supports FFmpeg in your runtime

---

## 📌 To Do

- Upload progress
- Auth
- Persistent database (e.g. Supabase, MongoDB)
- Edit metadata

---

## 👨‍💻 Author

Erick Esquilin  
[Portfolio](https://erick-esquilin-portfolio.vercel.app/)

---

## 📄 License

MIT
