const express = require('express');
const router = express.Router();
const Translation = require('../models/Translation');

// GET /api/history
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const history = await Translation.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history', message: err.message });
  }
});

// DELETE /api/history
router.delete('/history', async (req, res) => {
  try {
    await Translation.deleteMany({});
    res.json({ message: 'History cleared' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear history', message: err.message });
  }
});

module.exports = router;
