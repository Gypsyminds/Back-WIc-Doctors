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



// Lire les horaires de chaque  docteur par ID doctor
app.get('/availability/:doctorId', (req, res) => {
    const doctorId = req.params.doctorId;

    const query = `
        SELECT day, start_at, end_at 
        FROM availability_hours 
        WHERE doctor_id = ?`;

    db.query(query, [doctorId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error retrieving availability hours.' });
        }
        res.json(results);
    });
});
// Lire les détails d'un médecin et de l'utilisateur associé par user_id
app.get('/doctors/user/:userId', (req, res) => {
    const userId = req.params.userId;

    const sql = `
        SELECT doctors.id AS doctor_id, doctors.name AS doctor_name, doctors.description, 
               user.id AS user_id, user.name, user.email
        FROM doctors
        JOIN user ON doctors.user_id = user.id
        WHERE doctors.user_id = ? 
       
    `;

    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Server error');
        }
        
        if (results.length === 0) {
            return res.status(404).send('No doctor found for this user ID');
        }

        res.send(results[0]); // On renvoie uniquement le premier résultat
    });
});
//Liste Des Doctors Aléatoirement
app.get('/doctorsliste', (req, res) => {
    const userIds = req.query.user_ids; // Les IDs sont passés en tant que paramètre de requête
    if (!userIds) {
        return res.status(400).json({ error: 'User IDs are required.' });
    }
    const userIdArray = userIds.split(',').map(id => db.escape(id)).join(',');

    const sql = `SELECT * ,  user.id AS user_id, user.name, user.email FROM doctors JOIN user ON doctors.user_id = user.id WHERE user_id IN (${userIdArray})    ORDER BY RAND()`;
    
    db.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
});

//Chercher La Lite Des Doctors Par Adresse (en ajoutant attribt vadresse au tabla docotors)
app.get('/doctorsadresse', (req, res) => {
    const addresse = req.query.addresse;

    if (!addresse) {
        return res.status(400).json({ error: 'L\'adresse est requise.' });
    }

    const query = 'SELECT * FROM doctors WHERE adresse LIKE ?';
    db.query(query, [`%${addresse}%`], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erreur lors de la récupération des médecins.' });
        }
        res.json(results);
    });
});


//Chercher La Lite Des Doctors Par Adresse Passant Par Table Adressses
app.get('/usersadress', (req, res) => {
    const address = req.query.address;

    if (!address) {
        return res.status(400).json({ error: 'L\'adresse est requise.' });
    }

    const query = `
        SELECT u.*
        FROM users u
        JOIN doctors d ON u.id = d.user_id
        JOIN addresses a ON u.id = a.user_id
        WHERE a.address = ?
    `;

    db.query(query, [address], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs.' });
        }
        res.json(results);
    });
});
//recherche user par adresse
app.get('/users', (req, res) => {
    const address = req.query.address;

    if (!address) {
        return res.status(400).json({ error: 'L\'adresse est requise.' });
    }

    const query = `
        SELECT u.*
        FROM users u
        JOIN doctors d ON u.id = d.user_id
        JOIN addresses a ON u.id = a.user_id
        WHERE a.address = ?
    `;

    db.query(query, [address], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs.' });
        }
        res.json(results);
    });
});
//get doctor par specialité
app.get('/doctorspecialities', (req, res) => {
    const speciality_id = req.query.speciality_id;

    if (!speciality_id) {
        return res.status(400).json({ error: 'L\'ID de spécialité est requis.' });
    }

    const query = `
        SELECT u.*
        FROM users u
        JOIN doctors d ON u.id = d.user_id
        JOIN doctor_specialities ds ON d.id = ds.doctor_id
        WHERE ds.speciality_id= ?
    `;

    db.query(query, [speciality_id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs.' });
        }
        res.json(results);
    });
});

