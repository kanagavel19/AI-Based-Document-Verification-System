const express = require('express');
const cors = require('cors');
const authRoutes = require('./auth');
const documentRoutes = require('./documents');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api', authRoutes);
app.use('/api/documents', documentRoutes);

app.get('/', (req, res) => {
    res.send('Backend Server is running');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
