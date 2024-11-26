const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors'); // Importer cors
const app = express();
const port = 3000;
const db = require('../config/db'); // Importer la connexion à la base de données
const { info, error, Console } = require('console');
app.use(cors());
// Middleware
app.use(bodyParser.json());
const jwt = require('jsonwebtoken');
const axios = require('axios');

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
// Function to validate email format
function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Basic email validation regex
    return regex.test(email);
}
async function signins(req, res) {
    const { email, password } = req.body;

    // Validez les entrées
    if (!email || !password) {
        return res.status(400).json({ error: 'Tous les champs sont requis.' });
    }

    // Validate email format
    if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Adresse email invalide.' });
    }

    try {
        // Rechercher l'utilisateur par email
        const sql = 'SELECT * FROM users WHERE email = ?';
        const [results] = await db.query(sql, [email]);

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
        await db.query(updateSql, [token, user.id]);

        // Rechercher les informations du patient
        const getSql = 'SELECT * FROM patients WHERE user_id = ?';
        const [patientResults] = await db.query(getSql, [user.id]);

        // Afficher les résultats dans la console
        console.log('Résultats de la requête :', patientResults);

        // Répondre avec les informations de connexion réussie
        res.json({ message: 'Connexion réussie!', email, result: patientResults, token });

    } catch (error) {
        console.error('Erreur lors de la connexion:', error);
        return res.status(500).json({ error: 'Erreur interne du serveur.' });
    }
}
async function signin(req, res) {
    const { email, phone_number, password } = req.body;
  
    // Validez les entrées
    if ((!email && !phone_number) || !password) {
      return res.status(400).json({ error: 'Email ou téléphone et mot de passe sont requis.' });
    }
  
    try {
      // Choisir le champ d'authentification en fonction des entrées
      let field = '';
      let identifier = '';
  
      if (email) {
        field = 'email';
        identifier = email;
      } else if (phone_number) {
        field = 'phone_number';
        identifier = phone_number;
      }
  console.log(email , phone_number);
      // Rechercher l'utilisateur dans la base de données
      const sql = `SELECT * FROM users WHERE ${field} = ?`;
      const [results] = await db.query(sql, [identifier]);
  
      if (results.length === 0) {
        return res.status(401).json({ error: 'Identifiants incorrects.' });
      }
  
      const user = results[0];
  
      // Vérifier le mot de passe
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ error: 'Identifiants incorrects.' });
      }
  
      // Générer un jeton JWT (JSON Web Token)
      const token = jwt.sign({ user_id: user.id }, 'votre_clé_secrète', { expiresIn: '8h' });
  
      // Enregistrer le token dans la base de données
      const updateSql = 'UPDATE users SET api_token = ? WHERE id = ?';
      await db.query(updateSql, [token, user.id]);
  
      // Rechercher les informations du patient
      const getSql = 'SELECT * FROM patients WHERE user_id = ?';
      const [patientResults] = await db.query(getSql, [user.id]);
  
      // Répondre avec les informations de connexion réussie
      res.json({
        message: 'Connexion réussie!',
        identifier,
        result: patientResults,
        token,
      });
  
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      return res.status(500).json({ error: 'Erreur interne du serveur.' });
    }
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
const sendSMScontact = async (req, res) => {
    const { api_key, from, to, message, alphasender } = req.body;
    
    const url = 'https://sms.way-interactive-convergence.com/apis/smscontact/';
    const fields = {
      apikey: api_key,
      from: from,
      to: to,
      message: message,
      alphasender: alphasender,
    };
  
    try {
      const response = await axios.post(url, new URLSearchParams(fields), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      
      res.json(response.data);
    } catch (error) {
      console.error('Error sending SMS:', error);
      res.status(500).json({ error: 'Failed to send SMS' });
    }
  };
// Function to handle patient signup
async function signuppatientsanssms(req, res) {
    const { email, phone, lastname, firstname } = req.body;

    // Validate input
    if (!firstname || !lastname || !email || !phone) {
        return res.status(400).json({ error: 'Tous les champs sont requis.' });
    }

    try {
        const password = generatePassword(); // Ensure this function generates a valid password.
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the user into the `users` table
        const userSql = 'INSERT INTO users (firstname, lastname, email, phone_number, password, created_at) VALUES (?, ?, ?, ?, ?, NOW())';
        const [userResults] = await db.execute(userSql, [firstname, lastname, email, phone, hashedPassword]);

        const userId = userResults.insertId; // ID of the newly inserted user

        // Insert into the `patients` table
        const insertSql = 'INSERT INTO patients (user_id, first_name, last_name, phone_number, created_at) VALUES (?, ?, ?, ?, NOW())';
        const values = [userId, firstname, lastname, phone];
        await db.execute(insertSql, values);

        // Send confirmation email
        sendConfirmationEmail(firstname + lastname, email, password, res, userId);
        //sendSMScontact(INS757364498 ,33743134488,phone ,   <p>Afin d'accéder à votre compte, veuillez trouver votre mot de passe ci-dessous : <strong>${password}</strong></p> )
    } catch (error) {
        console.error('Error during patient signup:', error);
        return res.status(500).json({ error: 'Une erreur est survenue lors de l\'inscription.' });
    }
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
                <p>Si vous n'avez pas demandé cette inscription, ignorez simplement cet e-mail.</p>
                <p>Cordialement,<br>L'équipe de Wic-Doctor.</p>
            </body>
            </html>
        `,
    };
//                <a href="http://localhost:3001/api/login" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Connexion</a>

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

// Function to handle B2B signup
async function signupb2b(req, res) {
    const { name, email, phone, type, specialities, description } = req.body;

    // Validate input
    if (!name || !email || !phone || !type) {
        return res.status(400).json({ error: 'Tous les champs sont requis.' });
    }

    console.log("userId:", email);
    console.log("phone:", phone);
    console.log("name:", name);
    console.log("specialities:", specialities);
    console.log("description:", description);

    // SQL query to insert registration request
    const userSql = 'INSERT INTO DemandesInscription (name, email, phone_number, type, specialities, description) VALUES (?, ?, ?, ?, ?, ?)';

    try {
        // Execute the insert query
        const [userResults] = await db.execute(userSql, [name, email, phone, type, specialities || null, description || null]);

        // If insertion is successful
        return res.status(201).json({ message: 'Demande d\'inscription ajoutée avec succès.', id: userResults.insertId });
    } catch (error) {
        console.error('Error inserting registration request:', error);
        return res.status(500).json({ error: 'Erreur lors de l\'insertion de la demande.' });
    }
}



const logout = async (req, res) => {
    try {
        // Retrieve the token from the authorization header
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        // Check if token is provided
        if (!token) {
            return res.status(401).json({ message: 'Token missing, authorization denied.' });
        }

        // Verify the token
        const decoded = jwt.verify(token, 'votre_clé_secrète'); // S'assurer d'attraper l'erreur
        const userId = decoded.user_id; // Assuming your token contains user_id

        // Nullify or delete the token from the database
        const query = 'UPDATE users SET api_token = NULL WHERE id = ?';
        const [result] = await db.query(query, [userId]);

        // If the user is successfully updated
        if (result.affectedRows > 0) {
            return res.status(200).json({ message: 'Successfully logged out.' });
        } else {
            return res.status(404).json({ message: 'User not found.' });
        }
    } catch (error) {
        // Handle errors
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(403).json({ message: 'Invalid token.' });
        }
        console.error('Failed to logout:', error);
        return res.status(500).json({ error: 'Failed to logout.' });
    }
};



// Function to create a wait time
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function to reset the password
const resetPassword = async (req, res) => {
    const { userId, currentPassword, newPassword } = req.body;

    try {
        // Find the user by ID
        const query = 'SELECT * FROM users WHERE id = ?';
        const [results] = await db.query(query, [userId]);

        if (results.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const user = results[0];

        // Compare the current password with the stored password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Current password is incorrect.' });
        }

        // Hash the new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10); // Use bcrypt to hash the new password

        // Update the user's password in the database
        const updateQuery = 'UPDATE users SET password = ? WHERE id = ?';
        await db.query(updateQuery, [hashedNewPassword, userId]);

        // Wait for 2 seconds before sending the response (adjust the time as needed)
       // await wait(2000); // Wait for 2000 milliseconds (2 seconds)

        return res.status(200).json({ message: 'Password updated successfully.' });
    } catch (error) {
        console.error('Error during password reset:', error);
        return res.status(500).json({ error: 'An error occurred while resetting the password.' });
    }
};


// Update patient profile
// Fonction pour mettre à jour le profil du patient
// Fonction pour mettre à jour le profil du patient
async function updateprofilpatient(req, res) {
    const patientId = req.params.id;
    const {
        first_name,
        last_name,
        phone_number,
        mobile_number,
        age,
        gender,
        weight,
        height,
        medical_history,
        notes,
        email,
        matriculeCNSS,
        dateExpiration,
        assurance,
        groupe_sanguin,
        allergie,
        date_naissance,
        nom_assurrance
    } = req.body;

    try {
        // Vérifier si le patient existe
        const [currentPatient] = await db.execute('SELECT * FROM patients WHERE id = ?', [patientId]);
        if (currentPatient.length === 0) {
            return res.status(404).json({ error: 'Patient non trouvé.' });
        }

        const currentData = currentPatient[0];
        const updates = [];
        const values = [];

        // Préparer les champs à mettre à jour
        const fieldsToUpdate = {
            first_name,
            last_name,
            phone_number,
            mobile_number,
            age,
            gender,
            weight,
            height,
            medical_history,
            notes,
            matriculeCNSS,
            dateExpiration,
            assurance,
            groupe_sanguin,
            allergie,
            date_naissance,
            nom_assurrance,
            email
        };

        for (const [field, value] of Object.entries(fieldsToUpdate)) {
            updates.push(`${field} = ?`);
            values.push(value !== undefined ? value : currentData[field]);
        }
        updates.push(`updated_at = NOW()`);
        values.push(patientId);

        // Requête de mise à jour des patients
        const updatePatientQuery = `UPDATE patients SET ${updates.join(', ')} WHERE id = ?`;

        // Exécuter la mise à jour des patients
        const [patientResult] = await db.execute(updatePatientQuery, values);
        if (patientResult.affectedRows === 0) {
            return res.status(404).json({ error: 'Patient non trouvé.' });
        }

        // Mise à jour des données dans la table users
        const updateUserQuery = `
            UPDATE users
            SET email = ?, phone_number = ?, name = ?, lastname = ?
            WHERE id = (
                SELECT user_id FROM patients WHERE id = ?
            )
        `;
        const userValues = [
            email !== undefined ? email : currentData.email,
            phone_number !== undefined ? phone_number : currentData.phone_number,
            first_name !== undefined ? first_name : currentData.first_name,
            last_name !== undefined ? last_name : currentData.last_name,
            patientId
        ];

        const [userResult] = await db.execute(updateUserQuery, userValues);
        if (userResult.affectedRows === 0) {
            return res.status(404).json({ error: 'Utilisateur non trouvé pour le patient.' });
        }

        // Réponse en cas de succès
        res.json({ message: 'Profil mis à jour avec succès !' });

    } catch (error) {
        console.error('Erreur lors de la mise à jour du profil:', error);
        res.status(500).json({ error: 'Erreur interne du serveur.', details: error.message });
    }
}

// Function to send SMS
const sendSMScontactinscrit = async (phone, message) => {
    const api_key = 'INS757364498'; // Replace with your actual API key
    const from = '33743134488'; // Replace with your sender ID
    const alphasender = 'wic doctor'; // Replace with your alpha sender
  
    const url = 'https://sms.way-interactive-convergence.com/apis/smscontact/';
    const fields = {
      apikey: api_key,
      from: from,
      to: phone,
      message: message,
      alphasender: alphasender,
    };
  
    try {
      const response = await axios.post(url, new URLSearchParams(fields), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw new Error('Failed to send SMS');
    }
  };
  
  // Function to handle patient signup
  const signuppatient = async (req, res) => {
    const { email, phone, lastname, name } = req.body;
  
    // Validate input
    if (!name || !lastname || !email || !phone) {
      return res.status(400).json({ error: 'Tous les champs sont requis.' });
    }
  
    try {
      const password = generatePassword(); // Ensure this function generates a valid password
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Insert the user into the `users` table
      const userSql = 'INSERT INTO users (name, lastname, email, phone_number, password, created_at) VALUES (?, ?, ?, ?, ?, NOW())';
      const [userResults] = await db.execute(userSql, [name, lastname, email, phone, hashedPassword]);
  
      const userId = userResults.insertId; // ID of the newly inserted user
  
      //Insert into the `patients` table
      const insertSql = 'INSERT INTO patients (user_id, first_name, last_name, created_at) VALUES (?, ?, ?, ?, NOW())';
      const values = [userId, name, lastname, phone];
      await db.execute(insertSql, values);
  
      // Prepare the confirmation message
      const message = `Bienvenue ${name}!\n` +
                   `Vous êtes inscrit chez Wic-Doctor.\n` +
                   `Afin d'accéder à votre compte, veuillez trouver votre mot de passe ci-dessous : ${password}\n` +
                   `Veuillez compléter votre fiche, s'il vous plaît.\n` +
            
                   `Si vous n'avez pas demandé cette inscription, ignorez simplement ce message.\n` +
                   `Cordialement,\nL'équipe de Wic-Doctor.`;
    
      // Send confirmation email
      sendConfirmationEmail(`${name} ${lastname}`, email, password, res, userId);
      
      // Send SMS with the same message
     // await sendSMScontactinscrit(phone, message);
  
      // Respond with success
      return res.status(201).json({ message: 'Inscription réussie et confirmation envoyée.' });
  
    } catch (error) {
      console.error('Error during patient signup:', error);
      return res.status(500).json({ error: 'Une erreur est survenue lors de l\'inscription.' });
    }
  }

  const signuppatients = async (req, res) => {
    const { email, phone, lastname, name } = req.body;
  
    // Validate input
    if (!phone ) {
      return res.status(400).json({ error: 'Le numéro de téléphone et le mot de passe sont requis.' });
    }
  
    try {
      const generatedPassword = generatePassword(); // Ensure this function generates a valid password
      const hashedPassword = await bcrypt.hash(generatedPassword, 10);
  
      // Insert the user into the `users` table
      const userSql =
        'INSERT INTO users (name, lastname, email, phone_number, password, created_at) VALUES (?, ?, ?, ?, ?, NOW())';
      const [userResults] = await db.execute(userSql, [name, lastname, email || null, phone, hashedPassword]);
  
      const userId = userResults.insertId; // ID of the newly inserted user
  
      // Insert into the `patients` table
      const insertSql =
        'INSERT INTO patients (user_id, first_name, last_name, phone_number, email, created_at) VALUES (?, ?, ?, ?, ?, NOW())';
      const values = [userId, name, lastname, phone, email || null];
      await db.execute(insertSql, values);
  
      // Prepare the confirmation message
      const message =
        `Bienvenue ${name}!\n` +
        `Vous êtes inscrit chez Wic-Doctor.\n` +
        `Afin d'accéder à votre compte, veuillez trouver votre mot de passe ci-dessous : ${generatedPassword}\n` +
        `Veuillez compléter votre fiche, s'il vous plaît.\n` +
        `Si vous n'avez pas demandé cette inscription, ignorez simplement ce message.\n` +
        `Cordialement,\nL'équipe de Wic-Doctor.`;
  
      // Send confirmation email (if email exists)
      if (email) {
        await sendConfirmationEmail(`${name} ${lastname}`, email, generatedPassword, res, userId);
      }
      if (phone) {
      // Send SMS confirmation
      await sendSMScontactinscrit(phone, message);
      }
      // Return success response
      return res.status(201).json({ message: 'Inscription réussie et confirmation envoyée.' });
    } catch (error) {
        console.error('Error during patient signup:', error);
      
        // Environnement de développement : inclure les détails de l'erreur
        const isDevelopment = process.env.NODE_ENV === 'development'; // Assurez-vous que NODE_ENV est configuré
        const errorMessage = isDevelopment ? error.message : 'Une erreur est survenue lors de l\'inscription.';
      
        return res.status(500).json({ error: errorMessage });
      }
  };
  

 
