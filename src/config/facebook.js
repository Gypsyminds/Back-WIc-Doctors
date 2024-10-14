const db = require('../config/db'); 
const express = require('express');
const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const session = require('express-session');
const mysql = require('mysql2');
const app = express();
// Middleware
app.use(session({ secret: 'khouloud', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

// Passport Facebook Strategy
passport.use(new FacebookStrategy({
    clientID: '1247083726303005',
    clientSecret: 'bbc0ecb060057a0c2edd62564b2769dd',
    callbackURL: 'http://localhost:3000/auth/facebook/callback',
    profileFields: ['id', 'displayName', 'email']
}, (accessToken, refreshToken, profile, done) => {
    // Check if user already exists
    db.query('SELECT * FROM users WHERE facebookId = ?', [profile.id], (err, results) => {
        if (err) return done(err);
        
        if (results.length > 0) {
            return done(null, results[0]); // User already exists
        } else {
            // Create a new user
            const newUser = {
                facebookId: profile.id,
                name: profile.displayName,
                email: profile.emails[0].value
            };
            db.query('INSERT INTO users SET ?', newUser, (err, result) => {
                if (err) return done(err);
                newUser.id = result.insertId; // Get the new user's ID
                return done(null, newUser);
            });
        }
    });
}));

// Serialize and deserialize user
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    db.query('SELECT * FROM users WHERE id = ?', [id], (err, results) => {
        if (err) return done(err);
        done(null, results[0]);
    });
});

// Routes
app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }));

app.get('/auth/facebook/callback',
    passport.authenticate('facebook', { failureRedirect: '/' }),
    (req, res) => {
        // Successful authentication
        res.redirect('/profile');
    }
);

app.get('/profile', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/');
    res.send(`Hello, ${req.user.name}`);
});

app.get('/', (req, res) => {
    res.send('<a href="/auth/facebook">Login with Facebook</a>');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});