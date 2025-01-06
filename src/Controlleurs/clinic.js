const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors'); // Importer cors
const app = express();
const port = 3000;
const db = require('../config/db'); // Importer la connexion à la base de données
app.use(cors());
// Middleware
app.use(bodyParser.json());
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const nodemailer = require('nodemailer');
const crypto = require('crypto');
app.use(express.json());
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');



//
const getClinic = async (req, res) => {
    const query =  `
SELECT 
    MIN(clinics.id) AS clinic_id,  
    clinics.name AS clinic_name,
    clinics.description AS description,
    GROUP_CONCAT(DISTINCT clinics.phone_number SEPARATOR ', ') AS phone_numbers,
    GROUP_CONCAT(DISTINCT clinics.mobile_number SEPARATOR ', ') AS mobile_numbers,
    GROUP_CONCAT(DISTINCT clinics.horaires SEPARATOR ', ') AS horaires,
    GROUP_CONCAT(DISTINCT clinics.clinic_photo SEPARATOR ', ') AS clinic_photos,
    GROUP_CONCAT(DISTINCT clinic_levels.name SEPARATOR ', ') AS level_names,
    JSON_ARRAYAGG(
        JSON_OBJECT(
            'description', addresses.description,
            'address', addresses.address,
            'latitude', addresses.latitude,
            'longitude', addresses.longitude,
            'ville', addresses.ville,
            'pays', addresses.pays
        )
    ) AS addresses
FROM 
    clinics
JOIN 
    clinic_levels ON clinics.clinic_level_id = clinic_levels.id
JOIN 
    addresses ON clinics.address_id = addresses.id
GROUP BY 
    clinics.name, clinics.description  
ORDER BY 
    clinics.name; `
    // Exécuter la requête SQL
    // Exécuter la requête SQL
    const [results] = await db.query(query);
        
    // Retourner les résultats en JSON
    res.status(200).json(results);
}
  // Fonction pour obtenir les spécialités par clinic_id
  const getSpecialitiesByClinicId = async (req, res) => {
    const clinicId = req.params.clinicId; // Récupérer l'ID de la clinique depuis les paramètres de l'URL

    // Vérification si clinicId est fourni
    if (!clinicId) {
        return res.status(400).json({ error: 'Le clinicId est requis.' });
    }

    // Préparation de la requête SQL
    const query = `
        SELECT DISTINCT s.id, s.name, s.icon
        FROM specialities s
        LEFT JOIN clinic_specialities sd ON s.id = sd.speciality_id
        WHERE sd.clinic_id = ?;
    `;

    try {
        // Exécution de la requête et attente des résultats
        const [results] = await db.query(query, [clinicId]);

        // Vérification si des résultats ont été trouvés
        if (results.length === 0) {
            return res.status(404).json({ message: 'Aucune spécialité trouvée pour cette clinique.' });
        }

        // Retourner les résultats
        res.status(200).json(results);
    } catch (err) {
        console.error(err); // Pour le débogage
        return res.status(500).json({ error: 'Erreur lors de la récupération des spécialités.' });
    }
}


// Route pour obtenir les médecins d'une clinique spécifique
const getDoctorsAndSpeciality = async (req, res) => {
    const clinicId = req.params.clinicId;

    const query = `
     SELECT 
     specialities.id AS specialty_id,
     specialities.name AS specialty_name,
     GROUP_CONCAT(DISTINCT doctors.name SEPARATOR ', ') AS doctors_name,
     GROUP_CONCAT(DISTINCT doctors.doctor_photo SEPARATOR ', ') AS doctor_photos
    FROM 
        doctors
    JOIN 
        clinics ON doctors.clinic_id = clinics.id
    JOIN 
        doctor_specialities ON doctors.id = doctor_specialities.doctor_id
    JOIN 
        specialities ON doctor_specialities.speciality_id = specialities.id
    WHERE 
        clinics.id = ?
    GROUP BY 
        specialities.name, specialities.id
    ORDER BY 
        specialities.name;
    `;

    try {
        // Exécution de la requête SQL et attente des résultats
        const [results] = await db.query(query, [clinicId]);

        // Vérification si des résultats ont été trouvés
        if (results.length === 0) {
            return res.status(404).json({ message: 'Aucune spécialité ou médecin trouvé pour cette clinique.' });
        }

        // Retourner les résultats
        res.status(200).json(results);
    } catch (error) {
        console.error(error); // Pour le débogage
        return res.status(500).json({ error: 'Erreur lors de la récupération des médecins et spécialités.' });
    }
}



const getspecialitesdeclinic = async (req, res) => {
    const clinicId = req.params.clinicId;

    const query = `
        SELECT 
            specialities.name AS specialty_name
        FROM 
            specialities
        JOIN 
            clinic_specialities ON specialities.id = clinic_specialities.speciality_id
        WHERE 
            clinic_specialities.clinic_id = ?;
    `;

    try {
        // Exécution de la requête SQL
        const [results] = await db.query(query, [clinicId]);
        
        // Vérification si des résultats ont été trouvés
        if (results.length === 0) {
            return res.status(404).json({ message: 'Aucune spécialité trouvée pour cette clinique.' });
        }

        // Retourner les résultats
        res.status(200).json(results);
    } catch (error) {
        console.error('Erreur lors de la requête SQL :', error);
        return res.status(500).json({ error: 'Erreur de requête SQL' });
    }
};

const getmotifByClinicAndSpecialite = async (req, res) => {
    const clinicId = req.params.clinicId;
    const specialiteId = req.params.specialiteId;

    const query = `
        SELECT nom, id 
        FROM pattern 
        WHERE clinic_id = ? AND specialite_id = ?;
    `;

    try {
        const [results] = await db.query(query, [clinicId, specialiteId]);
        
        if (results.length === 0) {
            return res.status(404).json({ message: 'Aucun motif trouvé pour cette clinique et spécialité.' });
        }

        res.status(200).json(results);
    } catch (error) {
        console.error('Erreur lors de la requête SQL :', error);
        return res.status(500).json({ error: 'Erreur de requête SQL' });
    }
};

// Fonction pour obtenir le nom des médecins en fonction de l'ID de la spécialité, ID de la clinique et ID du pattern
 const getDoctorsBySpecialityAndClinic = async (req, res) => {
    const specialityId = req.params.specialityId;
    const clinicId = req.params.clinicId;
    const patternId = req.params.patternId;

    const query = `
        SELECT 
            doctors.id AS doctor_id,
            doctors.name AS doctor_name,
            doctors.doctor_photo AS doctor_photo 
        FROM 
            doctors
        JOIN 
            pattern ON doctors.id = pattern.doctor_id
        WHERE 
            pattern.specialite_id = ?
            AND pattern.clinic_id = ?
            AND pattern.id = ?;
    `;

    try {
        const [results] = await db.query(query, [specialityId, clinicId, patternId]);
        
        if (results.length === 0) {
            return res.status(404).json({ message: 'Aucun médecin trouvé pour cette spécialité, clinique et motif.' });
        }

        res.status(200).json(results);
    } catch (error) {
        console.error('Erreur lors de la requête SQL :', error);
        return res.status(500).json({ error: 'Erreur de requête SQL' });
    }
};

const jwt = require('jsonwebtoken');

// Remplacez 'votre_clé_secrète' par votre clé secrète utilisée pour signer les tokens
const SECRET_KEY = 'votre_clé_secrète';

function decodeToken(token) {
    try {
        // Vérifier et décoder le token
        const decoded = jwt.verify(token, SECRET_KEY);
        return decoded; // Retourne l'objet décodé contenant les informations du token
    } catch (error) {
        console.error('Erreur lors du décodage du token:', error.message);
        return null; // Retourne null en cas d'erreur
    }
}