//Chercher La Lite Des Doctors Par Adresse Passant Par Table Adressses et specialité
app.get('/doctorsadd', (req, res) => {
    const speciality_id = req.query.speciality_id;
    const address = req.query.address;

    // Vérifier si au moins l'un des paramètres est fourni
    if (!speciality_id && !address) {
        return res.status(400).json({ error: 'L\'ID de spécialité ou l\'adresse est requis.' });
    }

    let query = `
        SELECT u.*
        FROM users u
        JOIN doctors d ON u.id = d.user_id
    `;
    
    const queryParams = [];

    // Ajout de la jointure pour les spécialités
    if (speciality_id) {
        query += `
            JOIN doctor_specialities ds ON d.id = ds.doctor_id
        `;
    }

    // Ajout de la jointure pour les adresses
    if (address) {
        query += `
            JOIN addresses a ON u.id = a.user_id
        `;
    }

    // Conditions pour la requête
    const conditions = [];
    if (speciality_id) {
        conditions.push('ds.speciality_id = ?');
        queryParams.push(speciality_id);
    }
    if (address) {
        conditions.push('a.address = ?');
        queryParams.push(address);
    }

    // Ajouter les conditions à la requête
    if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
    }

    db.query(query, queryParams, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs.' });
        }
        res.json(results);
    });
});

//disponibilité de doctor
app.get('/doctor-availability', (req, res) => {
    const query = `
       SELECT d.name, hd.start_at, hd.end_at , day
        FROM doctors d
        JOIN availability_hours hd ON d.id = hd.doctor_id;
    `;

    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erreur lors de la récupération des disponibilités.' });
        }
        res.json(results);
    });
});

//fusion de fontion recherche par adresse , specialité et afficher disponibilité de doctor 
app.get('/doctorsdispo', (req, res) => {
    const speciality_id = req.query.speciality_id;
    const address = req.query.address;

    // Vérifier si au moins l'un des paramètres est fourni
    if (!speciality_id && !address) {
        return res.status(400).json({ error: 'L\'ID de spécialité ou l\'adresse est requis.' });
    }

    let query = `
        SELECT d.name, hd.start_at, hd.end_at, u.id AS user_id
        FROM doctors d
        JOIN availability_hours hd ON d.id = hd.doctor_id
        JOIN users u ON u.id = d.user_id
    `;
    
    const queryParams = [];

    // Ajout de la jointure pour les spécialités
    if (speciality_id) {
        query += `
            JOIN doctor_specialities ds ON d.id = ds.doctor_id
        `;
    }

    // Ajout de la jointure pour les adresses
    if (address) {
        query += `
            JOIN addresses a ON u.id = a.user_id
        `;
    }

    // Conditions pour la requête
    const conditions = [];
    if (speciality_id) {
        conditions.push('ds.speciality_id = ?');
        queryParams.push(speciality_id);
    }
    if (address) {
        conditions.push('a.address = ?');
        queryParams.push(address);
    }

    // Ajouter les conditions à la requête
    if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
    }

    db.query(query, queryParams, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erreur lors de la récupération des médecins.' });
        }
        res.json(results);
    });
});
//liste des rendez-vous dispo par doctors
app.get('/doctorsdispos', (req, res) => {
    const doctorId = req.query.doctorId;
    

    // Vérifier si au moins l'un des paramètres est fourni
    if (!doctorId) {
        return res.status(400).json({ error: 'L\'ID de spécialité ou l\'adresse est requis.' });
    }
let query = `
      SELECT r.appointment_at , start_at , ends_at 
FROM appointments r
JOIN appointment_statuses s ON r.appointment_status_id = s.id
WHERE r.doctor_id = ? AND s.status = 'failed';
    `;
    db.query(query, [doctorId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs.' });
        }
        res.json(results);
    });
});

