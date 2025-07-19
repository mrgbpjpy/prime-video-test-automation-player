import React, { useState, ChangeEvent } from 'react';

const App: React.FC = () => {
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadComplete, setUploadComplete] = useState<boolean>(false);
  const [conversionStatus, setConversionStatus] = useState<string>('');
  const [videoPath, setVideoPath] = useState<string>('');

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleUpload = (file: File) => {
    const formData = new FormData();
    formData.append('video', file);

    setUploading(true);
    setUploadProgress(0);
    setUploadComplete(false);
    setConversionStatus('');
    setVideoPath('');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://prime-video-backend.onrender.com/upload', true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);
      }
    };

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        setUploading(false);

        if (xhr.status === 200) {
          setUploadComplete(true);
          setConversionStatus('Converting video...');

          try {
            const { streamUrl } = JSON.parse(xhr.responseText);

            const pollInterval = setInterval(() => {
              fetch(`https://prime-video-backend.onrender.com${streamUrl}`, { method: 'HEAD' })
                .then(res => {
                  if (res.ok) {
                    clearInterval(pollInterval);
                    setConversionStatus('✅ Done! Video ready to watch.');
                    setVideoPath(`https://prime-video-backend.onrender.com${streamUrl}`);
                  }
                })
                .catch(() => {});
            }, 2000);
          } catch (err) {
            setConversionStatus('❌ Failed to parse server response.');
          }
        } else {
          setConversionStatus('❌ Upload failed.');
        }
      }
    };

    xhr.send(formData);
  };

  return (
    <div style={{ textAlign: 'center', paddingTop: '40px', fontFamily: 'Arial' }}>
      <h1>🎬 Prime Video Player Demo</h1>

      <input type="file" accept="video/*" onChange={handleFileChange} />

      {uploading && (
        <div style={{ marginTop: '20px' }}>
          <p>Uploading: {uploadProgress}%</p>
          <progress value={uploadProgress} max="100" style={{ width: '300px' }} />
        </div>
      )}

      {uploadComplete && (
        <div style={{ marginTop: '20px', fontWeight: 'bold' }}>
          <p>{conversionStatus}</p>
        </div>
      )}

      {videoPath && (
        <div style={{ marginTop: '30px' }}>
          <video width="720" height="480" controls>
            <source src={videoPath} type="application/x-mpegURL" />
            Your browser does not support the video tag.
          </video>
        </div>
      )}
    </div>
  );
};

export default App;
