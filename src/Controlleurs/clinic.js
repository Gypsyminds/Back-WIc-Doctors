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
      clinics.description,  
clinics.phone_number ,
clinics.mobile_number ,clinics.	clinic_photo ,
      clinic_levels.commission AS level_commission, 
      clinic_levels.name AS level_name, 
      addresses.description AS adresse_description, 
      addresses.address AS adresse_address,
      addresses.latitude AS adresse_latitude,
      addresses.longitude AS adresse_longitude,
      addresses.ville AS adresse_ville,
      addresses.pays AS adresse_pays,
      availability_hours_clinic.start_at AS start ,
      availability_hours_clinic.end_at AS end 
    FROM clinics
    JOIN clinic_levels ON clinics.clinic_level_id = clinic_levels.id
    JOIN addresses ON clinics.address_id = addresses.id
    JOIN availability_hours_clinic ON availability_hours_clinic.clinic_id;
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
  };
  
  module.exports = {
    getClinic
  };