// Fonction pour ajouter un rendez-vous
app.post('/appointments', (req, res) => {
    const {
        
        clinic,
        doctor,
        doctor_id,
        patient,
        user_id,
        quantity,
        appointment_status_id,
        address,
        payment_id,
        coupon,
        taxes,
        appointment_at,
        start_at,
        ends_at,
        hint,
        online,
        cancel,
    } = req.body;

    const query = `
        INSERT INTO appointments (id,clinic, doctor, doctor_id, patient, user_id, quantity, appointment_status_id, address, payment_id, coupon, taxes, appointment_at, start_at, ends_at, hint, online, cancel, created_at, updated_at)
        VALUES (?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const values = [
        clinic,
        doctor,
        doctor_id,
        patient,
        user_id,
        quantity,
        appointment_status_id,
        address,
        payment_id,
        coupon,
        taxes,
        appointment_at,
        start_at,
        ends_at,
        hint,
        online,
        cancel,
    ];

    db.query(query, values, (error, results) => {
        if (error) {
            console.error('Error inserting appointment:', error);
            return res.status(500).json({ error: 'Error inserting appointment' });
        }
        res.status(201).json({ message: 'Appointment created successfully', id: results.insertId });
    });
});
app.post('/api/rendez_vous', (req, res) => {
    const { nom, date, description } = req.body;

    // Vérification des données d'entrée
    if (!nom || !date) {
        return res.status(400).send({ message: 'Nom et date sont requis.' });
    }

    const sql = 'INSERT INTO rendez_vous (nom, date, description) VALUES (?, ?, ?)';
    const values = [nom, date, description || null]; // description peut être null

    db.execute(sql, values, (err, results) => {
        if (err) {
            console.error('Erreur lors de l\'ajout du rendez-vous:', err);
            return res.status(500).send({ message: 'Erreur lors de l\'ajout du rendez-vous' });
        }
        res.status(201).send({ message: 'Rendez-vous ajouté avec succès', id: results.insertId });
    });
});



//get all doctors aléatoirement 
const getalldoctorss = (req, res) => {
    let query = `
   SELECT  
        d.id AS doctor_id,
        d.name AS name,
        d.doctor_photo,
        d.enable_online_consultation,
        d.description,
        d.horaires,
        d.cabinet_photo,
        d.created_at,
        a.title AS title,
        JSON_ARRAYAGG(JSON_OBJECT('id', s.id, 'name', s.name)) AS specialities
      
        addr.ville
  
    FROM 
        doctors d 
    LEFT JOIN 
        doctor_specialities ds ON d.id = ds.doctor_id 
    LEFT JOIN 
        specialities s ON ds.speciality_id = s.id 
    JOIN 
        experiences a ON d.id = a.doctor_id 
    JOIN 
        users usr ON d.user_id = usr.id 
    JOIN 
        addresses addr ON usr.id = addr.user_id 
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
       
        addr.ville
   ORDER BY RAND()
   `;

    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs.' });
        }
        res.json(results);
    });
};
const getalldoctors = (req, res) => {
    let query = `
   SELECT  
        d.id AS doctor_id,
        d.name AS name,
        d.doctor_photo,
        d.enable_online_consultation,
        d.description,
        d.horaires,
        d.cabinet_photo,
        d.created_at,
        a.title AS title,
        JSON_ARRAYAGG(JSON_OBJECT('id', s.id, 'name', s.name)) AS specialities,
        usr.phone_number,  
        addr.ville
  
    FROM 
        doctors d 
    LEFT JOIN 
        doctor_specialities ds ON d.id = ds.doctor_id 
    LEFT JOIN 
        specialities s ON ds.speciality_id = s.id 
    JOIN 
        experiences a ON d.id = a.doctor_id 
    JOIN 
        users usr ON d.user_id = usr.id -- Join users to get phone_number
    JOIN 
        addresses addr ON usr.id = addr.user_id 
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
        usr.phone_number,  -- Group by phone number as well
        addr.ville
   ORDER BY RAND()
   `;

    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs.' });
        }
        res.json(results);
    });
};


const getDoctorsparvillepaysspecialites = (req, res) => {
    const speciality_id = req.query.speciality_id;
    const ville = req.query.ville; // Ville
    const pays = req.query.pays; // Pays

    let query = `
        SELECT  
            d.id AS doctor_id,
            d.name AS name,
            d.doctor_photo,
            d.enable_online_consultation,
            d.description,
            d.horaires,
            d.cabinet_photo,
            d.created_at,
            a.title AS title,
            usr.phone_number, -- Include phone number from users table
            addr.ville,
            addr.pays,
            JSON_ARRAYAGG(JSON_OBJECT('id', s.id, 'name', s.name)) AS specialities
        FROM 
            doctors d 
        LEFT JOIN 
            doctor_specialities ds ON d.id = ds.doctor_id 
        LEFT JOIN 
            specialities s ON ds.speciality_id = s.id 
        JOIN 
            experiences a ON d.id = a.doctor_id 
        JOIN 
            users usr ON d.user_id = usr.id 
        JOIN 
            addresses addr ON usr.id = addr.user_id 
    `;

    const queryParams = [];
    const conditions = [];

    // Condition for speciality
    if (speciality_id) {
        conditions.push('ds.speciality_id = ?');
        queryParams.push(speciality_id);
    }

    // Condition for city (ville)
    if (ville) {
        conditions.push('addr.ville = ?'); 
        queryParams.push(ville);
    }

    // Condition for country (pays)
    if (pays) {
        conditions.push('addr.pays = ?'); 
        queryParams.push(pays);
    }

    // Append conditions to the query if any
    if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Grouping the results and randomizing the order
    query += `
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
            usr.phone_number, -- Add phone number to the GROUP BY clause
            addr.ville,
            addr.pays
        ORDER BY RAND()
    `;

    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error(err); // Debugging
            return res.status(500).json({ error: 'Erreur lors de la récupération des médecins.' });
        }
        // Check if results were found
        if (results.length === 0) {
            return res.status(404).json({ message: 'Aucun médecin trouvé avec ces critères.' });
        }
        res.json(results);
    });
};

//get availeble date pour doctors
const getDoctorsById = (req, res) => {
    const doctorId = req.query.doctor_id; // Récupérer l'ID du médecin

    // Vérification si doctorId est fourni
    if (!doctorId) {
        return res.status(400).json({ error: 'Le doctor_id est requis.' });
    }

    // Préparation de la requête SQL
    let query = `SELECT day, start_at, end_at FROM availability_hours WHERE doctor_id = ?;`;

    // Exécution de la requête
    db.query(query, [doctorId], (err, results) => {
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
//Voir les spécialité les plus existantes avec nombre des doctors 
const specialitespardoctor =(req, res) => {
    const query = `
      SELECT  s.id,s.name,s.icon, COUNT(sd.doctor_id) AS doctor_count
        FROM specialities s
        LEFT JOIN  doctor_specialities sd ON s.id = sd.speciality_id
        GROUP BY s.id, s.name
        ORDER BY doctor_count DESC;
    `;

    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erreur lors de la récupération des spécialités.' });
        }
        res.json(results);
    });
}
// Lire tous les positions des doctors pour maps
const getadressempas =(req, res) => {
    db.query('SELECT latitude , longitude ,description From addresses', (err, results) => {
        if (err) throw err;
        res.send(results);
    });
}
//getvilles
const getvilles = (req,res)=> {
    db.query('SELECT ville FROM addresses',(err , results)=> {
       if(err) throw err ;
       res.send(results); 
    });
}
const getville = (req, res) => {
    db.query('SELECT ville FROM addresses', (err, results) => {
        if (err) {
            // Gestion des erreurs
            return res.status(500).json({ error: 'Erreur lors de la récupération des données' });
        }

        // Normaliser les noms de villes
        const normalizedResults = results.map(row => {
            return {
                ville: row.ville
                    .replace(/\s+/g, '_')    // Remplace les espaces par des underscores
                    .normalize('NFD')       // Décompose les caractères accentués
                    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
                    .toLowerCase()          // Convertit en minuscules
            };
        });

        // Envoi des résultats normalisés
        res.json(normalizedResults);
    });
};

//getpays
const getpays = (req,res)=> {
    db.query('SELECT DISTINCT pays FROM addresses',(err , results)=> {
       if(err) throw err ;
       res.send(results); 
    });
}
const getmotifs = (req,res)=>{
   

     const specialiteid = req.query.specialite_id; // Récupérer l'ID du médecin

    // Vérification si doctorId est fourni
    if (!specialiteid) {
        return res.status(400).json({ error: 'Le specialiteid est requis.' });
    }

    // Préparation de la requête SQL
    let query = `SELECT id,nom,price FROM pattern WHERE specialite_id = ?`;

    // Exécution de la requête
    db.query(query, [specialiteid], (err, results) => {
        if (err) {
            console.error(err); // Pour le débogage
            return res.status(500).json({ error: 'Erreur lors de la récupération des motifs de spécialités.' });
        }

        // Vérification si des résultats ont été trouvés
        if (results.length === 0) {
            return res.status(404).json({ message: 'Aucun motif trouvée pour cette spécialité.' });
        }

        // Retourner les résultats
        res.json(results);
    });
    }
    const getmotif = (req, res) => {
        const doctorId = req.query.doctor_id; // Récupérer l'ID du médecin
        const specialiteId = req.query.specialite_id; // Récupérer l'ID de la spécialité
    
        // Vérification si doctorId et specialiteId sont fournis
        if (!doctorId || !specialiteId) {
            return res.status(400).json({ error: 'Les paramètres doctor_id et specialite_id sont requis.' });
        }
    
        // Préparation de la requête SQL
        let query = `SELECT id, nom, price FROM pattern WHERE specialite_id = ? AND doctor_id = ?`;
    
        // Exécution de la requête
        db.query(query, [specialiteId, doctorId], (err, results) => {
            if (err) {
                console.error(err); // Pour le débogage
                return res.status(500).json({ error: 'Erreur lors de la récupération des motifs de spécialités.' });
            }
    
            // Vérification si des résultats ont été trouvés
            if (results.length === 0) {
                return res.status(404).json({ message: 'Aucun motif trouvé pour cette spécialité et ce médecin.' });
            }
    
            // Retourner les résultats
            res.json(results);
        });
    };
    
//historique des rendez_vour pour chaque patient
///Historiquedesrendez_vous'
const gethistoriqu = (req, res) => {const nodemailer = require('nodemailer');
    const crypto = require('crypto');
    app.use(express.json());
    
    const userId = req.query.userId;
    

    // Vérifier si au moins l'un des paramètres est fourni
    if (!userId) {
        return res.status(400).json({ error: 'L\'ID de spécialité ou l\'adresse est requis.' });
    }
let query = `
      SELECT 
    a.appointment_at, 
    a.start_at, 
    a.ends_at, a.clinic ,a.s
    d.name AS doctor_name
FROM 
    appointments a
JOIN 
    doctors d ON a.doctor_id = d.id
WHERE 
    a.user_id = ?;`;
    db.query(query, [userId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs.' });
        }
        res.json(results);
    });
}

function insertAppointments(req, res) {
    console.log('Request Body:', req.body); // Affiche le contenu de req.body
    const authHeader = req.headers['authorization'];

    // Vérifier si le header contient le token
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Accès refusé, token manquant' });
    }
    // Récupérer les paramètres depuis le corps de la requête
    const { appointment_at, ends_at, start_at, doctor_id, clinic, doctor, patient, address, motif_id } = req.body;

    // Vérification des paramètres requis
    if (!appointment_at || !ends_at || !start_at || !token || !doctor_id || !clinic || !doctor || !patient || !address ) {
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
    // Préparer la requête SQL
    const query = `
        INSERT INTO appointments (appointment_at, ends_at, start_at, user_id, doctor_id, clinic, doctor, patient, address, motif_id, appointment_status_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `;
   
    const values = [appointment_at, ends_at, start_at, user_id, doctor_id, clinic, doctor, patient, address, motif_id];
    console.log(user_id);

     // Supprimer l'heure disponible associée dans la table 'available_hours'
     const deleteAvailableHourQuery = `
     DELETE FROM availability_hours 
     WHERE doctor_id = ? 
     AND start_at = ? 
     AND end_at = ? 
    
 `;

 const availableHourValues = [doctor_id, start_at, ends_at];

 db.query(deleteAvailableHourQuery, availableHourValues, (deleteError, deleteResults) => {
    if (deleteError) {
        return res.status(500).json({ error: `Erreur lors de la suppression des heures disponibles: ${deleteError.message}` });
    }

    // Réponse réussie si tout s'est bien passé
    res.status(201).json({ 
        message: 'Rendez-vous inséré avec succès, et heure disponible supprimée', 
    });

    // Exécuter la requête
    db.query(query, values, (error, results) => {
        if (error) {
            return res.status(500).json({ error: error.message }); // Affiche le message d'erreur
        }
        res.status(201).json({ message: 'Rendez-vous inséré avec succès', id: results.insertId });
    });
});
let querys = `SELECT email FROM users WHERE id = ?;`;

    // Exécution de la requête
    db.query(querys, [user_id], (err, resul) => {
        if (err) {
            console.error(err); // Pour le débogage
            return res.status(500).json({ error: 'Erreur lors de la récupération des disponibilités.' });
        }

        // Vérification si des résultats ont été trouvés
        if (resul.length === 0) {
            return res.status(404).json({ message: 'Aucune disponibilité trouvée pour ce médecin.' });
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

const mailOptions = {
    from: 'laajili.khouloud12@gmail.com',
    to: resul,
    subject: 'Confirmation de votre Rendez_vous à Wic-Doctor.com',
    html: `
        <html>
        <body>
            <h2 style="color: #4CAF50;">Bienvenue Cher Patient!</h2>
            <p>Votre rendez_vous avec le médecin  ${doctor} à ${start_at}</p>
            <p>est bien confirmé</p>   
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

})
}

