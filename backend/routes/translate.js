const express = require('express');
const router = express.Router();
const { translate } = require('../services/translateService');
const Translation = require('../models/Translation');

// POST /api/translate
router.post('/translate', async (req, res) => {
  const { text, sourceLang = 'auto', targetLang } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'text is required' });
  }
  if (!targetLang) {
    return res.status(400).json({ error: 'targetLang is required' });
  }

  try {
    const result = await translate(text.trim(), sourceLang, targetLang);

    // Save to DB (non-blocking)
    Translation.create({
      inputText: text.trim(),
      translatedText: result.translatedText,
      sourceLang: result.detectedLang || sourceLang,
      targetLang,
      detectedLang: result.detectedLang
    }).catch(err => console.error('DB save error:', err));

    res.json({
      translatedText: result.translatedText,
      detectedLang: result.detectedLang || sourceLang,
      sourceLang,
      targetLang
    });
  } catch (err) {
    console.error('Translation error:', err.message);
    res.status(500).json({ error: 'Translation failed', message: err.message });
  }
});

module.exports = router;
