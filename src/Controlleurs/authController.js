const db = require ('../config/db.js');
const bcrypt= require('bcryptjs');
const jwt= require('jsonwebtoken');
const nodemailer = require('nodemailer');





const JWT_SECRET = 'maSuperSecretKey'; 
const register = (req, res) =>{


    const { name, email, phoneNumber, password } = req.body;

    // Check if email already exists
  db.query('SELECT email FROM users WHERE email = ?', [email], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Erreur lors de la vérification de l\'email' });
        }

        if (rows.length > 0) {
            return res.status(400).json({ message: 'Utilisateur déjà existant' });
        }

        // Hash password
        bcrypt.hash(password, 10, (err, hash) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: 'Erreur lors du hachage du mot de passe' });
            }
          
          

            // Insert user
           db.query(
                'INSERT INTO users (name, password, email, phone_number, created_at, updated_at) VALUES (?, ?,?, ?, NOW(), NOW())',
                [name, hash, email, phoneNumber],
                (err, result) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).json({ message: 'Erreur lors de l\'enregistrement de l\'utilisateur' });
                    }

               
                
           const userId = result.insertId;

          

                   
                    // Insert user into patients table
                    db.query(
                        'INSERT INTO patients (user_id,first_name,last_name,phone_number,mobile_number,age,gender,weight,height,medical_history,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,NOW(), NOW())',
                        [userId, "", "",phoneNumber,"","","","","","",""],
                        (err) => {
                            if (err) {
                                console.error(err);
                                return res.status(500).json({ message: 'Erreur lors de l\'ajout à la table des patients' });
                            }

                            res.status(201).json({ message: 'Utilisateur enregistré avec succès et ajouté à la table patient' });
                    
                        }
                    );
            // Generate a token JWT
            const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '1h' });
            const verificationUrl = `http://localhost:3000/verify?api_token=${token}`;

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                port: 587,
                secure: false, 
                auth: {
                    user: 'amanibenhassine23@gmail.com', 
                    pass: 'geky cggq rsyg psxh', 
                },
            });
            transporter.verify((error, success) => {
                if (error) {
                    console.error('Error with the email connection: ', error);
                } else {
                    console.log('Email connection verified');
                }
            });
            var mailOptions = {
                   from: 'amanibenhassine23@gmail.com',
                   to: email,
                   subject: 'Confirmation de votre inscription',
                   //text: `Votre code de vérification est : ${verificationUrl}`,
                   html: `
                   <html>
                   <body>
                       <h2 style="color: #4CAF50;">Bienvenue !</h2>
                       <p>Merci de vous être inscrit.</p>
                       <p>Pour confirmer votre inscription, veuillez cliquer sur le lien ci-dessous :</p>
                       <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Confirmer mon inscription</a>
                       <p>Si vous n'avez pas demandé cette inscription, ignorez simplement cet e-mail.</p>
                       <p>Cordialement,<br>L'équipe de support</p>
                   </body>
                   </html>
               `,
               };
       
               transporter.sendMail(mailOptions, function(error, info) {
                   if (error) {
                       console.log(error);
                       res.send('Please try again!');
                   } else {
                       console.log('Email sent: ' + info.response);
                       res.send('Thanks for registering! Please confirm your email! We have sent a link!'); 
                   }
               });


        





   }
            );








        });
    });
};



      



      




// connexion d'un utilisateur



const login = (req, res) =>{
    const { email, password } = req.body;

    //  Vérifier si l'utilisateur existe dans la base de données
    const sql = 'SELECT * FROM users WHERE email = ?';
     db.query(sql, [email], (err, results) => {
        // Gestion des erreurs
        if (err) {
            console.error(err);
            return res.status(500).send({ msg: err.message });
        }

        // Vérifier si l'utilisateur a été trouvé
        if (results.length === 0) {
            return res.status(401).send({ msg: 'The email address ' + email + ' is not associated with any account. Please check and try again!' });
        }

        const user = results[0];

        // Comparer le mot de passe
        if (!bcrypt.compareSync(password, user.password)) {
            return res.status(401).send({ msg: 'Wrong Password!' });
        }

        // Vérifier si l'utilisateur a vérifié son e-mail
        if (!user.email_verified_at) {
            return res.status(401).send({ msg: 'Your Email has not been verified. Please click on resend' });
        }

        // Générer un token JWT
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        
        res.status(200).send({ token: token });
    });
};
   





// vérifier le jwt
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(403).json({ message: 'Un token est requis' });
    }

    try {
        const decoded = jwt.verify(token.split(' ')[1], SECRET_KEY); 
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Token invalide' });
    }
};



const verifyEmail = (req, res) => {
    const { api_token } = req.query;

    //  Vérifier si le token est valide et récupérer l'état de vérification de l'utilisateur
    const sqlCheck = 'SELECT email_verified_at FROM users WHERE api_token = ?';
    
    db.query(sqlCheck, [api_token], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Erreur lors de la vérification de l\'email');
        }

        if (results.length === 0) {
            return res.status(400).send('Token de vérification invalide.');
        }

        //  Vérifier si l'utilisateur est déjà vérifié
        const user = results[0];
        if (user.email_verified_at) {
            return res.status(400).send('L\'email a déjà été vérifié.');
        }

        //  Si l'utilisateur n'est pas vérifié, procéder à la mise à jour
        const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' '); 
        const sqlUpdate = 'UPDATE users SET email_verified_at = ? WHERE api_token = ?';
        
        db.query(sqlUpdate, [currentDate, api_token], (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Erreur lors de la vérification de l\'email');
            }
            if (results.affectedRows > 0) {
                // Rediriger vers la page de connexion
                return res.redirect('http://localhost:3000/login'); 
            } else {
                return res.status(400).send('Erreur lors de la mise à jour de l\'état de vérification.');
            }
        });
    });
};



module.exports = {
    register,
    login,
    verifyToken,
    verifyEmail
};