function insertAppointment(req, res) {
    console.log('Request Body:', req.body);
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Accès refusé, token manquant' });
    }

    const { appointment_at, ends_at, start_at, doctor_id, clinic, doctor, patient, address, motif_id } = req.body;

    if (!appointment_at || !ends_at || !start_at || !doctor_id || !clinic || !doctor || !patient || !address) {
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
        INSERT INTO appointments (appointment_at, ends_at, start_at, user_id, doctor_id, clinic, doctor, patient, address, motif_id, appointment_status_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `;
    const values = [appointment_at, ends_at, start_at, user_id, doctor_id, clinic, doctor, patient, address, motif_id];

    const deleteAvailableHourQuery = `
        DELETE FROM availability_hours 
        WHERE doctor_id = ? 
        AND start_at = ? 
        AND end_at = ? 
    `;

    const availableHourValues = [doctor_id, start_at, ends_at];

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
                            <p>Votre rendez-vous avec le médecin  ${JSON.parse(resuls[0].name).fr} le ${formattedStartAt}</p>
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

// Fonction pour insérer un rendez-vous



//app.post('/reset-password', 
// Route pour demander un lien de réinitialisation
const restpassword = (req, res) => {
    const { email } = req.body;
    const token = crypto.randomBytes(20).toString('hex');

    db.query('INSERT INTO password_resets (email, token) VALUES (?, ?)', [email, token], (err) => {
        if (err) return res.status(500).send('Error saving token');

        // Rediriger vers le lien de réinitialisation
        const resetLink = `http://localhost:3000/reset-password/${token}`;
        res.redirect(resetLink);
    });
}


