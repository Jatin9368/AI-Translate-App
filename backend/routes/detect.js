const express = require('express');
const router = express.Router();
const { detectLanguage } = require('../services/translateService');

// POST /api/detect-language
router.post('/detect-language', async (req, res) => {
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'text is required' });
  }

  try {
    const result = await detectLanguage(text.trim());
    res.json({ language: result.language, confidence: result.confidence });
  } catch (err) {
    console.error('Detection error:', err.message);
    res.status(500).json({ error: 'Language detection failed', message: err.message });
  }
});

module.exports = router;
