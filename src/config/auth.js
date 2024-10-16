const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config()
const db = require('../config/db'); // Importer la connexion à la base de données
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

passport.use(new GoogleStrategy({
    clientID :process.env.GOOGLE_CLIENT_ID,
    clientSecret :process.env.GOOGLE_CLIENT_SECRET,
    callbackURL :'http://localhost:3001/auth/google/callback',
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
 // Générer un mot de passe (exemple : un mot de passe aléatoire)
 const password = Math.random().toString(36).slice(-8); // Génération d'un mot de passe aléatoire de 8 caractères

 // Hacher le mot de passe
 bcrypt.hash(password, 10, (err, hash) => {
     if (err) return done(err);

     const insertQuery = 'INSERT INTO users (google_id, name, email, password) VALUES (?, ?, ?, ?)';
     db.execute(insertQuery, [newUser.googleId, newUser.displayName, newUser.email, hash], (err, results) => {
         if (err) return done(err);
         newUser.id = results.insertId; // Récupérer l'ID inséré
        // return done(null, newUser);


        // Insert into patients table
        const insertSql = 'INSERT INTO patients (user_id, first_name, created_at) VALUES (?, ?,NOW())';
        const values = [newUser.id,newUser.displayName]; // Assuming you just need to store the userId
   
        db.execute(insertSql, values, (err) => {
            if (err) {
                console.error('Error inserting into patients:', err);
                return res.status(500).json({ error: 'Database error while inserting into patients.' });
            }
     });
     })

     const transporter = nodemailer.createTransport({
        service: 'gmail',
        port: 587,
        secure: false, 
        auth: {
            user: 'laajili.khouloud12@gmail.com', 
            pass: 'lmvy ldix qtgm gbna', // Remplacez ceci par un mot de passe d'application pour plus de sécurité
        },
    });

    const mailOptions = {
        from: 'laajili.khouloud12@gmail.com',
        to: newUser.email,
        subject: 'Confirmation de votre inscription à Wic-Doctor.com',
        html: `
            <html>
            <body>
                <h2 style="color: #4CAF50;">Bienvenue ${newUser.displayName}!</h2>
                <p>Vous êtes inscrit chez Wic-Doctor.</p>
                <p>Afin d'accéder à votre compte, veuillez trouver votre mot de passe ci-dessous : <strong>${password}</strong></p>
                <p>Veuillez compléter votre fiche, s'il vous plaît.</p>
                <a href="http://localhost:3001/api/login" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Connexion</a>
                <p>Si vous n'avez pas demandé cette inscription, ignorez simplement cet e-mail.</p>
                <p>Cordialement,<br>L'équipe de Wic-Doctor.</p>
            </body>
            </html>
        `,
    };

    transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
            console.error('Error sending email:', error);
            return res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'email.' });
        } else {
            console.log('Email sent: ' + info.response);
            // Répondre avec le message et l'ID de l'utilisateur
            return res.status(201).json({ message: 'Merci de vous être inscrit ! Veuillez confirmer votre e-mail ! Nous avons envoyé un lien !', userId });
        }
    }); });
}
});
}
))
passport.serializeUser((user,done)=>{
done(null,user)
});
passport.deserializeUser((user,done)=>{
    done(null,user)
})
function sendConfirmationEmail(name, email, password, res, userId) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        port: 587,
        secure: false, 
        auth: {
            user: 'laajili.khouloud12@gmail.com', 
            pass: 'lmvy ldix qtgm gbna', // Remplacez ceci par un mot de passe d'application pour plus de sécurité
        },
    });

    const mailOptions = {
        from: 'laajili.khouloud12@gmail.com',
        to: email,
        subject: 'Confirmation de votre inscription à Wic-Doctor.com',
        html: `
            <html>
            <body>
                <h2 style="color: #4CAF50;">Bienvenue ${name}!</h2>
                <p>Vous êtes inscrit chez Wic-Doctor.</p>
                <p>Afin d'accéder à votre compte, veuillez trouver votre mot de passe ci-dessous : <strong>${password}</strong></p>
                <p>Veuillez compléter votre fiche, s'il vous plaît.</p>
                <a href="http://localhost:3001/api/login" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Connexion</a>
                <p>Si vous n'avez pas demandé cette inscription, ignorez simplement cet e-mail.</p>
                <p>Cordialement,<br>L'équipe de Wic-Doctor.</p>
            </body>
            </html>
        `,
    };

    transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
            console.error('Error sending email:', error);
            return res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'email.' });
        } else {
            console.log('Email sent: ' + info.response);
            // Répondre avec le message et l'ID de l'utilisateur
            return res.status(201).json({ message: 'Merci de vous être inscrit ! Veuillez confirmer votre e-mail ! Nous avons envoyé un lien !', userId });
        }
    });
}