// Route pour demander une réinitialisation de mot de passe app.post('/forgot-password'
const forgetpass = (req, res) => {
    const { email } = req.body;
    const response = forgotPassword(email);

    if (!response.startsWith("Invalid")) {
        const resetLink = `http://localhost:3000/reset-password?token=${response}`;
        return res.status(200).send(resetLink);
    }
    
    res.status(400).send(response); // Retourne "Invalid email id." si l'email est invalide
}

// Fonction de réinitialisation du mot de passe
function forgotPassword(email) {
    const user = findUserByEmail(email); // Simulez la recherche dans votre base de données

    if (!user) {
        return "Invalid email id.";
    }

    user.token = `${uuidv4()}${uuidv4()}`;
    //user.tokenCreationDate = moment().toISOString();
   user.tokenCreationDate = moment().format('YYYY-MM-DD HH:mm:ss');

    // Ici, vous devriez mettre à jour l'utilisateur dans votre base de données
    updateUser(email ,user.token ,user.tokenCreationDate); // Simulez la mise à jour

    return user.token;
}

// Route pour réinitialiser le mot de passe app.put('/reset-password',
 const resetpass = (req, res) => {
    const { token, password } = req.body;
    const response = resetPassword(token, password);
    
    res.status(200).send(response);
}

// Fonction de réinitialisation de mot de passe
function resetPassword(token, password) {
    const user = findUserByToken(forgotPassword.user.token); // Simulez la recherche dans votre base de données

    if (!user) {
        return "Invalid token.";
    }

    if (isTokenExpired(user.tokenCreationDate)) {
        return "Token expired.";
    }

    user.password = password; // Mettez à jour le mot de passe
    user.token = token;
    user.tokenCreationDate = tokenCreationDate;

    // Mettez à jour l'utilisateur dans votre base de données
    updateUserpass(user.token,user.password); // Simulez la mise à jour

    return "Your password successfully updated.";
}

