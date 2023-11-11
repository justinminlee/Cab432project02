import React, { useState } from 'react'

const FileCompression = () => {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const compressFile = async () => {
    if (!file) {
      setResult('No file selected');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/compress', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setResult(`Compressed file available at: ${data.compressedFile}`);
    } catch (error) {
      setResult(`Error: ${error.message}`);
    }
  };

  return (
    <div>
      <h1>File Compression</h1>
      <p>Select a file to compress:</p>

      <input type="file" onChange={handleFileChange} accept=".txt, .pdf, .jpg, .png, .zip" required />
      <button type="button" onClick={compressFile}>
        Compress File
      </button>

      <div>{result}</div>
    </div>
  );
};

export default FileCompression;