function insertAppointmentclinics(req, res) {
    console.log('Request Body:', req.body);
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expiré.' });
            }
            return res.status(401).json({ message: 'Token invalide.' });
        }
    
        // Continue the request with the decoded token
        req.user = decoded;
    });

    if (!token) {
        return res.status(401).json({ message: 'Accès refusé, token manquant' });
    }

    const { appointment_at, ends_at, start_at, doctor_id, clinic_id, doctor, patient, address, motif_id } = req.body;

    if ( !ends_at || !start_at || !doctor_id || !clinic_id || !motif_id ) {
        return res.status(400).json({ error: 'Tous les champs sont requis.' });
    }

    let user_id;
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        user_id = decoded.user_id;
    } catch (error) {
        return res.status(401).json({ error: 'Token invalide ou expiré.' });
    }

    const insertQuery = `
      INSERT INTO appointments (appointment_at, ends_at, start_at, user_id, doctor_id, clinic_id, doctor, patient, address, motif_id, appointment_status_id) 
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)

    `;
    const values = [appointment_at, ends_at, start_at, user_id, doctor_id, clinic_id, doctor, patient, address, motif_id];

    const deleteAvailableHourQuery = `
        DELETE FROM availability_hours_clinic 
        WHERE clinic_id = ? 
        AND start_at = ? 
        AND end_at = ? 
        AND doctor_id = ?
    `;

    const availableHourValues = [clinic_id, start_at, ends_at,doctor_id];

    // Start by deleting available hours
    db.query(deleteAvailableHourQuery, availableHourValues, (deleteError, deleteResults) => {
        if (deleteError) {
            return res.status(500).json({ error: `Erreur lors de la suppression des heures disponibles: ${deleteError.message}` });
        }

        // Now, insert the appointment
        db.query(insertQuery, values, (error, results) => {
            if (error) {
                return res.status(500).json({ error: error.message });
            }

            // Email sending logic
            const querys = `SELECT email FROM users WHERE id = ?;`;
            db.query(querys, [user_id], (err, resul) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Erreur lors de la récupération des disponibilités.' });
                }

                if (resul.length === 0) {
                    return res.status(404).json({ message: 'Aucune disponibilité trouvée pour ce médecin.' });
                }
const qurry =  `SELECT name FROM doctors WHERE id = ?;`;
db.query(qurry, [doctor_id], (err, resuls) => {
    if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur lors de la récupération des disponibilités.' });
    }

    if (resul.length === 0) {
        return res.status(404).json({ message: 'Aucune disponibilité trouvée pour ce médecin.' });
    }
    const qurryy =  `SELECT name FROM clinics WHERE id = ?;`;
db.query(qurryy, [clinic_id], (err, resulss) => {
    if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur lors de la récupération des disponibilités.' });
    }

    if (resul.length === 0) {
        return res.status(404).json({ message: 'Aucune disponibilité trouvée pour ce médecin.' });
    }
    const queryss = `SELECT firstname FROM users WHERE id = ?;`;
            db.query(queryss, [user_id], (err, resull) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Erreur lors de la récupération des disponibilités.' });
                }

                if (resul.length === 0) {
                    return res.status(404).json({ message: 'Aucune disponibilité trouvée pour ce médecin.' });
                }
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    port: 587,
                    secure: false,
                    auth: {
                        user: 'laajili.khouloud12@gmail.com',
                        pass: 'lmvy ldix qtgm gbna', // Use app password for security
                    },
                });
                const startDate = new Date(start_at); // Convert to JavaScript Date object

                // Format to display the day in words and time without seconds
                const formattedStartAt = startDate.toLocaleString('fr-FR', {
                    weekday: 'long',   // Full name of the day (e.g., "lundi")
                    hour: '2-digit',   // Two-digit hour (e.g., "14" for 2 PM)
                    minute: '2-digit', // Two-digit minute
                });
                const mailOptions = {
                    from: 'laajili.khouloud12@gmail.com',
                    to: resul[0].email, // Ensure it's a string, assuming resul is an array of objects
                    subject: 'Confirmation de votre Rendez-vous',
                    html: `
                        <html>
                        <body>
                            <h2 style="color: #4CAF50;">Bienvenue Cher Patient ${resull[0].name}</h2>
                            <p>Votre rendez-vous avec le médecin  ${JSON.parse(resuls[0].name).fr} le ${formattedStartAt} au   ${JSON.parse(resulss[0].name).fr}</p>
                            <p>est bien confirmé</p>   
                            <p>Cordialement,<br>L'équipe de Wic-Doctor.</p>
                        </body>
                        </html>
                    `,
                };

                transporter.sendMail(mailOptions, function (error, info) {
                    if (error) {
                        console.error('Error sending email:', error);
                        return res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'email.' });
                    } else {
                        console.log('Email sent: ' + info.response);
                        return res.status(201).json({ message: 'Rendez-vous inséré avec succès', id: results.insertId });
                    }
                });
            });
        });
    });
});
    });
});
}

