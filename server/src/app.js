const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const analysisRoutes = require('./routes/analysis');

const app = express();
// Required behind Nginx: trust the first hop only (Nginx itself), so
// express-rate-limit reads the real client IP from X-Forwarded-For instead
// of throwing a ValidationError on every rate-limited request.
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/analysis', analysisRoutes);

// Central error handler — never leak stack traces to the client.
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(err);
  res.status(500).json({ success: false, error: 'Unexpected server error.' });
});

module.exports = app;
