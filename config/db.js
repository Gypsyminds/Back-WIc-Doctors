const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors'); // Importer cors
const app = express();
const port = 3001;
app.use(cors());
// Middleware
app.use(bodyParser.json());

// Configurer la connexion MySQL
const db = mysql.createConnection({
    host: 'localhost',        // Remplacez par votre hôte
    user: 'root', // Remplacez par votre nouvel_utilisateurutilisateur
    password: 'P@ssw0rd1982', // Remplacez par votre mot de passe
    database: 'doctor-way-interactive'
}).promise();
//const db = promiseConnection.promise();

// Connecter à la base de données
db.connect(err => {
    if (err) {
        throw err;
    }
    console.log('MySQL connected...');
});

module.exports = db;
