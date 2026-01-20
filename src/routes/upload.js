const express = require('express');
const router = express.Router();

// Placeholder routes - will implement in Phase 3
router.post('/audio', (req, res) => {
  res.json({ message: 'Upload audio - coming soon' });
});

router.post('/video', (req, res) => {
  res.json({ message: 'Upload video - coming soon' });
});

router.post('/image', (req, res) => {
  res.json({ message: 'Upload image - coming soon' });
});

module.exports = router;
