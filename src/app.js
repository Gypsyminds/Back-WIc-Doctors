const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const authRoutes= require('./Router/router');
const cors = require('cors');

// Route de base
app.get('/', (req, res) => {
    res.send('Hello, World!');
});


// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});



app.get("/", (req, res) => {
  res.json({ message: "Welcome to wic doctor application." });
});
 app.use('/',authRoutes);

