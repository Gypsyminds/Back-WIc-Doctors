const db = require ('../config/db.js');

// Change email and password
const updateProfile = (req, res) => {

    const { newEmail, currentPassword, newPassword } = req.body;
    const userId = req.params.id; 

    // Check current password
    db.query('SELECT * FROM users WHERE id = ?', [userId], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Error fetching user' });
        }

        const user = results[0];
        if (!user || !bcrypt.compareSync(currentPassword, user.password)) {
            return res.status(403).json({ message: 'Current password is incorrect' });
        }

        // Prepare updates
        const updates = {};
        if (newEmail) updates.email = newEmail;
        if (newPassword) updates.password = bcrypt.hashSync(newPassword, 10);

        // Update user details in the database
        const updateFields = Object.keys(updates).map(field => `${field} = ?`).join(', ');
        const values = Object.values(updates).concat(userId);

        db.query(`UPDATE users SET ${updateFields} WHERE id = ?`, values, (err) => {
            if (err) {
                return res.status(500).json({ message: 'Error updating profile' });
            }
            res.json({ message: 'Profile updated successfully' });
        });
    });
};


const getprofile = (req, res) => {

    const userId = req.params.id; 

    db.query('SELECT * FROM users WHERE id = ?', [userId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: true, message: 'Something went wrong!' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: true, message: 'User not found!' });
        }

        const user = results[0];
        res.status(200).json({ success: true, user: { id: user.id, email: user.email, name: user.name ,phone_number: user.phone_number ,password: user.password} }); 
    });
};
module.exports = {
    updateProfile,
    getprofile

};