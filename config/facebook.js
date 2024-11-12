const db = require('../config/db'); // Importer la connexion à la base de données


const express = require('express');
const session = require('express-session');
const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const mysql = require('mysql2/promise');

const app = express();
const port = 3000;

// Initialiser la session
app.use(session({ secret: 'koukou', resave: false, saveUninitialized: true }));

// Initialiser Passport
app.use(passport.initialize());
app.use(passport.session());


app.use(session({
    secret: 'koukou',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Mettre à true si tu utilises HTTPS
}));

// Configuration de la stratégie Facebook
passport.use(new FacebookStrategy({
    clientID: '1247083726303005',
    clientSecret: 'bbc0ecb060057a0c2edd62564b2769dd',
    callbackURL: 'http://localhost:3001/auth/facebook/callback',
    profileFields: ['id', 'displayName', 'emails']
  },
  async (accessToken, refreshToken, profile, done) => {
   // const connection = await mysql.createConnection(dbConfig);
    const rows = await db.execute('SELECT * FROM users WHERE facebookId = ?', [profile.id]);
     // Log values for debugging
     const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
     if (!email) {
      return done('Email not provided. Please enter your email address.'); // Pass the error to done
  }
   //  console.log('Facebook ID:', profile.id);
   // console.log('Email:', profile.emails , 
    // );
  //  if (rows.length > 0) {
   //   done(null, rows[0]);
   // } else {
     //   const result = await db.execute('INSERT INTO users (facebookId, name, email) VALUES (?, ?, ?)', [
     //       profile.id,
      //  profile.displayName,
      //  profile.emails || generateTemporaryEmail(profile.displayName), 
      //  ]);
      //  console.log(result); // Log the result to see its structure
     
      //const newUser = { id: result.insertId, facebookId: profile.id, name: profile.displayName, email: profile.emails||  profile.emails || generateTemporaryEmail(profile.displayName)};
      //done('', newUser);
  //  }
  }
));
function generateTemporaryEmail(name) {
  const sanitizedName = name.replace(/\s+/g, '').toLowerCase(); // Remove spaces and convert to lowercase
  return `${sanitizedName}@WICd.com`; // Use your domain here
}

// Sérialiser et désérialiser l'utilisateur
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id) => {
    try {
        const rows = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
        return rows[0];
      } catch (error) {
        console.error('Erreur lors de la désérialisation de l’utilisateur:', error);
        return null; // Ou gérer l'erreur selon votre logique
      }
});


