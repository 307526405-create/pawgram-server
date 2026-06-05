const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Static files for mock upload mode
app.use('/uploads', express.static(path.join(__dirname, '..', 'public', 'upload')));

// Routes
app.use('/api/posts', require('./routes/posts'));
app.use('/api/places', require('./routes/places'));
app.use('/api/discover', require('./routes/discover'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/users', require('./routes/users'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/upload', require('./routes/upload'));

// Catch-all for unmatched routes
app.use((req, res, next) => {
  const err = new Error(`接口不存在: ${req.method} ${req.path}`);
  err.status = 404;
  next(err);
});

// Global error handler — converts all uncaught errors to JSON
app.use((err, req, res, _next) => {
  console.error('[Error]', err.stack || err.message || err);
  res.status(err.status || 500).json({
    code: -1,
    msg: err.message || '服务器内部错误',
  });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`PawGram API: http://localhost:${PORT}`));
