const express= require ('express');
const authController =require ('../Controlleurs/doctor');
const { getdoctorsbyid } = require('../Controlleurs/doctor');
const app = express();

const passport = require('passport');
const loginController =require ('../Controlleurs/authController');
const profileController =require ('../Controlleurs/profile');
const db = require('../config/db'); 

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
//route pour  l'inscription
router.post('/register',loginController.register);
router.get('/verify', loginController.verifyEmail);

//route pour la connexion
router.post('/login',loginController.login);

router.get('/logout', function(request, response, next){

    request.session.destroy();

    response.redirect("/");

});
router.put('/update-profile/:id',profileController.updateProfile);
router.get('/profile/:id',profileController.getprofile);




module.exports = router;