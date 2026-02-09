const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());

// test route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// routes will go here
// app.use('/api/auth', require('./routes/auth'));
// app.use('/api/settings', require('./routes/settings'));
// app.use('/api/daily-pack', require('./routes/dailyPack'));
// app.use('/api/attempts', require('./routes/attempts'));
// app.use('/api/practice', require('./routes/practice'));
// app.use('/api/progress', require('./routes/progress'));
// app.use('/api/behavioral', require('./routes/behavioral'));
// app.use('/api/admin', require('./routes/admin'));

// error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Something went wrong' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
