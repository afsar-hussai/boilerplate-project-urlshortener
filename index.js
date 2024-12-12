require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose=require('mongoose');
const {Schema}=mongoose;
const dns = require('dns');
const bodyParser=require('body-parser');
const { URL } = require('url');
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('MongoDB connected'))
.catch((err) => console.log('MongoDB connection error:', err));


const urlSchema = new Schema({
  original_url: { type: String, required: true },
  short_url: { type: Number, required: true, unique: true }
});

const Url = mongoose.model('Url', urlSchema);

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});







app.post('/api/shorturl', (req, res) => {
  const { url } = req.body;

  try {
    // Validate URL format using the URL constructor
    const validUrl = new URL(url);

    // Ensure the protocol is 'http:' or 'https:'
    if (validUrl.protocol !== 'http:' && validUrl.protocol !== 'https:') {
      return res.json({ error: 'invalid url' });
    }

    // Validate the hostname using DNS lookup
    dns.lookup(validUrl.hostname, (err, address) => {
      if (err || !address) {
        return res.json({ error: 'invalid url' });
      }

      // Save URL to database (example using MongoDB)
      Url.findOne({ original_url: url }).then(existingUrl => {
        if (existingUrl) {
          return res.json({
            original_url: existingUrl.original_url,
            short_url: existingUrl.short_url
          });
        }

        // Generate a short URL
        Url.countDocuments({}).then(count => {
          const newShortUrl = count + 1;

          const newUrlEntry = new Url({
            original_url: url,
            short_url: newShortUrl
          });

          newUrlEntry.save().then(() => {
            res.json({
              original_url: newUrlEntry.original_url,
              short_url: newUrlEntry.short_url
            });
          }).catch(err => {
            res.json({ error: 'Database error' });
          });
        });
      });
    });
  } catch (err) {
    // If URL parsing fails, respond with an error
    res.json({ error: 'invalid url' });
  }
});

// Redirect route for short URL
app.get('/api/shorturl/:short_url', (req, res) => {
  const { short_url } = req.params;

  // Find the corresponding original URL from the database
  Url.findOne({ short_url: short_url }).then(urlEntry => {
    if (urlEntry) {
      return res.redirect(urlEntry.original_url); // Redirect to the original URL
    } else {
      return res.json({ error: 'Short URL not found' });
    }
  });
});



app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
