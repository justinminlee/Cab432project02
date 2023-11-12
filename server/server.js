const express = require('express');
const compression = require('compression');
const { createGzip } = require('compression-streams');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const ConvertApi = require('convertapi-js');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const convertApiKey = 'LjMHwWnECuHQK6ZV'; // Replace with your actual ConvertAPI key
const convertApi = ConvertApi.auth(convertApiKey);

const app = express();
const port = process.env.PORT || 3000;

app.use(compression());
app.use(express.static('client/build'));

app.post('/compress', async (req, res) => {
  try {
    const { readable, writable, promise } = createGzip();
    req.pipe(writable);

    const compressedFileName = 'compressed_file.gz';
    const compressedFilePath = path.join(__dirname, 'uploads', compressedFileName);
    const compressedFileStream = fs.createWriteStream(compressedFilePath);

    readable.pipe(compressedFileStream);

    promise.then(() => {
      res.json({ compressedFile: `/uploads/${compressedFileName}` });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/convert', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const inputFormat = req.body.inputFormat || 'docx';
    const outputFormat = req.body.outputFormat || 'pdf';

    const params = convertApi.createParams();
    params.addFile(req.file.buffer, 'inputFile');

    const conversionResult = await convertApi.convert(inputFormat, outputFormat, params);

    const convertedFileName = `converted_${req.file.originalname}`;
    const convertedFilePath = `/uploads/${convertedFileName}`;

    return res.json({ convertedFile: convertedFilePath });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
