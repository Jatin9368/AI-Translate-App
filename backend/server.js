require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const translateRoutes = require('./routes/translate');
const detectRoutes = require('./routes/detect');
const historyRoutes = require('./routes/history');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_translate_app')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api', translateRoutes);
app.use('/api', detectRoutes);
app.use('/api', historyRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', message: 'AI Translate API running' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
