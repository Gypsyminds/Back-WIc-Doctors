const cron = require('node-cron');
const { verifierEtEnvoyerRappels } = require('../Controlleurs/doctor');

// Tâche cron exécutée toutes les minutes
cron.schedule('* * * * *', async () => {
  console.log('Vérification des rendez-vous...');
  await verifierEtEnvoyerRappels();
});