function insertAppointmentcliniccopimail(req, res) {
    console.log('Request Body:', req.body);
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expiré.' });
            }
            return res.status(401).json({ message: 'Token invalide.' });
        }
    
        // Continue the request with the decoded token
        req.user = decoded;
    });

    if (!token) {
        return res.status(401).json({ message: 'Accès refusé, token manquant' });
    }

    const { appointment_at, ends_at, start_at, doctor_id, clinic_id, doctor, patient, address, motif_id } = req.body;

    if ( !ends_at || !start_at || !doctor_id || !clinic_id || !motif_id ) {
        return res.status(400).json({ error: 'Tous les champs sont requis.' });
    }

    let user_id;
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        user_id = decoded.user_id;
    } catch (error) {
        return res.status(401).json({ error: 'Token invalide ou expiré.' });
    }

    const insertQuery = `
        INSERT INTO appointments (appointment_at, ends_at, start_at, user_id, doctor_id, clinic_id, doctor, patient, address, motif_id, appointment_status_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `;
    const values = [appointment_at, ends_at, start_at, user_id, doctor_id, clinic_id, doctor, patient, address, motif_id];

    const deleteAvailableHourQuery = `
        DELETE FROM availability_hours_clinic 
        WHERE clinic_id = ? 
        AND start_at = ? 
        AND end_at = ? 
    `;

    const availableHourValues = [clinic_id, start_at, ends_at];

    // Start by deleting available hours
    db.query(deleteAvailableHourQuery, availableHourValues, (deleteError, deleteResults) => {
        if (deleteError) {
            return res.status(500).json({ error: `Erreur lors de la suppression des heures disponibles: ${deleteError.message}` });
        }

        // Now, insert the appointment
        db.query(insertQuery, values, (error, results) => {
            if (error) {
                return res.status(500).json({ error: error.message });
            }

            // Email sending logic
            const querys = `SELECT email FROM users WHERE id = ?;`;
            db.query(querys, [user_id], (err, resul) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Erreur lors de la récupération des disponibilités.' });
                }

                if (resul.length === 0) {
                    return res.status(404).json({ message: 'Aucune disponibilité trouvée pour ce médecin.' });
                }
const qurry =  `SELECT name FROM doctors WHERE id = ?;`;
db.query(qurry, [doctor_id], (err, resuls) => {
    if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur lors de la récupération des disponibilités.' });
    }

    if (resul.length === 0) {
        return res.status(404).json({ message: 'Aucune disponibilité trouvée pour ce médecin.' });
    }
    const qurryy =  `SELECT name FROM clinics WHERE id = ?;`;
db.query(qurryy, [clinic_id], (err, resulss) => {
    if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur lors de la récupération des disponibilités.' });
    }

    if (resul.length === 0) {
        return res.status(404).json({ message: 'Aucune disponibilité trouvée pour ce médecin.' });
    }
    const queryss = `SELECT firstname FROM users WHERE id = ?;`;
            db.query(queryss, [user_id], (err, resull) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Erreur lors de la récupération des disponibilités.' });
                }

                if (resul.length === 0) {
                    return res.status(404).json({ message: 'Aucune disponibilité trouvée pour ce médecin.' });
                }
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    port: 587,
                    secure: false,
                    auth: {
                        user: 'laajili.khouloud12@gmail.com',
                        pass: 'lmvy ldix qtgm gbna', // Use app password for security
                    },
                });
                const startDate = new Date(start_at); // Convert to JavaScript Date object

                // Format to display the day in words and time without seconds
                const formattedStartAt = startDate.toLocaleString('fr-FR', {
                    weekday: 'long',   // Full name of the day (e.g., "lundi")
                    hour: '2-digit',   // Two-digit hour (e.g., "14" for 2 PM)
                    minute: '2-digit', // Two-digit minute
                });
                const mailOptions = {
                    from: 'laajili.khouloud12@gmail.com',
                    to: resul[0].email, // Ensure it's a string, assuming resul is an array of objects
                    subject: 'Confirmation de votre Rendez-vous',
                    html: `
                        <html>
                        <body>
                            <h2 style="color: #4CAF50;">Bienvenue Cher Patient ${resull[0].name}</h2>
                            <p>Votre rendez-vous avec le médecin  ${JSON.parse(resuls[0].name).fr} le ${formattedStartAt} au   ${JSON.parse(resulss[0].name).fr}</p>
                            <p>est bien confirmé</p>   
                            <p>Cordialement,<br>L'équipe de Wic-Doctor.</p>
                        </body>
                        </html>
                    `,
                };

                transporter.sendMail(mailOptions, function (error, info) {
                    if (error) {
                        console.error('Error sending email:', error);
                        return res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'email.' });
                    } else {
                        console.log('Email sent: ' + info.response);
                        return res.status(201).json({ message: 'Rendez-vous inséré avec succès', id: results.insertId });
                    }
                });
            });
        });
    });
});
    });
});
}
const sendSMScontactinscrit = async (phone, message) => {
    const api_key = 'INS757364498'; // Replace with your actual API key
    const from = '33743134585'; // Replace with your sender ID
    const alphasender = 'wic doctor'; // Replace with your alpha sender
  
    const url = 'https://dashboard.wic-sms.com/apis/addcontact/';
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
const insertAppointmentclinic= async (req, res) => {
    console.log('Request Body:', req.body); // Affiche le contenu de req.body
    const authHeader = req.headers['authorization'];

    // Vérifier si le header contient le token
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Accès refusé, token manquant' });
    }

    // Récupérer les paramètres depuis le corps de la requête
    const { appointment_at , ends_at, start_at, doctor_id, clinic, doctor, patient, address, motif_id ,clinic_id} = req.body;

    // Vérification des paramètres requis
    if (!ends_at || !start_at || !token || !doctor_id || !motif_id || !clinic_id) {
        return res.status(400).json({ error: 'Tous les champs sont requis.' });
    }

    // Décoder le token pour récupérer user_id
    let user_id;
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        user_id = decoded.user_id; // Assurez-vous que user_id est dans le token décodé
    } catch (error) {
        return res.status(401).json({ error: 'Token invalide ou expiré.' });
    }
    const emailQuerys = `SELECT name FROM clinics WHERE id = ?;`;
    const [clinicnames] = await db.query(emailQuerys, [clinic_id]);

    // Préparer la requête SQL pour insérer le rendez-vous
    const insertQuery = `
        INSERT INTO appointments (appointment_at, ends_at, start_at, user_id, doctor_id, clinic, doctor, patient, address, motif_id, clinic_id ,appointment_status_id) 
        VALUES ( ?,?, ?, ?, ?, ?, ?, ?, ?, ?,? , 1)
    `;
    
    const values = [appointment_at, ends_at, start_at, user_id, doctor_id, clinicnames[0].name, doctor, patient, address, motif_id ,clinic_id];

       // Supprimer l'heure disponible associée dans la table 'available_hours
const deleteAvailableHourQuery = `
DELETE FROM availability_hours_clinic
WHERE doctor_id = ? 
AND  clinic_id = ? 
AND DATE_FORMAT(start_at, '%Y-%m-%d %H:%i') = DATE_FORMAT(?, '%Y-%m-%d %H:%i') 
AND DATE_FORMAT(end_at, '%Y-%m-%d %H:%i') = DATE_FORMAT(?, '%Y-%m-%d %H:%i')
`;
const availableHourValues = [doctor_id,clinic_id, start_at, ends_at];

try {
// Exécuter la requête pour supprimer les heures disponibles
const [deleteResult] = await db.query(deleteAvailableHourQuery, availableHourValues);
console.log('Heures disponibles supprimées:', deleteResult.affectedRows);
    // Supprimer les heures disponibles


        const [insertResult] = await db.query(insertQuery, values);

        // Logique d'envoi d'e-mail
        const emailQuery = `SELECT email FROM users WHERE id = ?;`;
        const [userEmail] = await db.query(emailQuery, [user_id]);

        if (userEmail.length === 0) {
            return res.status(404).json({ message: 'Aucune disponibilité trouvée pour ce médecin.' });
        }

        const nameQuery = `SELECT firstname FROM users WHERE id = ?;`;
        const [userName] = await db.query(nameQuery, [user_id]);

        const phoneQuery = `SELECT phone_number FROM users WHERE id = ?;`;
        const [userphone] = await db.query(phoneQuery, [user_id]);
        if (userEmail.length === 0) {
            return res.status(404).json({ message: 'Aucune disponibilité trouvée pour ce médecin.' });
        }
        const namedocQuery = `SELECT name FROM doctors WHERE id = ?;`;
        const [docname] = await db.query(namedocQuery, [doctor_id]);

        if (userEmail.length === 0) {
            return res.status(404).json({ message: 'Aucune disponibilité trouvée pour ce médecin.' });
        }
        const nameclinicQuery = `SELECT name FROM clinics WHERE id = ?;`;
        const [clinicname] = await db.query(nameclinicQuery, [clinic_id]);

        if (userEmail.length === 0) {
            return res.status(404).json({ message: 'Aucune disponibilité trouvée pour ce médecin.' });
        }
        const startDate = new Date(start_at);
        const endDate = new Date(ends_at);

       // Fonction pour formater la date
       const formatDate = (date) => {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
        return `le ${date.toLocaleString('fr-FR', options).replace(',', '')}`; // Remplacer la virgule pour obtenir le format désiré
    };
  // Fonction pour formater l'heure
  const formatTime = (date) => {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`; // Formate l'heure et les minutes
};
    const formattedStartAt = formatDate(startDate);
    const formattedStartAt1 = formatTime(endDate);
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            auth: {
                user: 'laajili.khouloud12@gmail.com',
                pass: 'lmvy ldix qtgm gbna', // Utiliser un mot de passe d'application pour plus de sécurité
            },
        });

        const mailOptions = {
            from: 'laajili.khouloud12@gmail.com',
            to: userEmail[0].email,
            subject: 'Confirmation de votre Rendez-vous',
            html: `<html>
                        <body>
                            <h2 style="color: #4CAF50;">Bienvenue Cher Patient ${userName[0].firstname}</h2>
                            <p>Votre rendez-vous avec le médecin  ${JSON.parse(docname[0].name).fr}  ${formattedStartAt} au  ${formattedStartAt1} au ${JSON.parse(clinicname[0].name).fr} est bien confirmé</p>
                            <p></p>   
                            <p>Cordialement,<br>L'équipe de Wic-Doctor.</p>
                        </body>
                        </html>`, // Personnalisez l'e-mail selon vos besoins
        };

      const message = `Bienvenue Cher Patient(e)${userName[0].firstname}\n` +
                   `Votre rendez-vous avec le médecin  ${JSON.parse(docname[0].name).fr}  ${formattedStartAt} au  ${formattedStartAt1} au ${JSON.parse(clinicname[0].name).fr} est bien confirmé` +
                   `Cordialement,\nL'équipe de Wic-Doctor.`;
    
        await transporter.sendMail(mailOptions);
        console.log(userphone[0].phone_number);
        await sendSMScontactinscrit(userphone[0].phone_number,message);
        return res.status(201).json({ message: 'Rendez-vous inséré avec succès', id: insertResult.insertId });
    } catch (error) {
        console.error('Erreur lors de l\'insertion du rendez-vous ou de l\'envoi de l\'e-mail:', error);
        return res.status(500).json({ error: 'Erreur lors de l\'insertion du rendez-vous ou de l\'envoi de l\'e-mail.' });
    }
};



