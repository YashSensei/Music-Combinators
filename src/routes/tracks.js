const express = require('express');
const router = express.Router();

// Placeholder routes - will implement in Phase 3
router.post('/', (req, res) => {
  res.json({ message: 'Upload track - coming soon' });
});

router.get('/', (req, res) => {
  res.json({ message: 'List tracks - coming soon' });
});

router.get('/search', (req, res) => {
  res.json({ message: 'Search tracks - coming soon' });
});

router.post('/:id/like', (req, res) => {
  res.json({ message: 'Like track - coming soon' });
});

router.delete('/:id/like', (req, res) => {
  res.json({ message: 'Unlike track - coming soon' });
});

module.exports = router;
