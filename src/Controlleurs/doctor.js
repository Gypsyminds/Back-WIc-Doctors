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
        GROUP_CONCAT(s.name) AS specialities,
      
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
//get doctors par specialites ville et pays
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
            GROUP_CONCAT(s.name) AS specialities,
            addr.ville,
            addr.pays
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

    // Condition pour la spécialité
    if (speciality_id) {
        conditions.push('ds.speciality_id = ?');
        queryParams.push(speciality_id);
    }

    // Condition pour la ville
    if (ville) {
        conditions.push('addr.ville = ?'); 
        queryParams.push(ville);
    }

    // Condition pour le pays
    if (pays) {
        conditions.push('addr.pays = ?'); 
        queryParams.push(pays);
    }

    // Ajout des conditions à la requête
    if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Grouper les résultats par médecin
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
            addr.ville,
            addr.pays
        ORDER BY RAND()
    `;

    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error(err); // Pour le débogage
            return res.status(500).json({ error: 'Erreur lors de la récupération des médecins.' });
        }
        // Vérifier si des résultats ont été trouvés
        if (results.length === 0) {
            return res.status(404).json({ message: 'Aucun médecin trouvé avec ces critères.' });
        }
        res.json(results);
    });
}
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
      SELECT  s.name, COUNT(sd.doctor_id) AS doctor_count
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
//getpays
const getpays = (req,res)=> {
    db.query('SELECT DISTINCT pays FROM addresses',(err , results)=> {
       if(err) throw err ;
       res.send(results); 
    });
}
const getmotif = (req,res)=>{
   

     const specialiteid = req.query.specialite_id; // Récupérer l'ID du médecin

    // Vérification si doctorId est fourni
    if (!specialiteid) {
        return res.status(400).json({ error: 'Le specialiteid est requis.' });
    }

    // Préparation de la requête SQL
    let query = `SELECT id,nom FROM pattern WHERE specialite_id = ?`;

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
//historique des rendez_vour pour chaque patient
///Historiquedesrendez_vous'
const gethistoriqu = (req, res) => {
    const userId = req.query.userId;
    

    // Vérifier si au moins l'un des paramètres est fourni
    if (!userId) {
        return res.status(400).json({ error: 'L\'ID de spécialité ou l\'adresse est requis.' });
    }
let query = `
      SELECT 
    a.appointment_at, 
    a.start_at, 
    a.ends_at, 
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
module.exports = {
    specialitespardoctor,
    getalldoctors,
    getDoctorsparvillepaysspecialites,
    getDoctorsById,
    getadressempas,
    getvilles,getpays,getmotif,gethistoriqu
}

