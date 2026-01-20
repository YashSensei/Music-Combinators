const express = require('express');
const router = express.Router();

// Placeholder routes - will implement in Phase 3
router.post('/', (req, res) => {
  res.json({ message: 'Upload reel - coming soon' });
});

router.get('/feed', (req, res) => {
  res.json({ message: 'Get feed - coming soon' });
});

router.post('/:id/like', (req, res) => {
  res.json({ message: 'Like reel - coming soon' });
});

router.delete('/:id/like', (req, res) => {
  res.json({ message: 'Unlike reel - coming soon' });
});

module.exports = router;
