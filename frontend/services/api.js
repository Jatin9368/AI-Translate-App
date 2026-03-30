import axios from 'axios';
import { API_BASE_URL } from '../constants/config';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

export const translateText = async (text, sourceLang, targetLang) => {
  const response = await api.post('/translate', { text, sourceLang, targetLang });
  return response.data;
};

export const detectLanguage = async (text) => {
  const response = await api.post('/detect-language', { text });
  return response.data;
};

export const getHistory = async (limit = 50) => {
  const response = await api.get(`/history?limit=${limit}`);
  return response.data;
};

export const clearHistory = async () => {
  const response = await api.delete('/history');
  return response.data;
};
