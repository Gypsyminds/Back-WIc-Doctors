const express= require ('express');
const authController =require ('../Controlleurs/doctor');
const { getdoctorsbyid } = require('../Controlleurs/doctor');
const app = express();

const passport = require('passport');

const db = require('../config/db'); // Importer la connexion à la base de données

const router= express.Router();

//route pour  l'inscription
router.get('/afftempsdoctorsbyid',authController.getDoctorsById);
router.get('/affalldoctors', authController.getalldoctors);
router.get('/doctorsadd', authController.getDoctorsparvillepaysspecialites);
router.get('/specialties' ,authController.specialitespardoctor);
router.get('/doctorspos',authController.getadressempas);
router.get('/getvilles',authController.getville);
router.get('/getpays',authController.getpays);
router.get('/getmotif',authController.getmotif);
router.get('/gethistoriques',authController.gethistoriqu);
router.post('/ajouterrendezvous',authController.insertAppointment);
router.post('/api/forgot-password',authController.forgs);
router.post('/api/reset-password',authController.rests);
//router.get('http://localhost:3000/auth/google/callback',);

app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }));

app.get('/auth/facebook/callback',
    passport.authenticate('facebook', { failureRedirect: '/' }),
    (req, res) => {
        // Successful authentication
        res.redirect('/profile');
    }
);

app.get('/profile', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/');
    res.send(`Hello, ${req.user.name}`);
});

// Route pour démarrer l'authentification avec Google
router.get('http://localhost:3000/auth/google', passport.authenticate('google'));

// Route de rappel (callback) après l'authentification réussie
router.get('http://localhost:3000/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
        // L'utilisateur est maintenant authentifié, redirige vers une page protégée ou l'accueil
        res.redirect('/dashboard'); // Change cette route selon tes besoins
    }
);

// Route de déconnexion
router.get('/logout', (req, res) => {
    req.logout(err => {
        if (err) return next(err);
        res.redirect('/'); // Redirige vers la page d'accueil après la déconnexion
    });
});

// Route pour afficher le profil de l'utilisateur (optionnelle)
router.get('/profile', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/'); // Redirige si l'utilisateur n'est pas authentifié
    }
    res.json(req.user); // Affiche les informations de l'utilisateur
});
module.exports = router;