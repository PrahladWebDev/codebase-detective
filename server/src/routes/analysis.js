const express = require('express');
const rateLimit = require('express-rate-limit');
const { upload } = require('../middleware/upload');
const controller = require('../controllers/analysisController');

const router = express.Router();

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many uploads from this IP. Please try again later.' },
});

function handleUpload(req, res, next) {
  upload(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, error: err.message });
    controller.uploadProject(req, res).catch(next);
  });
}

router.post('/upload', uploadLimiter, handleUpload);
router.post('/github', uploadLimiter, controller.analyzeGithubRepo);
router.get('/progress/:jobId', controller.streamProgress);
router.get('/:id', controller.getReport);
router.get('/:id/files', controller.getFiles);
router.get('/:id/dependencies', controller.getDependencies);
router.get('/:id/problems', controller.getProblems);
router.get('/:id/metrics', controller.getMetrics);

module.exports = router;
