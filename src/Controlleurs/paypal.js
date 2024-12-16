const paypal = require('paypal-rest-sdk');

// Configuration de PayPal
paypal.configure({
    mode: 'sandbox', // ou 'live' pour la production
    client_id: 'ARN9ULpFIceFtT8940tpCzeUM1zgsoNHMvZwc4zvPDQ39kqBwrqIvbOvR2hGTxfja1G0J3XOZSp9dGR9',
    client_secret: 'EJi5URDLBMB2pDRhOBg5CQKF64FN4LR3OdVNSiFlPEs0OeQZ1HrtKKEmpb4Z5QFtgWopCE0BDTJZieLr'
});

// Création du paiement
const createPayment = (req, res) => {
    const { amount } = req.body;

    const create_payment_json = {
        intent: 'sale',
        payer: {
            payment_method: 'paypal'
        },
        redirect_urls: {
            return_url: 'http://localhost:3001/paypal/success',
            cancel_url: 'http://localhost:3001/paypal/cancel'
        },
        transactions: [
            {
                amount: {
                    currency: 'USD',
                    total: amount
                },
                description: 'Achat sur votre site'
            }
        ]
    };

    paypal.payment.create(create_payment_json, (error, payment) => {
        if (error) {
            console.error(error);
            res.status(500).json({ message: 'Erreur lors de la création du paiement.' });
        } else {
            const approvalUrl = payment.links.find(link => link.rel === 'approval_url').href;
            res.json({ approvalUrl });
        }
    });
};

// Exécution du paiement
const executePayment = (req, res) => {
    const { paymentId, PayerID } = req.query;

    const execute_payment_json = {
        payer_id: PayerID
    };

    paypal.payment.execute(paymentId, execute_payment_json, (error, payment) => {
        if (error) {
            console.error(error);
            res.status(500).send('Erreur lors de l’exécution du paiement.');
        } else {
            res.send('Paiement effectué avec succès.');
        }
    });
};

// Annulation du paiement
const cancelPayment = (req, res) => {
    res.send('Paiement annulé.');
};

const axios = require('axios');


const initiatePayment = async (req, res) => {
    try {
        // Extraire les données du corps de la requête
        const {
            receiverWalletId,
            token = "TND",
            amount,
            type = "immediate",
            description,
            lifespan = 10,
            checkoutForm = true,
            addPaymentFeesToAmount = false,
            firstName,
            lastName,
            phoneNumber,
            email,
            orderId,
            webhook,
            silentWebhook = false,
            successUrl,
            failUrl,
            theme = "light"
        } = req.body;

        // Vérifier que les champs obligatoires sont présents
        if (!receiverWalletId || !amount || !firstName || !lastName || !phoneNumber || !email || !successUrl || !failUrl) {
            return res.status(400).json({ message: 'Certains champs obligatoires sont manquants.' });
        }

        // Construire les données de paiement
        const paymentData = {
            receiverWalletId,
            token,
            amount,
            type,
            description,
            lifespan,
            checkoutForm,
            addPaymentFeesToAmount,
            firstName,
            lastName,
            phoneNumber,
            email,
            orderId,
            webhook,
            silentWebhook,
            successUrl,
            failUrl,
            theme
        };
console.log("*******************************************************")
        // Requête POST à l'API Konnect
        const response = await axios.post(
            'https://api.konnect.network/api/v2/payments/init-payment',
            paymentData,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': '6755dcaa7b0aa74ffe21a7af:0KlEfL2UbNoTMngYIexPkB8nBII' // Remplacez par votre clé API
                }
            }
        );
        //console.log("Réponse de Konnect : ", response);


        // Réponse de succès
        if (response.status === 200 && response.data.payUrl) {
            return res.status(200).json({
                message: 'Paiement initié avec succès.',
                payUrl: response.data.payUrl // Retourne l'URL de paiement
            });
        }
        console.log("Réponse de Konnect : ", response);

        // Gérer les erreurs de l'API
        return res.status(400).json({
            message: 'Erreur lors de l’initiation du paiement.',
            data: response.data
        });
    } catch (error) {
        console.error('Erreur lors de la requête API :', error.message);
        res.status(500).json({
            message: 'Erreur serveur.',
            error: error.response?.data || error.message
        });
    }
};





module.exports ={
    executePayment ,cancelPayment ,createPayment ,initiatePayment
}