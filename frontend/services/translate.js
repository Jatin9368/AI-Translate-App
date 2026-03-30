import axios from 'axios';

const TIMEOUT = 20000;

// ── Google Translate — Method 1 (gtx client) ─────────────────────────────────
async function googleGTX(text, sourceLang, targetLang) {
  const src = sourceLang === 'auto' ? 'auto' : sourceLang;
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${src}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

  const res = await axios.get(url, {
    timeout: TIMEOUT,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json, text/plain, */*',
    },
  });

  const data = res.data;
  if (!Array.isArray(data) || !data[0]) throw new Error('Bad response');

  let result = '';
  for (const part of data[0]) {
    if (part && part[0]) result += part[0];
  }
  if (!result.trim()) throw new Error('Empty result');

  return {
    translatedText: result.trim(),
    detectedLang: data[2] || src,
  };
}

// ── Google Translate — Method 2 (apps client) ────────────────────────────────
async function googleApps(text, sourceLang, targetLang) {
  const src = sourceLang === 'auto' ? 'auto' : sourceLang;
  const url = `https://translate.googleapis.com/translate_a/single`;

  const res = await axios.get(url, {
    params: {
      client: 'at',
      sl: src,
      tl: targetLang,
      dt: 't',
      q: text,
    },
    timeout: TIMEOUT,
    headers: {
      'User-Agent': 'AndroidTranslate/5.3.0.RC02.130475354-53000263 5.1 phone TRANSLATE',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  const data = res.data;
  if (!Array.isArray(data) || !data[0]) throw new Error('Bad response');

  let result = '';
  for (const part of data[0]) {
    if (part && part[0]) result += part[0];
  }
  if (!result.trim()) throw new Error('Empty result');

  return {
    translatedText: result.trim(),
    detectedLang: data[2] || src,
  };
}

// ── MyMemory fallback ─────────────────────────────────────────────────────────
async function myMemory(text, sourceLang, targetLang) {
  const src = sourceLang === 'auto' ? 'en' : sourceLang;
  const res = await axios.get('https://api.mymemory.translated.net/get', {
    params: {
      q: text,
      langpair: `${src}|${targetLang}`,
      de: 'user@example.com', // increases daily limit
    },
    timeout: TIMEOUT,
  });

  if (!res.data || res.data.responseStatus !== 200) {
    throw new Error(res.data?.responseMessage || 'MyMemory failed');
  }

  const translated = res.data.responseData.translatedText;
  if (!translated || translated.toUpperCase() === text.toUpperCase()) {
    throw new Error('No meaningful translation');
  }

  return { translatedText: translated, detectedLang: src };
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function translateDirect(text, sourceLang, targetLang) {
  const errors = [];

  try {
    return await googleGTX(text, sourceLang, targetLang);
  } catch (e) {
    errors.push(`Google(gtx): ${e.message}`);
  }

  try {
    return await googleApps(text, sourceLang, targetLang);
  } catch (e) {
    errors.push(`Google(apps): ${e.message}`);
  }

  try {
    return await myMemory(text, sourceLang, targetLang);
  } catch (e) {
    errors.push(`MyMemory: ${e.message}`);
  }

  throw new Error(
    `Translation failed. Please check your internet.\n\n${errors.join('\n')}`
  );
}

// ── Detect language ───────────────────────────────────────────────────────────
export async function detectDirect(text) {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`;
    const res = await axios.get(url, {
      timeout: TIMEOUT,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const detected = res.data?.[2] || 'en';
    return { language: detected, confidence: 0.95 };
  } catch {
    return { language: 'en', confidence: 0.5 };
  }
}
