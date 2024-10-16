const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors'); // Importer cors
const app = express();
const port = 3000;
const db = require('../config/db'); // Importer la connexion à la base de données
const { info, error } = require('console');
app.use(cors());
// Middleware
app.use(bodyParser.json());
const jwt = require('jsonwebtoken');

app.use(express.json());
// Configuration du transporteur Nodemailer
const transporters = nodemailer.createTransport({
    service: 'gmail', 
    port: 587,
    secure: false, // Utilisez le service de votre choix
    auth: {
        user: 'laajili.khouloud12@gmail.com', 
         pass: 'Lkoukou2024**', 
    }
});

// Fonction pour générer un mot de passe aléatoire
function generatePassword(length = 10) {
    return crypto.randomBytes(length).toString('hex').slice(0, length);
}

// Fonction d'inscription

async function signups(req, res) {
    const { name, email, phone } = req.body;

    // Validez les entrées
    if (!name || !email || !phone) {
        return res.status(400).json({ error: 'Tous les champs sont requis.' });
    }

    const password = generatePassword(); // Assurez-vous que cette fonction génère un mot de passe valide.
    const hashedPassword = await bcrypt.hash(password, 10); // 10 est le nombre de "salt rounds"

    // Insertion de l'utilisateur dans la table users
    const userSql = 'INSERT INTO users (name, email, phone_number, password,created_at) VALUES (?, ?, ?, ?, now())';
    db.execute(userSql, [name, email, phone, hashedPassword], (err, userResults) => {
        if (err) {
            console.error('Error inserting user:', err);
            return res.status(500).json({ error: 'Database error while inserting user.' });
        }
        const userId = userResults.insertId; // ID de l'utilisateur nouvellement inséré

        // Insertion du patient avec le nom, le téléphone et l'ID de l'utilisateur
        const patientSql = 'INSERT INTO patients (user_id, phone_number, first_name) VALUES (?, ?, ?)';
        db.execute(patientSql, [userId, phone, name], (err, patientResults) => {
            if (err) {
                console.error('Error inserting patient:', err);
                return res.status(500).json({ error: 'Database error while inserting patient.' });
            }

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                port: 587,
                secure: false, 
                auth: {
                    user: 'laajili.khouloud12@gmail.com', 
                    pass: 'lmvy ldix qtgm gbna', // Remplacez ceci par un mot de passe d'application pour plus de sécurité
                },
            });

            transporter.verify((error) => {
                if (error) {
                    console.error('Error with the email connection: ', error);
                } else {
                    console.log('Email connection verified');
                }
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
                        <p>Veuillez compléter votre fiche patient, s'il vous plaît.</p>
                        <a href="http://localhost:3001/api/login" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Connexion</a>
                        <p>Si vous n'avez pas demandé cette inscription, ignorez simplement cet e-mail.</p>
                        <p>Cordialement,<br>L'équipe de Wic-Doctor.</p>
                    </body>
                    </html>
                `,
            };

            transporter.sendMail(mailOptions, function(error, info) {
                if (error) {
                    console.log(error);
                    res.send('Veuillez réessayer !');
                } else {
                    console.log('Email sent: ' + info.response);
                    res.send('Merci de vous être inscrit ! Veuillez confirmer votre e-mail ! Nous avons envoyé un lien !'); 
                }
            });
        });
    });
}
 async function signin (req, res) {
    const { email, password } = req.body;

    // Validez les entrées
    if (!email || !password) {
        return res.status(400).json({ error: 'Tous les champs sont requis.' });
    }

    // Rechercher l'utilisateur par email
    const sql = 'SELECT * FROM users WHERE email = ?';
    db.query(sql, [email], async (err, results) => {
        if (err) {
            console.error('Erreur lors de la recherche de l’utilisateur:', err);
            return res.status(500).json({ error: 'Erreur interne du serveur.' });
        }
        if (results.length === 0) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
        }

        const user = results[0];

        // Vérifier le mot de passe
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
        }

        // Générer un jeton JWT (JSON Web Token)
        const token = jwt.sign({ user_id: user.id }, 'votre_clé_secrète', { expiresIn: '8h' });

         // Enregistrer le token dans la base de données
         const updateSql = 'UPDATE users SET api_token = ? WHERE id = ?';
         db.query(updateSql, [token, user.id], (updateErr) => {
             if (updateErr) {
                 console.error('Erreur lors de la mise à jour du token:', updateErr);
                 return res.status(500).json({ error: 'Erreur interne du serveur.' });
             }
        // Répondre avec le jeton
        res.json({ message: 'Connexion réussie!', token });
        });
})
 
 }
// Fonction d'inscription
async function signupss(req, res) {
    const { name, email, phone, userType } = req.body; // Ajoutez userType

    // Validez les entrées
    if (!name || !email || !phone || !userType) {
        return res.status(400).json({ error: 'Tous les champs sont requis.' });
    }

    const password = generatePassword(); // Assurez-vous que cette fonction génère un mot de passe valide.
    const hashedPassword = await bcrypt.hash(password, 10); // 10 est le nombre de "salt rounds"

    // Insertion de l'utilisateur dans la table users
    const userSql = 'INSERT INTO users (name, email, phone_number, password, created_at) VALUES (?, ?, ?, ?, now())';
    db.execute(userSql, [name, email, phone, hashedPassword], (err, userResults) => {
        if (err) {
            console.error('Error inserting user:', err);
            return res.status(500).json({ error: 'Database error while inserting user.' });
        }
        const userId = userResults.insertId; // ID de l'utilisateur nouvellement inséré

        let insertSql;
        let values;

        // Insertion selon le type d'utilisateur
        if (userType === 'patient') {
            insertSql = 'INSERT INTO patients (user_id, phone_number, first_name) VALUES (?, ?, ?)';
            values = [userId, phone, name];
        } else if (userType === 'doctor') {
            insertSql = 'INSERT INTO doctors (user_id, name) VALUES (?, ?)';
            values = [userId,name];
        } else if (userType === 'clinic') {
            insertSql = 'INSERT INTO clinics (user_id, phone_number, name) VALUES (?, ?, ?)';
            values = [userId, phone, name];
        } 
        else if (userType === 'pharmacie') {
            
            const insertSqls = 'INSERT INTO pharmacies (phone_number, name) VALUES (?, ?)';
            db.execute(insertSqls, [phone, name], (err, usersResults) => {
                if (err) {
                    console.error('Error inserting pharmacy:', err);
                    return res.status(500).json({ error: 'Database error while inserting pharmacy.' });
                }
            })
        
        }
         else {
            return res.status(400).json({ error: 'Type d\'utilisateur non valide.' });
        }

        db.execute(insertSql, values, (err) => {
            if (err) {
                console.error('Error inserting user type:', err);
                return res.status(500).json({ error: 'Database error while inserting user type.' });
            }

             


            const transporter = nodemailer.createTransport({
                service: 'gmail',
                port: 587,
                secure: false, 
                auth: {
                    user: 'laajili.khouloud12@gmail.com', 
                    pass: 'lmvy ldix qtgm gbna', // Remplacez ceci par un mot de passe d'application pour plus de sécurité
                },
            });

            transporter.verify((error) => {
                if (error) {
                    console.error('Error with the email connection: ', error);
                } else {
                    console.log('Email connection verified');
                }
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
    
        });
    });
}
async function signuppatient(req, res) {
    const { name, email, phone } = req.body; // Ajoutez userType

    // Validez les entrées
    if (!name || !email || !phone ) {
        return res.status(400).json({ error: 'Tous les champs sont requis.' });
    }

    const password = generatePassword(); // Assurez-vous que cette fonction génère un mot de passe valide.
    const hashedPassword = await bcrypt.hash(password, 10); // 10 est le nombre de "salt rounds"

    // Insertion de l'utilisateur dans la table users
    const userSql = 'INSERT INTO users (name, email, phone_number, password, created_at) VALUES (?, ?, ?, ?, NOW())';
    
    db.execute(userSql, [name, email, phone, hashedPassword], async (err, userResults) => {
        if (err) {
            console.error('Error inserting user:', err);
            return res.status(500).json({ error: 'Database error while inserting user.' });
        }
        
        const userId = userResults.insertId; // ID de l'utilisateur nouvellement inséré


        // Insert into patients table
        const insertSql = 'INSERT INTO patients (user_id, first_name, phone_number, created_at) VALUES (?, ?, ?,NOW())';
        const values = [userId,name,phone]; // Assuming you just need to store the userId

        db.execute(insertSql, values, (err) => {
            if (err) {
                console.error('Error inserting into patients:', err);
                return res.status(500).json({ error: 'Database error while inserting into patients.' });
            }

            // Send confirmation email
            sendConfirmationEmail(name, email, password, res, userId);
        });
    });
    
    
     
}

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

async function signupb2b(req, res) {
    const { name, email, phone ,type ,specialities ,description} = req.body;

    // Validez les entrées
    if (!name || !email || !phone || !type) {
        return res.status(400).json({ error: 'Tous les champs sont requis.' });
    }

    console.log("userId:", email);
    console.log("phone:", phone);
    console.log("name:", name);

    console.log("specialities:", specialities);
    console.log("descriptio:", description);
    const userSql = 'INSERT INTO DemandesInscription (name, email, phone_number, type, 	specialities, description) VALUES (?, ?, ?, ?, ?, ?)';
    db.execute(userSql, [name, email, phone, type, specialities || null, description || null], (err, userResults) => {
        if (err) {
            console.error('Error inserting registration request:', err);
            return res.status(500).json({ error: 'Erreur lors de l\'insertion de la demande.' });
        }

        // Si l'insertion est réussie
        return res.status(201).json({ message: 'Demande d\'inscription ajoutée avec succès.', id: userResults.insertId });
    });
}
module.exports = {
    signuppatient,signin,signupb2b
}
  