const db = require('../config/db'); // Importer la connexion à la base de données


const express = require('express');
const session = require('express-session');
const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const mysql = require('mysql2/promise');

const app = express();
const port = 3000;

// Initialiser la session
app.use(session({ secret: 'yourSecretKey', resave: false, saveUninitialized: true }));

// Initialiser Passport
app.use(passport.initialize());
app.use(passport.session());

// Configuration de la stratégie Facebook
passport.use(new FacebookStrategy({
    clientID: '1247083726303005',
    clientSecret: 'bbc0ecb060057a0c2edd62564b2769dd',
    callbackURL: 'http://localhost:3000/auth/facebook/callback',
    profileFields: ['id', 'displayName', 'emails']
  },
  async (accessToken, refreshToken, profile, done) => {
   // const connection = await mysql.createConnection(dbConfig);
    const rows = await db.execute('SELECT * FROM users WHERE facebookId = ?', [profile.id]);
     // Log values for debugging
     console.log('Facebook ID:', profile.id);
     console.log('Email:', profile.emails , 
     );
    if (rows.length > 0) {
      done(null, rows[0]);
    } else {
        const result = await db.execute('INSERT INTO users (facebookId, name, email) VALUES (?, ?, ?)', [
            profile.id,
        profile.displayName,
        profile.emails || '', 
        ]);
        console.log(result); // Log the result to see its structure
     
      const newUser = { id: result.insertId, facebookId: profile.id, name: profile.displayName, email: profile.emails|| null};
      done(null, newUser);
    }
  }
));

// Sérialiser et désérialiser l'utilisateur
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id) => {
 // const db = await mysql.createConnection(dbConfig);
  const rows = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
  return rows[0];
});


