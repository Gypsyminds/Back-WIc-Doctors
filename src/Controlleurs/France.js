
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
app.use(bodyParser.urlencoded({ extended: true }));
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const nodemailer = require('nodemailer');
const crypto = require('crypto');
app.use(express.json());
const { v4: uuidv4 } = require('uuid');
//const moment = require('moment');
const moment = require('moment-timezone');

const cron = require('node-cron');





const specialitespardoctorfrance = async (req, res) => {
    const query = `
      SELECT s.id, s.name, s.icon, COUNT(sd.doctor_id) AS doctor_count
      FROM specialities s
      LEFT JOIN doctor_specialities sd ON s.id = sd.speciality_id
      WHERE pays = 'France'
      GROUP BY s.id, s.name
      ORDER BY doctor_count DESC;
    `;

    try {
        const [results] = await db.query(query);
        res.json(results);
    } catch (err) {
        console.error(err); // Debugging
        return res.status(500).json({ error: 'Erreur lors de la récupération des spécialités.' });
    }
};

const searchDoctorsfrance3lettre = async (req, res) => {
    try {
        const { query, position } = req.query; // Récupération des paramètres de la requête utilisateur

        if (!query || query.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Veuillez fournir une chaîne de recherche.',
            });
        }

        // Gestion des positions (début, fin, ou n'importe où)
        let searchPattern;
        switch (position) {
            case 'start': // Lettre(s) au début
                searchPattern = `${query}%`;
                break;
            case 'end': // Lettre(s) à la fin
                searchPattern = `%${query}`;
                break;
            case 'any': // Lettre(s) n'importe où
            default:
                searchPattern = `%${query}%`;
                break;
        }

        // Requête SQL pour rechercher dans les deux tables avec UNION
        const sql = `
        (
            SELECT 
                JSON_EXTRACT(d.name, '$.fr') AS name, 
                'doctors' AS source,
                d.doctor_photo,
                JSON_ARRAYAGG(JSON_OBJECT('name', s.name)) AS specialities
            FROM 
                doctors d
            LEFT JOIN 
                doctor_specialities ds ON d.id = ds.doctor_id
            LEFT JOIN 
                specialities s ON ds.speciality_id = s.id
            WHERE 
                JSON_EXTRACT(d.name, '$.fr') LIKE ? AND s.pays = 'France'
            GROUP BY 
                d.name, d.doctor_photo
        )
        UNION
        (
            SELECT 
                t.Nom AS name,
                'medecin_accredites_has' AS source,
                NULL AS doctor_photo,
                Spécialité AS specialities
            FROM 
                medecin_accredites_has t
            WHERE 
                t.Nom LIKE ?
        )
        LIMIT 10
        `;

        // Exécution de la requête avec le pattern calculé
        const [results] = await db.query(sql, [searchPattern, searchPattern]);

        // Vérification si des résultats sont trouvés
        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Aucun docteur trouvé avec les lettres fournies.',
            });
        }

        // Retour des résultats combinés
        res.json({
            success: true,
            data: results,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur.',
        });
    }
};
const getDoctorsparvillepaysspecialites = async (req, res) => {
    const speciality_id = req.query.speciality_id; // Nom de la spécialité
    const region = req.query.region; // Ville
    const pays = req.query.pays; // Pays
    const departement = req.query.departement; // Gouvernorat
    const doctor_name = req.query.doctor_name; // Nom du médecin
    const limit = parseInt(req.query.limit) || 10; // Nombre de résultats par page
    const offset = parseInt(req.query.offset) || 0; // Décalage des résultats
    const queryParamsDoctors = [];
    const queryParamsTunisie = [];
    const conditionsDoctors = [];
    const conditionsDocteursTunisie = [];

    // Requête pour la table `doctors`
    let queryDoctors = `
        SELECT  
            d.id AS id_doctor,
            d.name AS name,
            d.doctor_photo,
            d.enable_online_consultation,
            d.description,
            d.horaires,
            d.cabinet_photo,
            d.created_at,
            a.title AS title,
            usr.phone_number,
            addr.Région AS region,
            addr.pays AS pays,     
            addr.Département AS departement,
            addr.address AS adresse_exacte,
            JSON_ARRAYAGG(JSON_OBJECT('id', s.id, 'name', s.name)) AS specialities,
            'conventionné' AS type
        FROM 
            doctors d 
        LEFT JOIN 
            doctor_specialities ds ON d.id = ds.doctor_id 
        LEFT JOIN 
            specialities s ON ds.speciality_id = s.id 
        LEFT JOIN 
            experiences a ON d.id = a.doctor_id 
        LEFT JOIN 
            users usr ON d.user_id = usr.id 
        LEFT JOIN 
            addresses addr ON usr.id = addr.user_id
        WHERE
            addr.pays LIKE '%France%' AND s.pays = 'France'
    `;

    // Conditions pour la table `doctors`
    if (speciality_id) {
        conditionsDoctors.push('s.name LIKE ?');
        queryParamsDoctors.push(`%${speciality_id}%`);
    }

    if (region) {
        conditionsDoctors.push('addr.region LIKE ?');
        queryParamsDoctors.push(`%${region}%`);
    }

    if (pays) {
        conditionsDoctors.push('addr.pays LIKE ?');
        queryParamsDoctors.push(`%${pays}%`);
    }

    if (doctor_name) {
        conditionsDoctors.push('d.name LIKE ?');
        queryParamsDoctors.push(`%${doctor_name}%`);
    }

    if (departement) {
        conditionsDoctors.push('addr.departement LIKE ?');
        queryParamsDoctors.push(`%${departement}%`);
    }

    if (conditionsDoctors.length > 0) {
        queryDoctors += ` AND ${conditionsDoctors.join(' AND ')}`;
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
            addr.Région,
            addr.pays, 
            addr.Département,
            addr.address
        LIMIT ? OFFSET ?
    `;
    queryParamsDoctors.push(limit, offset);

    // Requête pour la table `docteurs_tunisie`
    let queryDocteursTunisie = `
        SELECT 
            NULL AS id_doctor,
            dt.Nom AS name,
            NULL AS doctor_photo,
            NULL AS enable_online_consultation,
            NULL AS description,
            NULL AS horaires,
            NULL AS cabinet_photo,
            NULL AS created_at,
            NULL AS title,
            NULL AS phone_number,
            NULL AS adresse_exacte,
            dt.id_aléatoire AS aleatoire,
            dt.Département AS departement,
            dt.region AS region,
            dt.Spécialité AS specialites,
            dt.Pays AS pays,
            'non-conventionné' AS type
        FROM 
            medecin_accredites_has dt
    `;

    // Conditions pour la table `docteurs_tunisie`
    if (speciality_id) {
        conditionsDocteursTunisie.push('dt.Spécialité LIKE ?');
        queryParamsTunisie.push(`%${speciality_id}%`);
    }

    if (region) {
        conditionsDocteursTunisie.push('dt.region LIKE ?');
        queryParamsTunisie.push(`%${region}%`);
    }

    if (pays) {
        conditionsDocteursTunisie.push('dt.Pays LIKE ?');
        queryParamsTunisie.push(`%${pays}%`);
    }

    if (doctor_name) {
        conditionsDocteursTunisie.push('dt.Nom LIKE ?');
        queryParamsTunisie.push(`%${doctor_name}%`);
    }

    if (departement) {
        conditionsDocteursTunisie.push('dt.Département LIKE ?');
        queryParamsTunisie.push(`%${departement}%`);
    }

    if (conditionsDocteursTunisie.length > 0) {
        queryDocteursTunisie += ` WHERE ${conditionsDocteursTunisie.join(' AND ')}`;
    }

    queryDocteursTunisie += `
        LIMIT ? OFFSET ?
    `;
    queryParamsTunisie.push(limit, offset);

    try {
        // Exécution des requêtes séparées
        const [resultsDoctors] = await db.query(queryDoctors, queryParamsDoctors);
        const [resultsDocteursTunisie] = await db.query(queryDocteursTunisie, queryParamsTunisie);

        // Combinez et filtrez les résultats comme dans votre code original
        let results = [...resultsDoctors, ...resultsDocteursTunisie];

   // Traiter les résultats pour extraire les valeurs pour la clé "fr"
results.forEach(result => {
    // Extraire les valeurs des colonnes contenant des objets JSON
   

    if (result.description && typeof result.description === 'string') {
        try {
            result.description = JSON.parse(result.description).fr || result.description;
        } catch (e) {
            result.description = 'Non défini';
        }
    }

    if (result.region && typeof result.region === 'string') {
        try {
            result.region = JSON.parse(result.region).fr || result.region;
        } catch (e) {
            result.region = 'Non défini';
        }
    }

    if (result.pays && typeof result.pays === 'string') {
        try {
            result.pays = JSON.parse(result.pays).fr || result.pays;
        } catch (e) {
            result.pays = 'Non défini';
        }
    }

    if (result.departement && typeof result.departement === 'string') {
        try {
            result.departement = JSON.parse(result.departement).fr || result.departement;
        } catch (e) {
            result.departement = 'Non défini';
        }
    }

    if (result.adresse_exacte && typeof result.adresse_exacte === 'string') {
        try {
            result.adresse_exacte = JSON.parse(result.adresse_exacte).fr || result.adresse_exacte;
        } catch (e) {
            result.adresse_exacte = 'Non défini';
        }
    }

    // Traiter les spécialités
    if (result.specialities && Array.isArray(result.specialities)) {
        result.specialities.forEach(speciality => {
            if (speciality.name && typeof speciality.name === 'string') {
                try {
                    speciality.name = JSON.parse(speciality.name).fr || speciality.name;
                } catch (e) {
                    speciality.name = 'Non défini';
                }
            }
        });
    }
});
        // Comptage pour les médecins en France
        const countDoctors = `
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
                ${region ? 'AND addr.Région LIKE ?' : ''}
                ${pays ? 'AND addr.pays LIKE ?' : ''}
                ${doctor_name ? 'AND d.name LIKE ?' : ''}
                ${departement ? 'AND addr.Département LIKE ?' : ''}
        `;
        
        // Comptage pour les médecins en Tunisie
        const countDocteursTunisie = `
            SELECT COUNT(*) AS total
            FROM medecin_accredites_has dt 
            WHERE 1=1
                ${speciality_id ? 'AND dt.Spécialité LIKE ?' : ''}
                ${region ? 'AND dt.region LIKE ?' : ''}
                ${pays ? 'AND dt.Pays LIKE ?' : ''} 
                ${doctor_name ? 'AND dt.Nom LIKE ?' : ''}
                ${departement ? 'AND dt.Département LIKE ?' : ''}
        `;
        
        // Comptage total
        const [doctorsCountResult] = await db.query(countDoctors, queryParamsDoctors);
        const [docteursTunisieCountResult] = await db.query(countDocteursTunisie, queryParamsTunisie);

        const totalDoctors = doctorsCountResult[0]?.total || 0;
        const totalDocteursTunisie = docteursTunisieCountResult[0]?.total || 0;

        const total = totalDoctors + totalDocteursTunisie;
        const totalPages = Math.ceil(total / limit);
        const currentPage = Math.floor(offset / limit) + 1;

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
};

module.exports = {
    specialitespardoctorfrance ,searchDoctorsfrance3lettre , getDoctorsparvillepaysspecialites
}