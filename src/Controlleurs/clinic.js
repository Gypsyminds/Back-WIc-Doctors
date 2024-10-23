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



// Fonction pour obtenir les informations des cliniques
const getClinics = (req, res) => {
    const query = `
SELECT 
clinics.id AS clinic_id ,
    clinics.name AS clinic_name,
    GROUP_CONCAT(DISTINCT clinics.description SEPARATOR ', ') AS descriptions,
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
    clinics.name,clinics.id 
ORDER BY 
    clinics.name;

    `;
  
    // Exécuter la requête SQL
    db.query(query, (err, results) => {
      if (err) {
        console.error('Erreur lors de la récupération des cliniques:', err.stack);
        res.status(500).json({ error: 'Erreur interne du serveur' });
        return;
      }
      
      // Retourner les résultats en JSON
      res.status(200).json(results);
    });
  }

  const getClinic = (req, res) => {
    const query = `
SELECT 
    clinics.name AS clinic_name,
    GROUP_CONCAT(DISTINCT clinics.description SEPARATOR ', ') AS descriptions,
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
    clinics.name
ORDER BY 
    clinics.name;
    `;

    // Exécuter la requête SQL
    db.query(query, (err, results) => {
      if (err) {
        console.error('Erreur lors de la récupération des cliniques:', err.stack);
        res.status(500).json({ error: 'Erreur interne du serveur' });
        return;
      }

      // Retourner les résultats en JSON
      res.status(200).json(results);
    });
}

  // Fonction pour obtenir les spécialités par clinic_id
async function getSpecialitiesByClinicId(clinicId) {
    const query = `
        SELECT s.id, s.name, s.icon
        FROM specialities s
        LEFT JOIN clinic_specialities sd ON s.id = sd.speciality_id
        WHERE sd.clinic_id = ?
        GROUP BY s.id, s.name, s.icon;
    `;

    try {
        // Établir la connexion à la base de données
        const connection = await mysql.createConnection(dbConfig);

        // Exécuter la requête
        const [rows] = await connection.execute(query, [clinicId]);

        // Fermer la connexion
        await connection.end();

        return rows;
    } catch (error) {
        console.error('Error fetching specialities:', error);
        throw new Error('Internal server error');
    }
}
// Route pour obtenir les médecins d'une clinique spécifique
//router.get('/doctors/clinic/:clinicId',
 const getdoctosandspeciality = (req, res) => {

    const clinicId = req.params.clinicId;

    const query = `
     SELECT 
     specialities.id AS specialty_id ,
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
    specialities.name , specialities.id
ORDER BY 
    specialities.name;
    `;

    db.query(query, [clinicId], (error, results) => {
        if (error) {
            return res.status(500).json({ error: 'Database query error' });
        }
        res.json(results);
    });
 }
//router.get('/specialities/clinic/:clinicId',
const getspecialitesdeclinic =   (req, res) => {
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

    db.query(query, [clinicId], (error, results) => {
        if (error) {
            return res.status(500).json({ error: 'Database query error' });
        }
        res.json(results);
    });
}
const getmotifByClinicAndSpecialite = (req, res) => {
    const clinicId = req.params.clinicId;         // Récupérer l'ID de la clinique depuis l'URL
    const specialiteId = req.params.specialiteId; // Récupérer l'ID de la spécialité depuis l'URL

    const query = `
        SELECT nom ,id 
        FROM pattern 
        WHERE clinic_id = ? AND specialite_id = ?;
    `;

    // Exécution de la requête SQL
    db.query(query, [clinicId, specialiteId], (error, results) => {
        if (error) {
            console.error('Erreur lors de la requête SQL :', error);
            return res.status(500).json({ error: 'Erreur de requête SQL' });
        }
        // Renvoie des résultats en JSON
        res.json(results);
    });
}
// Fonction pour obtenir le nom des médecins en fonction de l'ID de la spécialité, ID de la clinique et ID du pattern
 const getDoctorsBySpecialityAndClinic = (req, res) => {
    const specialityId = req.params.specialityId; // Récupérer l'ID de la spécialité depuis l'URL
    const clinicId = req.params.clinicId;         // Récupérer l'ID de la clinique depuis l'URL
    const patternId = req.params.patternId;       // Récupérer l'ID du pattern depuis l'URL

    const query = `
     SELECT 
     doctors.id AS doctor_id ,
            doctors.name AS doctor_name ,
            doctors.doctor_photo AS doctoe_photo 
        FROM 
            doctors
        JOIN 
            pattern ON doctors.id = pattern.doctor_id
        WHERE 
            pattern.specialite_id = ?
            AND pattern.clinic_id = ?
            AND pattern.id = ?;
    `;

    // Exécution de la requête SQL
    db.query(query, [specialityId, clinicId, patternId], (error, results) => {
        if (error) {
            console.error('Erreur lors de la requête SQL :', error);
            return res.status(500).json({ error: 'Erreur de requête SQL' });
        }
        // Renvoie des résultats en JSON
        res.json(results);
    });
}
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