// Simulez la recherche d'utilisateur par email
function findUserByEmail(email) {
  
    return new Promise((resolve, reject) => {
      const query = 'SELECT * FROM `users` WHERE email = ?';
      db.execute(query, [email], (err, results) => {
        if (err) {
          return reject(err);
        }
        resolve(results);
      });
    });
  }


// Simulez la recherche d'utilisateur par token
function findUserByToken(token) {
  
    return new Promise((resolve, reject) => {
        const query = 'SELECT * FROM `users` WHERE api_token = ?';
        db.execute(query, [token], (err, results) => {
          if (err) {
            return reject(err);
          }
          resolve(results);
        });
      });
}
class TokenManager {
    // Durée d'expiration du token en millisecondes (ex: 1 heure)
    static EXPIRATION_TIME = 60 * 60 * 1000; // 1 heure

    // Méthode pour générer un token
    generateToken() {
        const token = `${uuidv4()}${uuidv4()}`;
        return token;
    }

    /**
     * Vérifie si le token a expiré ou non.
     *
     * @param {Date} tokenCreationDate - La date de création du token
     * @returns {boolean} - true si le token a expiré, false sinon
     */
    isTokenExpired(tokenCreationDate) {
        const currentTime = new Date().getTime();
        const tokenTime = tokenCreationDate.getTime();
        return (currentTime - tokenTime) > TokenManager.EXPIRATION_TIME;
    }
}
// Fonction pour mettre à jour l'utilisateur dans la base de données
function updateUser(email, token, tokenCreationDate) {
    const query = 'UPDATE users SET api_token = ?, created_at = ? WHERE email = ?';
    db.execute(query, [token, tokenCreationDate, email], (err, results) => {
        if (err) {
            return console.error('Erreur lors de la mise à jour :', err);
        }
        console.log('Utilisateur mis à jour avec succès :', results.affectedRows);
    });
}
function updateUserpass(token,password) {
    const query = 'UPDATE users SET api_token = ? and password = ?';
    db.execute(query, [token,password], (err, results) => {
        if (err) {
            return console.error('Erreur lors de la mise à jour :', err);
        }
        console.log('Utilisateur mis à jour avec succès :', results.affectedRows);
    });
}





