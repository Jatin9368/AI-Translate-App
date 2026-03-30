const mongoose = require('mongoose');

const translationSchema = new mongoose.Schema({
  inputText: { type: String, required: true },
  translatedText: { type: String, required: true },
  sourceLang: { type: String, required: true },
  targetLang: { type: String, required: true },
  detectedLang: { type: String },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Translation', translationSchema);
