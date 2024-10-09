const express= require ('express');
const authController =require ('../Controlleurs/doctor');
const { getdoctorsbyid } = require('../Controlleurs/doctor');
const app = express();


const db = require('../config/db'); // Importer la connexion à la base de données

const router= express.Router();

//route pour  l'inscription
router.get('/afftempsdoctorsbyid',authController.getDoctorsById);
router.get('/affalldoctors', authController.getalldoctors);
router.get('/doctorsadd', authController.getDoctorsparvillepaysspecialites);
router.get('/specialties' ,authController.specialitespardoctor);
router.get('/doctorspos',authController.getadressempas);
router.get('/getvilles',authController.getvilles);
router.get('/getpays',authController.getpays);
router.get('/getmotif',authController.getmotif);

module.exports = router;