async function insertAppointmentclinics(req, res) {
    console.log('Request Body:', req.body); // Affiche le contenu de req.body
    const authHeader = req.headers['authorization'];

    // Vérifier si le header contient le token
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Accès refusé, token manquant' });
    }

    // Récupérer les paramètres depuis le corps de la requête
    const { appointment_at, ends_at, start_at, doctor_id, clinic, doctor, patient, address, motif_id ,clinic_id} = req.body;

    // Vérification des paramètres requis
    if (!ends_at || !start_at || !token || !doctor_id || !motif_id || !clinic_id ) {
        return res.status(400).json({ error: 'Tous les champs sont requis.' });
    }

    // Décoder le token pour récupérer user_id
    let user_id;
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        user_id = decoded.user_id; // Assurez-vous que user_id est dans le token décodé
    } catch (error) {
        return res.status(401).json({ error: 'Token invalide ou expiré.' });
    }

    // Préparer la requête SQL pour insérer le rendez-vous
    const insertQuery = `
        INSERT INTO appointments (appointment_at, ends_at, start_at, user_id, doctor_id, clinic, doctor, patient, address, motif_id, clinic_id ,appointment_status_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `;
    
    const values = [appointment_at, ends_at, start_at, user_id, doctor_id, clinic, doctor, patient, address, motif_id,clinic_id];

    // Supprimer l'heure disponible associée dans la table 'available_hours'
    const deleteAvailableHourQuery = `
        DELETE FROM availability_hours_clinic 
        WHERE doctor_id = ? 
        AND start_at = ? 
        AND end_at = ?
        AND clinic_id = ?
    `;
    
    const availableHourValues = [doctor_id, start_at, ends_at,clinic_id];

    try {
        // Supprimer les heures disponibles
        await db.query(deleteAvailableHourQuery, availableHourValues);

        // Insérer le rendez-vous
        const [insertResult] = await db.query(insertQuery, values);

        // Logique d'envoi d'e-mail
        const emailQuery = `SELECT email FROM users WHERE id = ?;`;
        const [userEmail] = await db.query(emailQuery, [user_id]);

        if (userEmail.length === 0) {
            return res.status(404).json({ message: 'Aucune disponibilité trouvée pour ce médecin.' });
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            auth: {
                user: 'laajili.khouloud12@gmail.com',
                pass: 'lmvy ldix qtgm gbna', // Utiliser un mot de passe d'application pour plus de sécurité
            },
        });

        const mailOptions = {
            from: 'laajili.khouloud12@gmail.com',
            to: userEmail[0].email,
            subject: 'Confirmation de votre Rendez-vous',
            html: `<p>Votre rendez-vous a été confirmé.</p>`, // Personnalisez l'e-mail selon vos besoins
        };

        await transporter.sendMail(mailOptions);

        return res.status(201).json({ message: 'Rendez-vous inséré avec succès', id: insertResult.insertId });
        await sendSMScontactinscrit(phone, message);

    } catch (error) {
        console.error('Erreur lors de l\'insertion du rendez-vous ou de l\'envoi de l\'e-mail:', error);
        return res.status(500).json({ error: 'Erreur lors de l\'insertion du rendez-vous ou de l\'envoi de l\'e-mail.' });
    }
};

  
const updateAppointments = async (req, res) => {
    const { start_at, end_at } = req.body;

    // Vérification des champs requis
    if (!start_at || !end_at) {
        return res.status(400).send({ message: 'Les champs start_at et end_at sont requis' });
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Accès refusé, token manquant' });
    }

    let user_id;
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        user_id = decoded.user_id;
    } catch (error) {
        return res.status(401).json({ error: 'Token invalide ou expiré.' });
    }

    try {
        const [result] = await db.query('SELECT * FROM appointments WHERE user_id = ? ORDER BY start_at DESC LIMIT 1', [user_id]);

        if (result.length === 0) {
            return res.status(404).send({ message: 'Aucun rendez-vous trouvé pour cet utilisateur' });
        }

        const oldAppointment = result[0]; // Ancien rendez-vous
        console.log(oldAppointment);

        // Insérer l'historique
        await db.query('INSERT INTO availability_hours_clinic (start_at, end_at, clinic_id, doctor_id) VALUES (?, ?, ?, ?)', 
            [oldAppointment.start_at, oldAppointment.ends_at, oldAppointment.clinic_id ,oldAppointment.doctor_id]);

        // Mettre à jour les nouvelles valeurs du rendez-vous
        await db.query('UPDATE appointments SET start_at = ?, ends_at = ? WHERE id = ?', 
            [start_at, end_at, oldAppointment.id]);

        return res.status(200).send({ message: 'Rendez-vous mis à jour avec succès' });
    } catch (err) {
        console.error(err);
        return res.status(500).send({ message: 'Erreur lors de la mise à jour du rendez-vous', error: err });
    }
};
const updateAppointment = async (req, res) => {
    const { appointment_id, start_at, end_at, patern_id } = req.body;
    
 
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: 'Accès refusé, token manquant' });
    }
    
    let user_id;
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        user_id = decoded.user_id;
    } catch (error) {
        return res.status(401).json({ error: 'Token invalide ou expiré.' });
    }
    
    try {
        // Vérifiez si le rendez-vous existe pour cet utilisateur
        const [oldAppointment] = await db.query(
            'SELECT * FROM appointments WHERE id = ? AND user_id = ?', 
            [appointment_id, user_id]
        );
        
        if (oldAppointment.length === 0) {
            return res.status(404).send({ message: 'Rendez-vous non trouvé pour cet utilisateur' });
        }
        
        // Mettre à jour les horaires de disponibilité
        await db.query(
            'INSERT INTO availability_hours_clinic (start_at, end_at, doctor_id, pattern_id , clinic_id) VALUES (?, ?, ?, ?, ?)', 
            [oldAppointment[0].start_at, oldAppointment[0].ends_at, oldAppointment[0].doctor_id, patern_id, oldAppointment[0].clinic_id]
        );
        
        // Mettre à jour le rendez-vous
        await db.query(
            'UPDATE appointments SET start_at = ?, ends_at = ? WHERE id = ?', 
            [start_at, end_at, appointment_id]
        );

        const updatedAppointment = {
            ...oldAppointment[0],
            start_at,
            end_at,
            patern_id
        };
        
        // Informations du médecin
        const [doctorInfo] = await db.query(
            'SELECT d.id AS doctor_id, d.name AS doctor_name, u.email AS doctor_email ,u.phone_number AS doc_number  FROM appointments r JOIN doctors d ON r.doctor_id = d.id JOIN users u ON d.user_id = u.id WHERE r.id = ?', 
            [appointment_id]
        );

        if (doctorInfo.length === 0) {
            return res.status(404).send({ message: 'Informations du médecin introuvables' });
        }
        const [clinicInfo] = await db.query(
            'SELECT name FROM clinics WHERE id = ?', 
            [oldAppointment[0].clinic_id]
        );
        const doctorEmail = doctorInfo[0].doctor_email;
        const doctorName = JSON.parse(doctorInfo[0].doctor_name).fr;
        const clinicname = JSON.parse(clinicInfo[0].name).fr;
        const doctorphone = doctorInfo[0].phone_number;  
            // Informations du patient
        const [patientInfo] = await db.query(
            'SELECT * FROM patients WHERE user_id = ?', 
            [user_id]
        );
        console.log(clinicInfo);
        if (patientInfo.length === 0) {
            return res.status(404).send({ message: 'Informations du patient introuvables' });
        }

        const [patientEmail] = await db.query(
            'SELECT u.email, u.firstname ,u.phone_number FROM appointments rv JOIN users u ON rv.user_id = u.id WHERE rv.user_id = ?;', 
            [user_id]
        );
        
        const patientName = patientInfo[0].first_name;
        const emailpatient = patientEmail[0].email;   
        const namepatient = patientEmail[0].firstname;
        const phone_number = patientEmail[0].phone_number;
        const formattedStartAt = new Date(start_at).toLocaleString('fr-FR', { weekday: 'long', hour: '2-digit', minute: '2-digit' });
        const formattedStartAt1 = new Date(oldAppointment[0].start_at).toLocaleString('fr-FR', { weekday: 'long', hour: '2-digit', minute: '2-digit' });

        // Envoi de l'email au médecin
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            auth: {
                user: 'laajili.khouloud12@gmail.com',
                pass: 'lmvy ldix qtgm gbna',  // Remplacez par un mot de passe d'application
            },
        });

        const mailOptionsDoctor = {
            from: 'laajili.khouloud12@gmail.com',
            to: doctorEmail,
            subject: 'Modification De Rendez-vous',
            html: `
                <html>
                <body>
                    <h2>Bienvenue Cher Docteur ${doctorName}</h2>
                    <p>Votre patient ${patientName} a modifié son rendez-vous de ${formattedStartAt1} à ${formattedStartAt} au ${clinicname}</p>
                    <p>Cordialement,<br>L'équipe de Wic-Doctor.</p>
                </body>
                </html>
            `,
        };

        // Envoi de l'email au patient
        const mailOptionsPatient = {
            from: 'laajili.khouloud12@gmail.com',
            to: emailpatient,
            subject: 'Modification De Rendez-vous',
            html: `
                <html>
                <body>
                    <h2>Bienvenue Cher Patient ${namepatient}</h2>
                    <p>Votre rendez-vous avec le docteur ${doctorName} a été modifié de ${formattedStartAt1} à ${formattedStartAt} au ${clinicname} avec succès.</p>
                    <p>Cordialement,<br>L'équipe de Wic-Doctor.</p>
                </body>
                </html>
            `,
        };

        // Envoi des emails
        await transporter.sendMail(mailOptionsDoctor);
        await transporter.sendMail(mailOptionsPatient);

        const [resultat] = await db.query(
            'SELECT rv.*, u.email, u.firstname, s.status AS statut_nom FROM appointments rv JOIN users u ON rv.user_id = u.id JOIN appointment_statuses s ON rv.appointment_status_id = s.id WHERE rv.user_id = ?;', 
            [user_id]
        );
      // Prepare the confirmation message
