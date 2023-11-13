// imported required modules
const express = require('express'); // web framework for NodeJS
const compression = require('compression'); // Middleware for compressing HTTP responses.
const { createGzip } = require('compression-streams'); // Compression using streams.
const path = require('path'); // Utility for working with file paths.
const fs = require('fs'); // File system module for working with file I/O.
const multer = require('multer'); // Middleware for handling multipart/form-data, which is primarily used for file uploads.
const ConvertApi = require('convertapi-js'); // A library for working with the ConvertAPI service for file conversion.
const bodyParser = require('body-parser');
const redis = require('redis');
const AWS = require('aws-sdk');
const busboy = require('busboy');
const sharp = require('sharp');
const archiver = require('archiver');
const cors = require('cors');
const formidable = require('express-formidable');
require("dotenv").config();

// Configure Multer for File Upload:
const storage = multer.memoryStorage();
const upload = multer({ storage: storage }); // multer.memoryStorage(): Configuration for storing uploaded files in memory.

// Set Up ConvertAPI Key:
const convertApiKey = 'LjMHwWnECuHQK6ZV'; 
const convertApi = ConvertApi.auth(convertApiKey);

// Create Express App and Set Port:
const app = express();
const port = process.env.PORT || 3000;
app.use(cors());

//aws set up
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  sessionToken: process.env.AWS_SESSION_TOKEN,
  region: process.env.REGION,
});
// S3 setup
const s3 = new AWS.S3();
const BUCKET_NAME =  process.env.S3_BUCKET_NAME;
//redis setup
const redisClient = redis.createClient();
(async () => {
    try {
        await  redisClient.connect();  
    } catch (err) {
        console.log(err);
    }
})();
redisClient.on("error", function (error) {
    console.error("Redis Error: ", error);
});


app.use(compression()); // compression(): Compresses responses using the gzip compression.
app.use(express.static('client/build')); // express.static('client/build'): Serves static files from the 'client/build' directory.

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
async function checkS3ForKey(key) {
  const params = {
  Bucket: BUCKET_NAME,
  Key: key,
  };

  try {
  await s3.headObject(params).promise();
  return true;
  } catch (err) {
  if (err.code === 'NotFound') {
      return false;
  }
  throw err;
  }
}

async function uploadToS3(key, buffer) {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: 'image/jpeg' 
  };

  const uploadResult = await s3.upload(params).promise();
  return uploadResult.Location;
}
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
