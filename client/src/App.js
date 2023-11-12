import React, { useState } from 'react';
import ConvertApi from 'convertapi-js';

const FileCompression = () => {
  const [file, setFile] = useState(null);
  const [inputFormat, setInputFormat] = useState('docx');
  const [outputFormat, setOutputFormat] = useState('pdf');
  const [result, setResult] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const compressFile = async () => {
    try {
      if (!file) {
        setResult('No file selected for compression');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

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

  const convertFile = async () => {
    try {
      if (!file) {
        setResult('No file selected for conversion');
        return;
      }

      // https://www.convertapi.com/

      let convertApi = ConvertApi.auth('LjMHwWnECuHQK6ZV');
      let params = convertApi.createParams();

      if (params.addFile) {
        params.addFile(file, 'inputFile');
      } else {
        params = {
          inputFile: file,
        };
      }

      let conversionResult;
      if (inputFormat === 'docx' && outputFormat === 'pdf') {
        conversionResult = await convertApi.convert('docx', 'pdf', params);
      } else if (inputFormat === 'xlsx' && outputFormat === 'pdf') {
        conversionResult = await convertApi.convert('xlsx', 'pdf', params);
      } else if (inputFormat === 'pptx' && outputFormat === 'pdf') {
        conversionResult = await convertApi.convert('pptx', 'pdf', params);
      } else if (inputFormat === 'docx' && outputFormat === 'html') {
        conversionResult = await convertApi.convert('docx', 'html', params);
      } else if (inputFormat === 'xls' && outputFormat === 'csv') {
        conversionResult = await convertApi.convert('xls', 'csv', params);
      } else if (inputFormat === 'docx' && outputFormat === 'compare') {
        conversionResult = await convertApi.convert('docx', 'compare', params);
      } else {
        throw new Error('Unsupported conversion scenario');
      }

      setResult(`Conversion successful. Result URL: ${conversionResult.response.Files[0].Url}`);
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

      <h1>File Conversion</h1>
      <p>Select a file to convert:</p>

      <input type="file" onChange={handleFileChange} required />

      <div>
        <label htmlFor="inputFormat">Input Format:</label>
        <select id="inputFormat" value={inputFormat} onChange={(e) => setInputFormat(e.target.value)}>
          <option value="docx">DOCX</option>
          <option value="xlsx">XLSX</option>
          {/* Add more input format options as needed */}
        </select>

        <label htmlFor="outputFormat">Output Format:</label>
        <select id="outputFormat" value={outputFormat} onChange={(e) => setOutputFormat(e.target.value)}>
          <option value="pdf">PDF</option>
          <option value="html">HTML</option>
          <option value="csv">CSV</option>
          {/* Add more output format options as needed */}
        </select>

        <button type="button" onClick={convertFile}>
          Convert File
        </button>
      </div>

      <div>{result}</div>
    </div>
  );
};

export default FileCompression;
