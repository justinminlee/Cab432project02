const express = require('express');
const bodyParser = require('body-parser');
const compression = require('compression');
const cors = require('cors');
const fs = require('fs');
const archiver = require('archiver');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());

app.use(bodyParser.json());
app.use(compression());

app.use(express.static(path.join(__dirname, 'client/app')));

// API route for file compression
app.post('/compress', async (req, res) => {
  const { files, format } = req.body;

  if (!format || !['zip', 'tar.gz'].includes(format)) {
    return res.status(400).send('Invalid compression format');
  }

  const archive = archiver(format, { gzip: format === 'tar.gz', zlib: { level: 9 } });
  const output = fs.createWriteStream(`compressed.${format}`);

  archive.pipe(output);

  files.forEach((file) => {
    archive.file(file.path, { name: file.name });
  });

  archive.finalize();

  output.on('close', () => {
    const compressionCommand = format === 'tar.gz' ? 'gzip' : 'bzip2';
    exec(`${compressionCommand} -9 compressed.${format}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Compression error: ${stderr}`);
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
