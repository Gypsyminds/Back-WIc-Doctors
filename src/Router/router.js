const express= require ('express');
const authController =require ('../Controlleurs/doctor');
const { getdoctorsbyid } = require('../Controlleurs/doctor');

const db = require('../config/db'); // Importer la connexion à la base de données

const router= express.Router();

//route pour  l'inscription
router.get('/afftempsdoctorsbyid',authController.getDoctorsById);
router.get('/affalldoctors', authController.getalldoctors);
router.get('/doctorsadd', authController.getDoctorsparvillepaysspecialites);
router.get('/specialties' ,authController.specialitespardoctor);
module.exports = router;