const ajouterPatient = async (req, res) => {
    try {
      const {
        user_id,
        first_name,
        last_name,
        phone_number,
        mobile_number,
        email,
        age,
        gender,
        weight,
        height,
        medical_history,
        notes,
      } = req.body;
  
      // Vérifier si l'utilisateur existe
      const queryUser = 'SELECT * FROM users WHERE id = ?';
      const [users] = await db.query(queryUser, [user_id]);
  
      if (users.length === 0) {
        return res.status(404).json({ error: 'Utilisateur introuvable.' });
      }
  
      // Ajouter le patient
      const queryPatient = `
        INSERT INTO patients (
          user_id, first_name, last_name, phone_number, mobile_number, age, gender, weight, height,
          medical_history, notes, created_at, updated_at,email
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(),?)
      `;
      const [result] = await db.query(queryPatient, [
        user_id,
        first_name,
        last_name,
        phone_number,
        mobile_number,
        email ,
        age,
        gender,
        weight,
        height,
        medical_history,
        notes,
      ]);
  
      res.status(201).json({ message: 'Patient ajouté avec succès.', patientId: result.insertId });
    } catch (err) {
      console.error('Erreur :', err);
      res.status(500).json({ error: 'Erreur interne du serveur.' });
    }
  }
const obtenirPatientsParUtilisateur = async (req, res) => {
    try {
      const { user_id } = req.params; // Récupérer l'ID utilisateur depuis les paramètres de la requête
  
      // Exécuter la requête SQL
      const query = 'SELECT * FROM patients WHERE user_id = ?';
      const [patients] = await db.query(query, [user_id]);
  
      // Vérifier si des patients existent pour cet utilisateur
      if (patients.length === 0) {
        return res.status(404).json({ message: 'Aucun patient trouvé pour cet utilisateur.' });
      }
  
      // Retourner les résultats
      res.status(200).json({ patients });
    } catch (err) {
      console.error('Erreur lors de la récupération des patients :', err);
      res.status(500).json({ error: 'Erreur interne du serveur.' });
    }
  }
module.exports = {
    signuppatients,signin,signupb2b,updateprofilpatient,logout,resetPassword , ajouterPatient , obtenirPatientsParUtilisateur , signuppatient 
}
  