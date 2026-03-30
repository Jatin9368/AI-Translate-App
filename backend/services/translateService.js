const axios = require('axios');

// ─── MyMemory (FREE — no API key needed) ────────────────────────────────────
async function myMemoryTranslate(text, sourceLang, targetLang) {
  const src = sourceLang === 'auto' ? 'en' : sourceLang;
  const langPair = `${src}|${targetLang}`;
  const response = await axios.get('https://api.mymemory.translated.net/get', {
    params: { q: text, langpair: langPair },
    timeout: 10000,
  });

  const data = response.data;
  if (data.responseStatus !== 200) {
    throw new Error(data.responseMessage || 'MyMemory translation failed');
  }

  return {
    translatedText: data.responseData.translatedText,
    detectedLang: src,
  };
}

// ─── Google Translate API (if key provided) ──────────────────────────────────
async function googleTranslate(text, sourceLang, targetLang) {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey || apiKey === 'your_google_translate_api_key_here') {
    throw new Error('Google Translate API key not configured');
  }

  const response = await axios.post(
    'https://translation.googleapis.com/language/translate/v2',
    {},
    {
      params: {
        q: text,
        source: sourceLang === 'auto' ? undefined : sourceLang,
        target: targetLang,
        key: apiKey,
        format: 'text',
      },
      timeout: 10000,
    }
  );

  const data = response.data.data.translations[0];
  return {
    translatedText: data.translatedText,
    detectedLang: data.detectedSourceLanguage || sourceLang,
  };
}

// ─── LibreTranslate fallback ─────────────────────────────────────────────────
async function libreTranslate(text, sourceLang, targetLang) {
  const baseUrl = process.env.LIBRETRANSLATE_URL || 'https://libretranslate.com';
  const apiKey = process.env.LIBRETRANSLATE_API_KEY;

  const payload = {
    q: text,
    source: sourceLang === 'auto' ? 'auto' : sourceLang,
    target: targetLang,
    format: 'text',
  };
  if (apiKey && apiKey !== 'your_libretranslate_api_key_here') {
    payload.api_key = apiKey;
  }

  const response = await axios.post(`${baseUrl}/translate`, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000,
  });

  return {
    translatedText: response.data.translatedText,
    detectedLang: response.data.detectedLanguage?.language || sourceLang,
  };
}

// ─── Main translate — tries Google first, then MyMemory, then LibreTranslate ─
async function translate(text, sourceLang, targetLang) {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  const hasGoogleKey = apiKey && apiKey !== 'your_google_translate_api_key_here';

  // If Google key exists, try it first
  if (hasGoogleKey) {
    try {
      return await googleTranslate(text, sourceLang, targetLang);
    } catch (err) {
      console.warn('Google Translate failed:', err.message);
    }
  }

  // MyMemory — always try (free, no key)
  try {
    return await myMemoryTranslate(text, sourceLang, targetLang);
  } catch (err) {
    console.warn('MyMemory failed:', err.message);
  }

  // LibreTranslate last resort
  try {
    return await libreTranslate(text, sourceLang, targetLang);
  } catch (err) {
    throw new Error('All translation services failed. Please check your internet connection.');
  }
}

// ─── Language detection ───────────────────────────────────────────────────────
async function detectLanguage(text) {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  const hasGoogleKey = apiKey && apiKey !== 'your_google_translate_api_key_here';

  if (hasGoogleKey) {
    try {
      const response = await axios.post(
        'https://translation.googleapis.com/language/translate/v2/detect',
        {},
        { params: { q: text, key: apiKey }, timeout: 8000 }
      );
      const d = response.data.data.detections[0][0];
      return { language: d.language, confidence: d.confidence };
    } catch (err) {
      console.warn('Google detect failed:', err.message);
    }
  }

  // MyMemory detect — translate to English and check
  try {
    const response = await axios.get('https://api.mymemory.translated.net/get', {
      params: { q: text, langpair: 'auto|en' },
      timeout: 8000,
    });
    const detected = response.data.responseData?.detectedLanguage || 'en';
    return { language: detected, confidence: 0.9 };
  } catch (err) {
    return { language: 'en', confidence: 0.5 };
  }
}

module.exports = { translate, detectLanguage };
