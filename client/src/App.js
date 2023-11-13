// src/App.js
import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [compressionFormat, setCompressionFormat] = useState('zip');
  const [downloadLink, setDownloadLink] = useState(null);

  const handleFileChange = (e) => {
    const files = e.target.files;
    setSelectedFiles([...selectedFiles, ...files]);
  };

  const handleCompressionFormatChange = (e) => {
    setCompressionFormat(e.target.value);
  };

  const handleCompression = async () => {
    if (selectedFiles.length === 0) {
      console.error('No files selected for compression');
      return;
    }

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append('files', file);
    });

    try {
      const response = await axios.post(`http://localhost:3000/compress?format=${compressionFormat}`, formData, {
        responseType: 'blob',
      });

      const downloadUrl = (window.URL || window.webkitURL).createObjectURL(new Blob([response.data]));

      setDownloadLink(downloadUrl);

      // Clean up
      (window.URL || window.webkitURL).revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error during compression:', error);
    }
  };

  return (
    <div className="App">
      <h1>File Compression App</h1>
      <input type="file" multiple onChange={handleFileChange} />
      <label>
        Compression Format:
        <select value={compressionFormat} onChange={handleCompressionFormatChange}>
          <option value="zip">ZIP</option>
          <option value="tar.gz">Tar Gzip</option>
        </select>
      </label>
      <button onClick={handleCompression}>Compress</button>
      {downloadLink && <a href={downloadLink} download={`compressed.${compressionFormat}.bz2`}>Download Compressed File</a>}
    </div>
  );
}

export default App;
