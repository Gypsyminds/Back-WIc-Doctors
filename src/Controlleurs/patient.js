const db = require ('../config/db.js');



//get all
const getpatients = (req, res) => {

    const sql = 'SELECT * FROM patients';
    db.query(sql, (err, results) => {
        if (err) throw err;
        res.send(results);
    });
};



// get patient par id
const getpatientsId = (req, res) => {

    
    const userId = req.params.id; 

    const sql = 'SELECT * FROM patients WHERE user_id = ?';
    db.query(sql, [userId], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Erreur lors de la récupération du patient' });
        }
        if (result.length === 0) {
            return res.status(404).json({ error: 'Patient non trouvé' });
        }
        res.json(result[0]);
    });
};

const updatepatientId = (req, res) => {
    const userId = req.params.id;

    // Étape 1: Récupérer le patient par son ID
    const sqlFindPatient = 'SELECT user_id FROM patients WHERE user_id = ?';
    db.query(sqlFindPatient, [userId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Erreur lors de la récupération du patient' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Patient non trouvé' });
        }

        const patient = results[0];

        // Étape 2: Mettre à jour le profil du patient
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
            notes
        } = req.body;

        // Ne mettre à jour que les champs qui ont été fournis
        const sqlUpdatePatient = `
            UPDATE patients 
            SET 
                first_name = COALESCE(?, first_name), 
                last_name = COALESCE(?, last_name), 
                phone_number = COALESCE(?, phone_number), 
                mobile_number = COALESCE(?, mobile_number), 
                age = COALESCE(?, age), 
                gender = COALESCE(?, gender), 
                weight = COALESCE(?, weight), 
                height = COALESCE(?, height), 
                medical_history = COALESCE(?, medical_history), 
                notes = COALESCE(?, notes) 
            WHERE user_id = ?`;

        // Ajouter l'ID du patient à la fin de la requête
        db.query(sqlUpdatePatient, [
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
            userId
        ], (err, result) => {
            if (err) {
                return res.status(500).json({ error: 'Erreur lors de la mise à jour du patient' });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Patient non trouvé' });
            }
            res.json({ message: 'Profil du patient mis à jour avec succès' });
        });
    });
};



const deletepatientId = (req, res) => {

    const userId = req.params.id; 
    const sql = 'DELETE FROM patients WHERE id = ?';
    db.query(sql, [userId], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Erreur lors de la suppression du patient' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Patient non trouvé' });
        }
        res.json({ message: 'Patient supprimé avec succès' });
    });
};
module.exports = {
    getpatients,
    getpatientsId,
    updatepatientId,
    deletepatientId
    

};