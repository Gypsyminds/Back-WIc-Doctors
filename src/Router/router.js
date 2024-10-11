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
<<<<<<< HEAD
router.post('/api/forgot-password',authController.forgs);
router.post('/api/reset-password',authController.rests);
=======


>>>>>>> 026c608 (first commit)


module.exports = router;