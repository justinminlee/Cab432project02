const express = require('express');
const bodyParser = require('body-parser');
const compression = require('compression');
const cors = require('cors');
const fs = require('fs');
const archiver = require('archiver');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const responseTime = require('response-time')
const axios = require('axios');
const redis = require('redis');
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
// This section will change for Cloud Services 
// Redis setup
const redisClient = redis.createClient();
redisClient.connect()
  .catch((err) => {
    console.log(err);
  });

// // Print redis errors to the console
// client.on('error', (err) => {
//   console.log("Error " + err);
// });

require('dotenv').config();
const AWS = require('aws-sdk');

// Cloud Services Set-up 
// Create unique bucket name
const bucketName = "rjotadoyassessedpracone";
const s3 = new AWS.S3({ apiVersion: "2006-03-01" });

(async () => {
  try {
    await s3.createBucket({ Bucket: bucketName }).promise();
    console.log(`Created bucket: ${bucketName}`);
  } catch (err) {
    // We will ignore 409 errors which indicate that the bucket already exists
    if (err.statusCode !== 409) {
      console.log(`Error creating bucket: ${err}`);
    }
  }
})();

// Used to display response time in HTTP header
app.use(responseTime());

app.get("/api/search", async (req, res) => {
  const query = req.query.query.trim();
  
  // Construct the wiki URL and Redis key
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=parse&format=json&section=0&page=${query}`;
  const redisKey = `wikipedia:${query}`;
  const s3Key = `wikipedia-${query}`;

  try {
    // 1. Check Redis Cache
    const redisResult = await redisClient.get(redisKey);

    if (redisResult) {
      // Serve from Redis
      const cacheJSON = JSON.parse(redisResult);
      return res.json({ ...cacheJSON, source: "Redis Cache" });
    }

    // 2. Check S3 if not in cache
    const s3Params = { Bucket: bucketName, Key: s3Key };

    try {
      const s3Result = await s3.getObject(s3Params).promise();
      const s3JSON = JSON.parse(s3Result.Body);

      // Store in Redis Cache for next time
      redisClient.setEx(
        redisKey,
        3600, // Cache for an hour (adjust as needed)
        JSON.stringify({ source: "Redis Cache", ...s3JSON })
      );

      // Serve from S3
      return res.json({ source: "S3 Bucket", ...s3JSON });
    } catch (s3Error) {
      if (s3Error.statusCode !== 404) {
        // Handle errors other than 'not found'
        return res.status(500).json(s3Error);
      }
    }

    // 3. Fetch from Wikipedia if not in S3
    try {
      const wikiResponse = await axios.get(searchUrl);
      const wikiJSON = wikiResponse.data;

      // Store in S3
      const body = JSON.stringify({
        source: "S3 Bucket",
        ...wikiJSON,
      });

      const objectParams = { Bucket: bucketName, Key: s3Key, Body: body };
      await s3.putObject(objectParams).promise();

      // Store in Redis Cache
      redisClient.setEx(
        redisKey,
        3600, // Cache for an hour (adjust as needed)
        JSON.stringify({  source: "Redis Cache", ...wikiJSON })
      );

      // Serve from Wikipedia
      return res.json({ source: "Wikipedia API", ...wikiJSON });
    } catch (wikiError) {
      return res.status(500).json(wikiError);
    }
  } catch (redisError) {
    // Handle Redis errors
    console.error(redisError);
    res.status(500).json({ error: "Internal Server Error" });
  }
});




app.get("/api/store", (req, res) => {
  const key = req.query.key.trim();

  // Construct the wiki URL and S3 key
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=parse&format=json&section=0&page=${key}`;
  const s3Key = `wikipedia-${key}`;

  // Check S3
  const params = { Bucket: bucketName, Key: s3Key };
  res.json

  s3.getObject(params)
    .promise()
    .then((result) => {
      // Serve from S3
      const resultJSON = JSON.parse(result.Body);
      res.json(resultJSON);
    })
    .catch((err) => {
      if (err.statusCode === 404) {
        // Serve from Wikipedia API and store in S3
        axios
          .get(searchUrl)
          .then((response) => {
            const responseJSON = response.data;
            const body = JSON.stringify({
              source: "S3 Bucket",
              ...responseJSON,
            });

            const objectParams = { Bucket: bucketName, Key: s3Key, Body: body };
            s3.putObject(objectParams)
              .promise()
              .then(() => {
                console.log(
                  `Successfully uploaded data to ${bucketName}/${s3Key}`
                );

                res.json({ source: "Wikipedia API", ...responseJSON });
              });
          })
          .catch((err) => res.json(err));
      } else {
        // Something else went wrong when accessing S3
        res.json(err);
      }
    });
});
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
