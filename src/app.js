const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
<<<<<<< HEAD
const authRoutes = require('./Router/router');
=======
>>>>>>> 026c608 (first commit)
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
<<<<<<< HEAD
require('./config/auth');
=======
const bcrypt= require('bcryptjs');
const jwt= require('jsonwebtoken');
const nodemailer = require('nodemailer');

const authRoutes= require('./Router/authRoutes');


const db = require('./config/db'); 
>>>>>>> 026c608 (first commit)
// Configuration de CORS et du body parser
app.use(cors());
app.use(bodyParser.json());

// Configuration de la session
app.use(session({
    secret: 'koukou',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Mettre à true si tu utilises HTTPS
}));

// Initialiser Passport
app.use(passport.initialize());
app.use(passport.session());

// Routes d'authentification
app.use('/', authRoutes);

// Routes Google
app.get('/auth/google',
    passport.authenticate('google', { scope: ['email', 'profile'] })
);

app.get('/auth/google/callback',
    passport.authenticate('google', {
        successRedirect: '/auth/protected',
        failureRedirect: '/auth/google/failure'
    })
);

app.get('/auth/protected', isLoggedIn, (req, res) => {
    let name = req.user.displayName;
    console.log("Hi, " + name);
    res.send(`Welcome, ${name}!`);
});

app.get('/auth/google/failure', (req, res) => {
    console.log("Login failed!");
    res.send('Login failed!');
});
<<<<<<< HEAD
=======
app.use('/auth',authRoutes);




>>>>>>> 026c608 (first commit)

// Middleware pour vérifier si l'utilisateur est connecté
function isLoggedIn(req, res, next) {
    req.user ? next() : res.sendStatus(401);
}

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
