const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/posts', require('./routes/posts'));
app.use('/api/places', require('./routes/places'));

const PORT = 3000;
app.listen(PORT, () => console.log(`PawGram API: http://localhost:${PORT}`));