const message = `Bienvenue ${patientName}!\n` +
`Votre rendez-vous avec le docteur ${doctorName}  a été modifié de ${formattedStartAt1} à ${formattedStartAt} au ${clinicname} avec succès. ` +
`Si vous n'avez pas demandé cette inscription, ignorez simplement ce message.\n` +
`Cordialement,\nL'équipe de Wic-Doctor.`;

const messagedotor = `Bienvenue Cher Docteur ${doctorName}!\n` +
`Votre patient ${patientName} a modifié son rendez-vous de ${formattedStartAt1} à ${formattedStartAt} au ${clinicname} ` +
`Cordialement,\nL'équipe de Wic-Doctor.`;

// Send confirmation email
//sendConfirmationEmail(doctorName, doctorEmail, password, res, userId);
//sendConfirmationEmail(patientName,emailpatient,)
console.log(patientEmail[0].phone_number);
// Send SMS with the same message
await sendSMScontactinscrit(phone_number, message);
await sendSMScontactinscrit(messagedotor,doctorphone);
        return res.status(200).json({ 
            message: 'Rendez-vous mis à jour avec succès et notification envoyée', 
            appointment: resultat 
        });

    } catch (err) {
        console.error('Erreur lors de la mise à jour du rendez-vous:', err);
        return res.status(500).send({ message: 'Erreur lors de la mise à jour du rendez-vous', error: err });
    }
};
//get availeble date pour doctors
const getTempsClinicssById = async (req, res) => {
    const clinicId = req.query.clinic_id; // Récupérer l'ID de la clinique

    // Vérification si clinicId est fourni
    if (!clinicId) {
        return res.status(400).json({ error: 'Le clinic_id est requis.' });
    }

    // Préparation de la requête SQL
    const query = 'SELECT start_at, end_at FROM availability_hours_clinic WHERE clinic_id = ?;';

    try {
        const [results] = await db.query(query, [clinicId]);

        // Vérification si des résultats ont été trouvés
        if (results.length === 0) {
            return res.status(404).json({ message: 'Aucune disponibilité trouvée pour cette clinique.' });
        }

        // Retourner les résultats
        res.json(results);
    } catch (err) {
        console.error(err); // Pour le débogage
        return res.status(500).json({ error: 'Erreur lors de la récupération des disponibilités.' });
    }
};

