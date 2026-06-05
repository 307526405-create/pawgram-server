const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/posts', require('./routes/posts'));
app.use('/api/places', require('./routes/places'));
app.use('/api/discover', require('./routes/discover'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/users', require('./routes/users'));

const PORT = 3000;
app.listen(PORT, () => console.log(`PawGram API: http://localhost:${PORT}`));
