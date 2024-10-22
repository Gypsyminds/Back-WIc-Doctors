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
    specialities.name
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

  module.exports = {
    getClinic , getSpecialitiesByClinicId , getdoctosandspeciality,getspecialitesdeclinic
  }