const getAvailabilityHours = async (req, res) => {
    const { clinic_id, doctor_id } = req.params;

    const query = `
        SELECT start_at, end_at 
        FROM availability_hours_clinic 
        WHERE clinic_id = ? AND doctor_id = ?;
    `;

    try {
        const [results] = await db.query(query, [clinic_id, doctor_id]);

        // Vérification si des résultats ont été trouvés
        if (results.length === 0) {
            return res.status(404).json({ message: 'Aucune disponibilité trouvée pour cette clinique et ce médecin.' });
        }
console.log(results);
        // Retourner les résultats en JSON
        res.status(200).json(results);
    } catch (err) {
        console.error('Erreur lors de la récupération des heures de disponibilité:', err.stack);
        return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
};

const cancelAppointment = async (req, res) => {
    const appointmentId = req.params.id; // ID du rendez-vous à annuler
    const cancellationTime = new Date(); // Heure actuelle pour l'annulation

    try {
        // Récupérer le rendez-vous à annuler
        const selectQuery = 'SELECT * FROM appointments WHERE id = ?';
        const [selectResult] = await db.query(selectQuery, [appointmentId]);

        if (selectResult.length === 0) {
            return res.status(404).json({ message: "Rendez-vous non trouvé." });
        }

        const appointment = selectResult[0]; // Obtenir le premier rendez-vous
        const doctorId = appointment.doctor_id; // Récupérer l'ID du docteur
        const endAt = appointment.ends_at; // Récupérer la date de fin du rendez-vous
        const patternId = appointment.motif_id; // Récupérer le pattern_id
        const clinicname = appointment.clinic_id;
        // Mettre à jour le statut du rendez-vous en 7
        const updateQuery = 'UPDATE appointments SET appointment_status_id = ? WHERE id = ?';
        await db.query(updateQuery, [7, appointmentId]);

        // Récupérer les informations du patient
        const [patientEmail] = await db.query(
            'SELECT u.email, u.firstname,u.phone_number , rv.ends_at, rv.start_at FROM appointments rv JOIN users u ON rv.user_id = u.id WHERE rv.id = ?;', 
            [appointmentId]
        );

        // Insérer les données dans la table available_hours
        const insertQuery = 'INSERT INTO availability_hours_clinic (start_at, end_at, patern_id, doctor_id , clinic_id) VALUES (?, ?, ?, ?, ?)';
        await db.query(insertQuery, [patientEmail[0].start_at, patientEmail[0].ends_at, patternId, doctorId,appointment.clinic_id ]);

        // Récupérer les informations du médecin
        const [doctorInfo] = await db.query(
            'SELECT d.id AS doctor_id, d.name AS doctor_name, u.email AS doctor_email   FROM appointments r JOIN doctors d ON r.doctor_id = d.id JOIN users u ON d.user_id = u.id WHERE r.id = ?', 
            [appointmentId]
        );

        const doctorEmail = doctorInfo[0].doctor_email;
        const doctorName = JSON.parse(doctorInfo[0].doctor_name).fr;
        const emailpatient = patientEmail[0].email;   
        const namepatient = patientEmail[0].firstname;
        const phonepatient = patientEmail[0].phone_number;
        
        // Formatage des dates
        const formattedStartAt = new Date(patientEmail[0].ends_at).toLocaleString('fr-FR', { weekday: 'long', hour: '2-digit', minute: '2-digit' });
        const formattedStartAt1 = new Date(patientEmail[0].start_at).toLocaleString('fr-FR', { weekday: 'long', hour: '2-digit', minute: '2-digit' });
        
        console.log(formattedStartAt , formattedStartAt1);
        
        // Créer un transporteur pour l'envoi des emails
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            auth: {
                user: 'laajili.khouloud12@gmail.com',
                pass: 'lmvy ldix qtgm gbna',
            },
        });

        // Options d'email pour le patient
        const mailOptionsPatient = {
            from: 'laajili.khouloud12@gmail.com',
            to: emailpatient,
            subject: 'Annulation de Rendez-vous',
            html: `
               <html>
                    <body>
                        <h2>Bienvenue Cher Patient ${namepatient}</h2>
                        <p>Votre rendez-vous avec le docteur ${doctorName} de ${formattedStartAt1} à ${formattedStartAt} au ${clinicname} a été annulé  .</p>
                        <p>Cordialement,<br>L'équipe de Wic-Doctor.</p>
                    </body>
                </html>
            `,
        };

        // Envoi de l'email au patient
        await transporter.sendMail(mailOptionsPatient);
        
        // Options d'email pour le docteur
        const mailOptionsDoctor = {
            from: 'laajili.khouloud12@gmail.com',
            to: doctorEmail,
            subject: 'Annulation de Rendez-vous',
            html: `
                <html>
                    <body>
                        <h2>Bienvenue Cher Docteur ${doctorName}</h2>
                        <p>Votre rendez-vous avec le patient ${namepatient} de ${formattedStartAt1} à ${formattedStartAt}  au ${clinicname}  a été annulé.</p>
                        <p>Cordialement,<br>L'équipe de Wic-Doctor.</p>
                    </body>
                </html>
            `,
        };
        const message = `Bienvenue Cher Patient ${namepatient}
                        Votre rendez-vous avec le docteur ${doctorName} de ${formattedStartAt1} à ${formattedStartAt}   au ${clinicname} a été annulé 
                        Cordialement,L'équipe de Wic-Doctor.`;
        // Envoi de l'email au docteur
        await transporter.sendMail(mailOptionsDoctor);
        console.log(phonepatient);
        await sendSMScontactinscrit(phonepatient,message);
        // Répondre avec succès
        return res.status(200).json({ message: "Rendez-vous annulé avec succès." });
    } catch (error) {
        console.error("Erreur lors de l'annulation du rendez-vous:", error);
        return res.status(500).json({ message: "Erreur du serveur lors de l'annulation du rendez-vous." });
    }
};
const axios = require('axios');



// Fonction pour envoyer un SMS
const sendSMSs = async (req, res) => {
    const { apiKey, from, to, message } = req.body;

    // Validation des paramètres
    if (!apiKey || !from || !to || !message) {
        return res.status(400).json({
            success: false,
            message: 'Tous les champs (apiKey, from, to, message) sont requis.',
        });
    }

    // Construire l'URL avec les paramètres
    const url = `https://dashboard.wic-sms.com/apis/addcontact/?apikey=${encodeURIComponent(apiKey)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&message=${encodeURIComponent(message)}`;

    try {
        // Faire la requête GET vers l'API SMS
        const response = await axios.get(url);

        // Vérifier si la réponse contient une erreur
        if (response.data[0].status && response.data[0].status !== '1') {
            return res.status(400).json({
                success: false,
                message: response.data[0].msg,
            });
        }

        // Envoyer la réponse de l'API au client
        return res.status(200).json({
            success: true,
            data: response.data,
        });
    } catch (error) {
        // Gérer les erreurs
        return res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'envoi du SMS',
            error: error.message,
        });
    }
}