// Simuler la recherche d'utilisateur par token
function findUserByToken(token) {
    return users.find(user => user.token === token);
}

// Vérifier si le token a expiré
function isTokenExpired(tokenCreationDate) {
    const creationDate = moment(tokenCreationDate);
    return moment().diff(creationDate, 'minutes') > 60; // Exemple : le token expire après 30 minutes
}

// Fonction pour réinitialiser le mot de passe
function resetPassword(token, password) {
    const user = findUserByToken(token);

    if (!user) {
        return { message: "Invalid token.", success: false };
    }

    if (isTokenExpired(user.tokenCreationDate)) {
        return { message: "Token expired.", success: false };
    }

    user.password = password; // Mettre à jour le mot de passe
    user.tokenCreationDate = moment().format('YYYY-MM-DD HH:mm:ss'); // Mise à jour de la date

    return { message: "Your password has been successfully updated.", success: true };
}


// Fonction "mot de passe oublié" app.post('/api/forgot-password'
const forgs = (req, res) => {
    const { email } = req.body;
   
    db.query('SELECT * FROM users WHERE email = ?', [email], (error, results) => {
        if (error) return res.status(500).json({ message: "Database error." });

        if (results.length === 0) {
            return res.status(400).json({ message: "Email not found." });
        }

        const token = uuidv4(); // Générer un nouveau token
        const tokenCreationDate = moment().format('YYYY-MM-DD HH:mm:ss');
        const response = forgotPassword(email);

        // Mettre à jour l'utilisateur avec le token
       db.query('UPDATE users SET api_token = ?, created_at = ? WHERE email = ?', [token, tokenCreationDate, email], (err) => {
            if (err) return res.status(500).json({ message: "Error updating user." });

         //   sendEmail(email, token); // Simuler l'envoi d'email
           // res.status(200).json({ message: "Reset password email sent." });
          // if (!response.startsWith("Invalid")) {
            const resetLink = `http://localhost:3001/api/reset-password?token=${response}`;
          //  return res.status(200).send(resetLink);
        //}
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
            subject: 'Réinitialisation de votre mot de passe',
            html: `<p>Pour réinitialiser votre mot de passe, veuillez cliquer sur le lien suivant :</p><a href="${resetLink}">${resetLink}</a>`,
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

function resetPassword(token, password) {
        const user = findUserByToken(forgotPassword.user.token); // Simulez la recherche dans votre base de données
    
        if (!user) {
            return "Invalid token.";
        }
    
        if (isTokenExpired(user.tokenCreationDate)) {
            return "Token expired.";
        }
    
        user.password = password; // Mettez à jour le mot de passe
        user.token = token;
        user.tokenCreationDate = tokenCreationDate;
    
        // Mettez à jour l'utilisateur dans votre base de données
        updateUserpass(user.token,user.password); // Simulez la mise à jour
    
        return "Your password successfully updated.";
    }
    const bcrypt = require('bcrypt'); // Importer bcrypt
const { error } = require('console');

// Fonction pour réinitialiser le mot de passe app.post('/api/reset-password',
 const rests = (req, res) => {
  
        const { token, password } = req.query; // Récupérer le token et le mot de passe depuis les paramètres de requête
    
        // Rechercher l'utilisateur par le token
        db.query('SELECT * FROM users WHERE api_token = ?', [token], (error, results) => {
            if (error) return res.status(500).json({ message: "Database error: " + error.message});
    
            if (results.length === 0) {
                return res.status(400).json({ message: "Invalid token."+ error  });
            }
    
            const user = results[0];
            const isExpired = moment().diff(moment(user.tokenCreationDate), 'minutes') > 30; // Token expire après 30 minutes
    
            if (isExpired) {
                return res.status(400).json({ message: "Token expired." + error.message });
            }
            user.tokenCreationDate = moment().format('YYYY-MM-DD HH:mm:ss'); // Mise à jour de la date

            // Hacher le nouveau mot de passe
            const hashedPassword = bcrypt.hashSync(password, 10);
    
            // Mettre à jour le mot de passe et supprimer le token
            db.query('UPDATE users SET password = ?, api_token = ?, updated_at = ? WHERE id = ?', [hashedPassword,token, user.tokenCreationDate,user.id], (err) => {
                if (err) return res.status(500).json({ message: "Error updating password." + error.message  });
    
                res.status(200).json({ message: "Your password has been successfully updated." });
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
    //app.get('/api/doctors', 
    const getplusprochedoc = (req, res) => {
        const userLatitude = parseFloat(req.query.latitude);
        const userLongitude = parseFloat(req.query.longitude);
    
        const query = 'SELECT * FROM addresses'; // Récupérer tous les médecins
    
        db.query(query, (err, results) => {
            if (err) {
                return res.status(500).json({ error: 'Erreur lors de la récupération des médecins.' });
            }
    
            // Calculer la distance et ajouter à chaque médecin
            const doctorsWithDistance = results.map(doctor => {
                const distance = haversineDistance(userLatitude, userLongitude, doctor.latitude, doctor.longitude);
                return {
                    ...doctor,
                    distance: distance // Ajouter la distance
                };
            });
    
            // Trier par distance
            doctorsWithDistance.sort((a, b) => a.distance - b.distance);
    
            // Retourner les médecins les plus proches
            res.json(doctorsWithDistance);
        });
    }

    function haversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Rayon de la Terre en kilomètres
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance en kilomètres
    }
    



module.exports = {
    specialitespardoctor,
    getalldoctors,
    getDoctorsparvillepaysspecialites,
    getDoctorsById,
    getadressempas,
    getvilles,getpays,getmotif,gethistoriqu,
    insertAppointment,getville,
    forgs,rests,insertAppointment,getplusprochedoc
}