function insertAppointmentclinic(req, res) {
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

    if (!appointment_at || !ends_at || !start_at || !doctor_id || !clinic_id ) {
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
    const queryss = `SELECT name FROM users WHERE id = ?;`;
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

const updateAppointment = (req, res) => {
    const { start_at, end_at } = req.body;

    // Vérification des champs requis
    if (!start_at || !end_at) {
        return res.status(400).send({ message: 'Les champs start_at, end_at, new_start_at et new_end_at sont requis' });
    }
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
    let user_id;
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        user_id = decoded.user_id;
      
    } catch (error) {
        return res.status(401).json({ error: 'Token invalide ou expiré.' });
    }
    db.query('SELECT * FROM  appointments WHERE user_id = ? ORDER BY start_at DESC LIMIT 1', 
        [user_id], 
        (err, result) => {
            if (err) {
                return res.status(500).send({ message: 'Erreur lors de la récupération du rendez-vous', error: err });
            }

            if (result.length === 0) {
                return res.status(404).send({ message: 'Aucun rendez-vous trouvé pour cet utilisateur' });
            }

            const oldAppointment = result[0]; // Ancien rendez-vous
            console.log(oldAppointment);
            // Insérer l'historique
            db.query('INSERT INTO availability_hours_clinic (start_at, end_at ,clinic_id) VALUES (?, ?, ?)', 
                [oldAppointment.start_at, oldAppointment.ends_at , oldAppointment.clinic_id], 
                (err, insertResult) => {
                    if (err) {
                        return res.status(500).send({ message: 'Erreur lors de l\'insertion dans history', error: err });
                    }

                    // Mettre à jour les nouvelles valeurs du rendez-vous
                    db.query('UPDATE appointments SET start_at = ?, ends_at = ? WHERE id = ?', 
                        [start_at, end_at, oldAppointment.id], 
                        (err, updateResult) => {
                            if (err) {
                                return res.status(500).send({ message: 'Erreur lors de la mise à jour du rendez-vous', error: err });
                            }

                            return res.status(200).send({ message: 'Rendez-vous mis à jour avec succès' });
                        });
                });

                
});
        }
    
//get availeble date pour doctors
const getTempsClinicssById = (req, res) => {
    const clinicId = req.query.clinic_id; // Récupérer l'ID du médecin

    // Vérification si doctorId est fourni
    if (!clinicId) {
        return res.status(400).json({ error: 'Le doctor_id est requis.' });
    }

    // Préparation de la requête SQL
    let query = `SELECT start_at, end_at FROM  availability_hours_clinic WHERE clinic_id = ?;`;

    // Exécution de la requête
    db.query(query, [clinicId], (err, results) => {
        if (err) {
            console.error(err); // Pour le débogage
            return res.status(500).json({ error: 'Erreur lors de la récupération des disponibilités.' });
        }

        // Vérification si des résultats ont été trouvés
        if (results.length === 0) {
            return res.status(404).json({ message: 'Aucune disponibilité trouvée pour ce médecin.' });
        }

        // Retourner les résultats
        res.json(results);
    });
}
  module.exports = {
    getClinic , getSpecialitiesByClinicId , getdoctosandspeciality,getspecialitesdeclinic,getmotifByClinicAndSpecialite , getDoctorsBySpecialityAndClinic, insertAppointmentclinic ,getTempsClinicssById
    ,updateAppointment
  }