// Fonction pour envoyer un SMS
async function sendSMS(req, res) {
    const { api_key, from, to, message, rotate } = req.body;  // Extraction des paramètres du corps de la requête
    const url = 'https://sms.way-interactive-convergence.com/apis/smsgroup/';
    const data = {
      apikey: api_key,
      from: from,
      to: to,
      message: message,
      rotate: rotate,
    };
  
    try {
      // Envoi de la requête POST
      const response = await axios.post(url, new URLSearchParams(data), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      // Réponse en cas de succès
      res.status(200).json({ success: true, data: response.data });
    } catch (error) {
      console.error('Erreur lors de l\'envoi du SMS:', error);
      // Réponse en cas d'erreur
      res.status(500).json({ success: false, error: error.message });
    }
  }


const sendSMScontact = async (req, res) => {
    const { api_key, from, to, message, alphasender } = req.body;
    
    const url = 'https://dashboard.wic-sms.com/apis/addcontact/';
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
// Function to get the closest clinic
const getplusprocheclinic = async (req, res) => {
    const userLatitude = parseFloat(req.query.latitude);
    const userLongitude = parseFloat(req.query.longitude);

    const query = `
        SELECT 
            clinics.id AS clinic_id,
            clinics.name AS clinic_name,
            clinics.description AS description,
            GROUP_CONCAT(DISTINCT clinics.phone_number SEPARATOR ', ') AS phone_numbers,
            GROUP_CONCAT(DISTINCT clinics.mobile_number SEPARATOR ', ') AS mobile_numbers,
            GROUP_CONCAT(DISTINCT clinics.horaires SEPARATOR ', ') AS horaires,
            GROUP_CONCAT(DISTINCT clinics.clinic_photo SEPARATOR ', ') AS clinic_photos,
            GROUP_CONCAT(DISTINCT clinic_levels.name SEPARATOR ', ') AS level_names,
            JSON_ARRAYAGG(
                JSON_OBJECT(
                    'address_id', addresses.id, 
                    'description', addresses.description,
                    'address', addresses.address,
                    'latitude', addresses.latitude,
                    'longitude', addresses.longitude,
                    'ville', addresses.ville,
                    'pays', addresses.pays
                )
            ) AS addresses
        FROM 
            clinics
        JOIN 
            clinic_levels ON clinics.clinic_level_id = clinic_levels.id
        JOIN 
            addresses ON addresses.id = clinics.address_id
        GROUP BY 
            clinics.id
        ORDER BY 
            clinics.name;
    `;

    try {
        const [results] = await db.query(query);

        // Calculate distance and add it to each clinic
        const clinicsWithDistance = results.map(clinic => {
            const addresses = clinic.addresses; // Already a JSON array, no need to parse

            if (addresses && addresses.length > 0) {
                const clinicAddress = addresses[0]; // Assume first address for distance calculation

                if (clinicAddress.latitude && clinicAddress.longitude) {
                    // Calculate distance only if latitude and longitude exist
                    const distance = haversineDistance(
                        userLatitude, 
                        userLongitude, 
                        clinicAddress.latitude, 
                        clinicAddress.longitude
                    );

                    return {
                        ...clinic,
                        distance: distance
                    };
                }
            }

            // If no valid latitude/longitude, return distance as null
            return {
                ...clinic,
                distance: null
            };
        });

        // Sort clinics by distance
        clinicsWithDistance.sort((a, b) => a.distance - b.distance);

        // Return the closest clinics
        res.json(clinicsWithDistance);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur lors de la récupération des cliniques.' });
    }
};

// Haversine distance calculation function
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
}


const getClinicsBySpecialityCityCountry = async (req, res) => {
    const speciality_id = req.query.speciality_id;  // ID de la spécialité
    const city = req.query.city;                    // Ville
    const country = req.query.country;              // Pays

    // Construction de la requête SQL
    let query = `
        SELECT 
            c.name AS clinic_name,
            GROUP_CONCAT(DISTINCT c.id) AS clinic_ids,
            GROUP_CONCAT(DISTINCT c.description SEPARATOR ', ') AS descriptions,
            GROUP_CONCAT(DISTINCT c.phone_number SEPARATOR ', ') AS phone_numbers,
            GROUP_CONCAT(DISTINCT c.mobile_number SEPARATOR ', ') AS mobile_numbers,
            GROUP_CONCAT(DISTINCT c.horaires SEPARATOR ', ') AS horaires,
            GROUP_CONCAT(DISTINCT c.clinic_photo SEPARATOR ', ') AS clinic_photos,
            GROUP_CONCAT(DISTINCT cl.name SEPARATOR ', ') AS level_names,
              JSON_ARRAYAGG(
        JSON_OBJECT(
            'description', addresses.description,
            'address', addresses.address,
            'latitude', addresses.latitude,
            'longitude', addresses.longitude,
            'ville', addresses.ville,
            'pays', addresses.pays
        )
    ) AS addresses, 
            JSON_ARRAYAGG(JSON_OBJECT(
                'speciality_id', s.id,
                'name', s.name
            )) AS specialities
        FROM 
            clinics c
        LEFT JOIN 
            clinic_specialities cs ON c.id = cs.clinic_id 
        LEFT JOIN 
            specialities s ON cs.speciality_id = s.id 
    JOIN 
    addresses ON c.address_id = addresses.id

        LEFT JOIN 
            clinic_levels cl ON c.clinic_level_id = cl.id 
    `;

    const queryParams = [];
    const conditions = [];

    // Condition pour la spécialité
    if (speciality_id) {
        conditions.push('cs.speciality_id = ?');
        queryParams.push(speciality_id);
    }

    // Condition pour la ville
    if (city) {
        conditions.push('a.ville = ?');
        queryParams.push(city);
    }

    // Condition pour le pays
    if (country) {
        conditions.push('a.pays = ?');
        queryParams.push(country);
    }

    // Ajouter les conditions à la requête si nécessaire
    if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Regroupement des résultats par nom de clinique
    query += `
        GROUP BY 
            c.name 
        ORDER BY 
            c.name ;       
    `;

    try {
        const [results] = await db.query(query, queryParams);

        // Vérification si des résultats ont été trouvés
        if (results.length === 0) {
            return res.status(404).json({ message: 'Aucune clinique trouvée avec ces critères.' });
        }

        res.json(results);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erreur lors de la récupération des cliniques.' });
    }
};


const sendSMS4MinBefore = async (req, res) => {
    const { apiKey, from, userId, to, message } = req.body;

    // Validation des paramètres
    if (!apiKey || !from || !userId || !to || !message) {
        return res.status(400).json({
            success: false,
            message: 'Tous les champs (apiKey, from, userId, to, message) sont requis.',
        });
    }

    try {
        // Rechercher le rendez-vous de l'utilisateur
        const query = `
        SELECT start_at 
        FROM appointments 
        WHERE user_id = ? AND start_at > NOW();
        `;
         db.query(query, userId, async (err, results) => {
            if (err) {
                console.error(err);  // Débogage
                return res.status(500).json({ error: 'Erreur lors de la récupération des cliniques.' });
            }
       // const [results] = await db.execute(query, [userId]);

        console.log('Résultats de la requête SQL:', results);

        // Vérifier s'il y a un rendez-vous futur
        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Aucun rendez-vous futur trouvé pour cet utilisateur.',
            });
        }

        // Parcourir les rendez-vous pour vérifier leur timing
        for (const appointment of results) {
            const startAt = new Date(appointment.start_at);
            const now = new Date();
            const timeDiffMinutes = (startAt - now) / 60000; // Différence en minutes

            console.log(`Rendez-vous prévu le : ${startAt}`);
            console.log(`Temps restant : ${timeDiffMinutes.toFixed(2)} minutes`);

            // Vérifier si le rendez-vous est dans 4 minutes
            if (timeDiffMinutes <= 4 && timeDiffMinutes > 3) {
                const trimmedTo = to.trim();

                console.log(`Envoi d'un SMS à : ${trimmedTo}`);

                // Construire l'URL pour l'envoi de SMS
                const url = `https://dashboard.wic-sms.com/apis/addcontact/?apikey=${encodeURIComponent(apiKey)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(trimmedTo)}&message=${encodeURIComponent(message)}`;
                //const response = await axios.get(url);
                // Faire la requête GET vers l'API SMS
                const response =  await axios.get(url);
                console.log('Réponse de l\'API SMS:', response.data);
                await db.execute(`UPDATE appointments SET notification_sent = true WHERE user_id = ? AND start_at = ?`, [userId, startAt]);

                // Vérifier si la réponse contient une erreur
                if (!Array.isArray(response.data)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Erreur de réponse de l\'API SMS : format inattendu.',
                    });
                }

                if (response.data[0].status && response.data[0].status !== '1') {
                    return res.status(400).json({
                        success: false,
                        message: response.data[0].msg,
                    });
                }

                return res.status(200).json({
                    success: true,
                    message: 'SMS envoyé avec succès.',
                });
            }
        }

        // Si aucun rendez-vous n'est dans 4 minutes, retourner un message
        return res.status(200).json({
            success: false,
            message: 'Le rendez-vous n\'est pas dans 4 minutes ou plus.',
        });
    });
    } catch (error) {
        console.error('Erreur lors de l\'envoi du SMS:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'envoi du SMS',
            error: error.message,
        });
    }
}
      
