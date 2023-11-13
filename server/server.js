const express = require('express');
const bodyParser = require('body-parser');
const compression = require('compression');
const cors = require('cors');
const fs = require('fs');
const archiver = require('archiver');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

app.use(bodyParser.json());
app.use(compression());

app.use(express.static(path.join(__dirname, 'client/build')));

// API route for file compression
app.post('/compress', (req, res) => {
  const { files } = req.body;
  const { format } = req.query;
  const archive = archiver(format, { gzip: format === 'tar.gz', zlib: { level: 9 } });
  const output = fs.createWriteStream(`compressed.${format}`);

  archive.pipe(output);

  files.forEach((file) => {
    archive.file(file.path, { name: file.name });
  });

  archive.finalize();

  output.on('close', () => {
    exec(`bzip2 -9 compressed.${format}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Compression error: ${stderr}`);
        res.status(500).send('Compression failed');
        res.status(500).send(`Compression failed: ${error.message}`);
      } else {
        const filePath = path.join(__dirname, `compressed.${format}.bz2`);
        res.download(filePath, `compressed.${format}.bz2`, (downloadError) => {
          if (downloadError) {
            console.error(`Download error: ${downloadError}`);
            res.status(500).send('Download failed');
          } else {
            fs.unlinkSync(`compressed.${format}`);
            fs.unlinkSync(filePath);
          }
        });
      }
    });
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build/index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
