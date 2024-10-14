const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config()
const db = require('../config/db'); // Importer la connexion à la base de données

passport.use(new GoogleStrategy({
    clientID :process.env.GOOGLE_CLIENT_ID,
    clientSecret :process.env.GOOGLE_CLIENT_SECRET,
    callbackURL :'http://localhost:3000/auth/google/callback',
    passReqToCallback : true,
    scope: ['email', 'profile'] 
},
function (Request, accessToken , refreshToken,profile, done){
  done(null,profile);
  console.log('Client ID:', process.env.GOOGLE_CLIENT_ID);
console.log('Client Secret:', process.env.GOOGLE_CLIENT_SECRET);
const query = 'SELECT * FROM users WHERE google_id = ?';
    
    db.execute(query, [profile.id], (err, results) => {
        if (err) return done(err);
        
        if (results.length > 0) {
            // L'utilisateur existe déjà
            return done(null, results[0]);
        } else {
            // L'utilisateur n'existe pas, on l'insère
            const newUser = {
                googleId: profile.id,
                displayName: profile.displayName,
                email: profile.emails[0].value
            };

            const insertQuery = 'INSERT INTO users (google_id, name, email) VALUES (?, ?, ?)';
            db.execute(insertQuery, [newUser.googleId, newUser.displayName, newUser.email], (err, results) => {
                if (err) return done(err);
                newUser.id = results.insertId; // Récupérer l'ID inséré
                return done(null, newUser);
            });
        }
    });
}
));
passport.serializeUser((user,done)=>{
done(null,user)
});
passport.deserializeUser((user,done)=>{
    done(null,user)
})