const getDoctorsparvillepaysspecialites = async (req, res) => {
   // const speciality_id = req.query.speciality_id; // Nom de la spécialité
    const ville = req.query.ville; // Ville
    const pays = req.query.pays; // Pays
    const limit = parseInt(req.query.limit) || 10; // Nombre de résultats par page
    const offset = parseInt(req.query.offset) || 0; // Décalage des résultats
    const queryParams = [];
    const countParams = [];
    const conditionsDoctors = [];
    const conditionsDocteursTunisie = [];

    // Requête pour la table `doctors`
    let queryDoctors = `
        SELECT 
            c.name AS clinic_name,
            GROUP_CONCAT(DISTINCT c.id) AS clinic_ids,
            GROUP_CONCAT(DISTINCT c.description SEPARATOR ', ') AS descriptions,
            GROUP_CONCAT(DISTINCT c.phone_number SEPARATOR ', ') AS phone_numbers,
            GROUP_CONCAT(DISTINCT c.mobile_number SEPARATOR ', ') AS mobile_numbers,
            GROUP_CONCAT(DISTINCT c.horaires SEPARATOR ', ') AS horaires,
            GROUP_CONCAT(DISTINCT c.clinic_photo SEPARATOR ', ') AS clinic_photos,
            GROUP_CONCAT(DISTINCT cl.name SEPARATOR ', ') AS level_names,
              JSON_ARRAYAGG(
        JSON_OBJECT(
            'description', addresses.description,
            'address', addresses.address,
            'latitude', addresses.latitude,
            'longitude', addresses.longitude,
            'ville', addresses.ville,
            'pays', addresses.pays
        )
    ) AS addresses, 
            JSON_ARRAYAGG(JSON_OBJECT(
                'speciality_id', s.id,
                'name', s.name
            )) AS specialities
        FROM 
            clinics c
        LEFT JOIN 
            clinic_specialities cs ON c.id = cs.clinic_id 
        LEFT JOIN 
            specialities s ON cs.speciality_id = s.id 
    JOIN 
    addresses ON c.address_id = addresses.id

        LEFT JOIN 
            clinic_levels cl ON c.clinic_level_id = cl.id 

    `;

   

    if (ville) {
        conditionsDoctors.push('addr.ville LIKE ?');
        queryParams.push(`%${ville}%`);
        countParams.push(`%${ville}%`);
    }

    if (pays) {
        conditionsDoctors.push('addr.pays LIKE ?');
        queryParams.push(`%${pays}%`);
        countParams.push(`%${pays}%`);
    }
   
    if (conditionsDoctors.length > 0) {
        queryDoctors += ` WHERE ${conditionsDoctors.join(' AND ')}`;
    }

    queryDoctors += `
        GROUP BY  
        d.id,
            d.name, 
            d.doctor_photo,
            d.enable_online_consultation,
            d.description,
            d.horaires,
            d.cabinet_photo,
            d.created_at,
            a.title,
            usr.phone_number, 
            addr.ville,
            addr.pays, 
            addr.address
        LIMIT ? OFFSET ?
    `;
    queryParams.push(limit, offset);

    // Requête pour la table `docteurs_tunisie`
    let queryDocteursTunisie = `
        SELECT 
        NULL AS id_doctor ,
            dt.name AS name,
            NULL AS doctor_photo,
            NULL AS enable_online_consultation,
            NULL AS description,
            NULL AS horaires,
            NULL AS cabinet_photo,
            NULL AS created_at,
            NULL AS title,
            dt.Phone AS phone_number,
            dt.adresse AS ville,
            dt.Location AS pays,
            NULL AS adresse_exacte,

            dt.Sector AS specialites ,
            'non-conventionné' AS type
        FROM 
            docteurs_tunisie dt
    `;
  
    if (speciality_id) {
        conditionsDocteursTunisie.push('dt.Sector LIKE ?');
        queryParams.push(`%${speciality_id}%`);
        countParams.push(`%${speciality_id}%`);
    }

    if (ville) {
        conditionsDocteursTunisie.push('dt.Location LIKE ?');
        queryParams.push(`%${ville}%`);
        countParams.push(`%${ville}%`);
    }

    if (pays) {
        conditionsDocteursTunisie.push('dt.Pays LIKE ?');
        queryParams.push(`%${pays}%`);
        countParams.push(`%${pays}%`);
    }

    if (conditionsDocteursTunisie.length > 0) {
        queryDocteursTunisie += ` WHERE ${conditionsDocteursTunisie.join(' AND ')}`;
    }

    queryDocteursTunisie += `
        LIMIT ? OFFSET ?
    `;
    queryParams.push(limit, offset);

    try {
        // Exécution des requêtes séparées
        const [resultsDoctors] = await db.query(queryDoctors, queryParams);
        const [resultsDocteursTunisie] = await db.query(queryDocteursTunisie, queryParams);
        
        // Combiner les résultats
        let results = [...resultsDoctors, ...resultsDocteursTunisie];

        // Filtrer les résultats : ignorer les médecins nommés "demo" sans adresse
        results = results.filter(result => {
            let doctorName = '';
        
            // Si le champ 'name' est une chaîne JSON, essayer de la parser
            try {
                const nameObj = JSON.parse(result.name); // Parse la chaîne JSON
                doctorName = nameObj.fr || ''; // Récupérer le nom en français
            } catch (err) {
                // Si parsing échoue, doctorName reste une chaîne vide
                console.error('Erreur de parsing du nom du médecin:', err);
            }
        
            // Exclure les médecins dont le nom est "Demo Doctor"
            if (doctorName.toLowerCase() === "demo doctor") {
                return false; // Ne pas afficher ce médecin
            }
            if (!result.ville || !result.pays || result.ville.trim() === "" || result.pays.trim() === "") {
                return false; // Ne pas afficher ce médecin si ville ou pays sont invalides
            }
            return true;
        });
        
       
        // Formatage des spécialités en tableau JSON
        results.forEach(result => {
            if (result.specialities) {
                try {
                    if (typeof result.specialities === 'string') {
                        result.specialities = JSON.parse(result.specialities);
                    }
                } catch (err) {
                    console.error('Erreur de parsing JSON pour les spécialités:', err);
                    result.specialities = [];  // Remplace par un tableau vide en cas d'erreur
                }
            }
        });
        
        // Comptage pour la table `doctors`
        let countDoctors = `
        SELECT COUNT(DISTINCT d.id) AS total
        FROM 
            doctors d 
        LEFT JOIN 
            doctor_specialities ds ON d.id = ds.doctor_id 
        LEFT JOIN 
            specialities s ON ds.speciality_id = s.id 
        LEFT JOIN 
            users usr ON d.user_id = usr.id 
        LEFT JOIN 
            addresses addr ON usr.id = addr.user_id
        WHERE 1=1
            ${speciality_id ? 'AND s.name LIKE ?' : ''}
            ${ville ? 'AND addr.ville LIKE ?' : ''}
            ${pays ? 'AND addr.pays LIKE ?' : ''}
        `;
        
        // Comptage pour la table `docteurs_tunisie`
        let countDocteursTunisie = `
        SELECT COUNT(*) AS total
        FROM docteurs_tunisie dt 
        WHERE 1=1
            ${speciality_id ? 'AND dt.Sector LIKE ?' : ''}
            ${ville ? 'AND dt.Location LIKE ?' : ''}
            ${pays ? 'AND dt.Pays LIKE ?' : ''}
        `;
    
        // Exécution des requêtes de comptage
        const [doctorsCountResult] = await db.query(countDoctors, countParams);
        const [docteursTunisieCountResult] = await db.query(countDocteursTunisie, countParams);
    
        // Extraction des totaux
        const totalDoctors = doctorsCountResult[0]?.total || 0;
        const totalDocteursTunisie = docteursTunisieCountResult[0]?.total || 0;
    
        const total = totalDoctors + totalDocteursTunisie;
        const totalPages = Math.ceil(total / limit);
        const currentPage = Math.floor(offset / limit) + 1;
    
        // Retour des résultats avec pagination
        return res.json({
            total,
            totalPages,
            currentPage,
            data: results,
        });
    
    } catch (err) {
        console.error('Erreur lors de la récupération des médecins:', err);
        return res.status(500).json({ error: 'Erreur lors de la récupération des médecins.' });
    }
}
  module.exports = {
    getClinic , getSpecialitiesByClinicId , getDoctorsAndSpeciality,getspecialitesdeclinic,getmotifByClinicAndSpecialite , getDoctorsBySpecialityAndClinic, insertAppointmentclinic ,getTempsClinicssById
    ,updateAppointment , getAvailabilityHours , sendSMS , getplusprocheclinic , getClinicsBySpecialityCityCountry ,sendSMS4MinBefore , sendSMScontact,cancelAppointment
  }