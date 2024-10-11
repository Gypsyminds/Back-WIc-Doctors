const express= require ('express');
const authController =require ('../Controlleurs/authController');

const router= express.Router();

//route pour  l'inscription
router.post('/register',authController.register);
router.get('/verify', authController.verifyEmail);

//route pour la connexion
router.post('/login',authController.login);

router.get('/logout', function(request, response, next){

    request.session.destroy();

    response.redirect("/");

});

module.exports = router;
