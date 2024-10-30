const express= require ('express');
const authController =require ('../Controlleurs/doctor');
const loginController =require ('../Controlleurs/login');
const bodyParser = require('body-parser');
const clinicController =require ('../Controlleurs/clinic');

const { getdoctorsbyid } = require('../Controlleurs/doctor');
const app = express();

const passport = require('passport');

const db = require('../config/db'); // Importer la connexion à la base de données

const router= express.Router();
app.use(bodyParser.json()); // Middleware pour analyser le corps des requêtes JSON

//route pour  l'inscription
router.get('/afftempsdoctorsbyid',authController.getDoctorsById);
router.get('/afftempsclinicsbyid',clinicController.getTempsClinicssById);
router.get('/affalldoctors', authController.getalldoctors);
router.get('/doctorsadd', authController.getDoctorsparvillepaysspecialites);
router.get('/getclinicsspcitypay', clinicController.getClinicsBySpecialityCityCountry);


router.get('/specialties' ,authController.specialitespardoctor);
router.get('/doctorspos',authController.getadressempas);
router.get('/getvilles',authController.getvilles);
router.get('/getpays',authController.getpays);
router.get('/getmotif',authController.getmotif);
router.get('/gethistoriques',authController.gethistoriqu);
router.post('/ajouterrendezvous',authController.insertAppointment);
router.post('/ajouterrendezvousclinic',clinicController.insertAppointmentclinic);

//router.post('/api/forgot-password',authController.forgs);
//router.post('/api/reset-password',authController.rests);
router.post('/api/logup',loginController.signuppatient);
router.post('/api/logupb2b',loginController.signupb2b);
router.put('/update/patient/:id',loginController.updateprofilpatient);
router.get('/getdocbyid/:id',authController.getDoctorById);

router.put('/updateappointement',authController.updateAppointment);
router.put('/updateappointementclinic',clinicController.updateAppointment);
router.get('/availability/:clinic_id/:doctor_id', clinicController.getAvailabilityHours);
router.delete('/appointmentscancel/:id', authController.cancelAppointment);


router.post('/send-sms', clinicController.sendSMS);
router.post('/api/login',loginController.signin);
// Route pour démarrer l'authentification avec Google
router.get('http://localhost:3000/auth/google', passport.authenticate('google'));
router.post('/logout', loginController.logout);
router.post('/reset-password', loginController.resetPassword);
router.get('/api/doctorsparposition', authController.getplusprochedoc);
router.get('/api/clinicsparposition', clinicController.getplusprocheclinic);

router.get('/getclinics', clinicController.getClinic);
router.get('/doctors/clinic/:clinicId',clinicController.getSpecialitiesByClinicId);
router.get('/getspecialitiesparclinics/:clinicId', clinicController.getDoctorsAndSpeciality);
router.get('/appointments/:patientId', authController.getAppointmentsByPatientId);
router.get('/specialitiesclinic/:clinicId',clinicController.getspecialitesdeclinic);
router.get('/patternsclinic/:clinicId/:specialiteId', clinicController.getmotifByClinicAndSpecialite);
router.get('/doctorsspeciality/:specialityId/:clinicId/:patternId', clinicController.getDoctorsBySpecialityAndClinic);

// Route de rappel (callback) après l'authauthentification réussie
router.get('http://localhost:3000/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
        // L'utilisateur est maintenant authentifié, redirige vers une page protégée ou l'accueil
        res.redirect('/dashboard'); // Change cette route selon tes besoins
    }
);

// Routes
app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }));

app.get('/auth/facebook/callback', 
  passport.authenticate('facebook', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/'); // Rediriger vers la page d'accueil
  }
);

app.get('/', (req, res) => {
  res.send(req.user ? `Bonjour, ${req.user.name}` : 'Bonjour, Invité');
});
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