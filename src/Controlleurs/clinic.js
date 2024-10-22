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
    GROUP_CONCAT(DISTINCT addresses.description SEPARATOR ', ') AS adresse_descriptions,
    GROUP_CONCAT(DISTINCT addresses.address SEPARATOR ', ') AS adresse_addresses,
    GROUP_CONCAT(DISTINCT addresses.latitude SEPARATOR ', ') AS adresse_latitudes,
    GROUP_CONCAT(DISTINCT addresses.longitude SEPARATOR ', ') AS adresse_longitudes,
    GROUP_CONCAT(DISTINCT addresses.ville SEPARATOR ', ') AS adresse_villes,
    GROUP_CONCAT(DISTINCT addresses.pays SEPARATOR ', ') AS adresse_pays 
    
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


  module.exports = {
    getClinic , getSpecialitiesByClinicId
  };