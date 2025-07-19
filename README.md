prime-video-test-automation-player

# Prime Video Test Automation Project
===

# 

# This project simulates a simplified version of the video upload and streaming pipeline you'd expect in a media engineering or SDET role at a company like Amazon Prime Video.

# 

# It includes:

# \- A \*\*TypeScript + Express.js backend\*\* for handling video uploads

# \- \*\*FFmpeg integration\*\* for converting `.mp4` files to HLS (`.m3u8 + .ts`)

# \- A \*\*React + TypeScript frontend\*\* (in progress) for uploading and playing the video

# \- Project structure optimized for test automation, scalability, and future CI/CD

# 

# ---

# 

# \## 📁 Project Structure

# 

# ```

# prime-video-test-automation-player/

# ├── backend/              # Node.js + TypeScript server with FFmpeg \& Multer

# │   └── server.ts

# ├── frontend/             # React app (TypeScript)

# │   └── src/

# │       ├── components/

# │       │   └── VideoPlayer.tsx

# ├── tests/                # Test automation scripts (coming soon)

# ├── scripts/              # Helper or FFmpeg automation scripts

# ├── docs/                 # Architecture diagrams, notes, planning

# └── README.md

# ```

# 

# ---

# 

# \## ⚙️ Backend Setup (Node + TypeScript)

# 

# 1\. \*\*Navigate to the backend folder:\*\*

# &nbsp;  ```bash

# &nbsp;  cd backend

# &nbsp;  ```

# 2\. \*\*Install dependencies:\*\*

# &nbsp;  ```bash

# &nbsp;  npm install express cors multer

# &nbsp;  npm install --save-dev typescript ts-node @types/node @types/express @types/multer @types/cors

# &nbsp;  ```

# 3\. \*\*Initialize TypeScript:\*\*

# &nbsp;  ```bash

# &nbsp;  npx tsc --init

# &nbsp;  ```

# 4\. \*\*Run the server:\*\*

# &nbsp;  ```bash

# &nbsp;  npx ts-node server.ts

# &nbsp;  ```

# 

# \- Server runs at: `http://localhost:5000`

# \- Upload video via POST: `http://localhost:5000/upload`

# \- Returned HLS stream: `http://localhost:5000/videos/<file-id>/index.m3u8`

# 

# ---

# 

# \## 📦 Frontend Setup (React + TypeScript)

# 

# 1\. \*\*Navigate to frontend folder:\*\*

# &nbsp;  ```bash

# &nbsp;  cd frontend

# &nbsp;  ```

# 2\. \*\*Create React App in-place:\*\*

# &nbsp;  ```bash

# &nbsp;  npx create-react-app . --template typescript

# &nbsp;  ```

# 3\. \*\*Install Video.js:\*\*

# &nbsp;  ```bash

# &nbsp;  npm install video.js

# &nbsp;  ```

# 4\. \*\*Use `VideoPlayer.tsx` component\*\* in `App.tsx`:

# &nbsp;  ```tsx

# &nbsp;  import VideoPlayer from './components/VideoPlayer';

# &nbsp;  // pass m3u8 URL to <VideoPlayer src="..." />

# &nbsp;  ```

# 

# ---

# 

# \## ✅ Features Implemented

# 

# \- \[x] Multer upload handling

# \- \[x] FFmpeg `.mp4` → HLS (`.m3u8`)

# \- \[x] Static file serving for HLS

# \- \[x] React + TypeScript frontend scaffolded

# \- \[x] GitHub version control

# 

# ---

# 

# \## 📌 Next Steps

# 

# \- \[ ] Create `UploadForm.tsx` to POST video from UI

# \- \[ ] Add test automation with Selenium or Playwright

# \- \[ ] Add CI/CD using GitHub Actions

# \- \[ ] Add GenAI-based test generation demo (for SDET role alignment)

# 

# ---

# 

# \## 🔗 Useful URLs

# 

# \- Backend: `http://localhost:5000`

# \- Upload endpoint: `POST /upload`

# \- Video stream: `GET /videos/{id}/index.m3u8`

# 

# ---

# 

# \## 👤 Author

# 

# Erick Esquilin – aspiring media engineer / SDET

# 

# 📂 GitHub repo: \[prime-video-test-automation-player](https://github.com/mrgbpjpy/prime-video-test-automation-player)

# 

# ---

# 

# \## 🛠 Tools Used

# 

# \- Node.js

# \- Express

# \- TypeScript

# \- FFmpeg

# \- React.js

# \- Video.js

# \- Multer

# \- ts-node



