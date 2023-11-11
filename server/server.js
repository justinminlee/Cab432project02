const express = require('express')
const compression = require('compression');
const { createGzip } = require('compression-streams');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

app.use(compression());

app.use(express.static(path.join(__dirname, 'client/build')));

app.post('/compress', async (req, res) => {
    const { readable, writable, promise } = createGzip();
  
    req.pipe(writable);
  
    const compressedFileName = 'compressed_file.gz';
    const compressedFilePath = path.join(__dirname, 'uploads', compressedFileName);
    const compressedFileStream = fs.createWriteStream(compressedFilePath);
  
    readable.pipe(compressedFileStream);
  
    promise.then(() => {
      res.json({ compressedFile: `/uploads/${compressedFileName}` });
    });
  });


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });

