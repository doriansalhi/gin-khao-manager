// ============================================================
// 💳 SumUp — Création d'une session de paiement
// ============================================================
// Cette fonction est appelée par la borne quand le client choisit
// "Paiement terminal". Elle crée un "checkout" SumUp et renvoie
// l'ID, que la borne utilise pour suivre le statut.
//
// Variables d'environnement requises (à mettre dans Netlify) :
//   - SUMUP_API_KEY      : ta clé secrète SumUp (sk_live_xxxx)
//   - SUMUP_MERCHANT_CODE : ton code marchand SumUp (ex: MQXXXXX)
// ============================================================

exports.handler = async (event, context) => {
  // CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ ok: false, erreur: 'Méthode non autorisée' })
    };
  }

  try {
    // 1. Récupérer config env
    const SUMUP_API_KEY = process.env.SUMUP_API_KEY;
    const SUMUP_MERCHANT_CODE = process.env.SUMUP_MERCHANT_CODE;
    
    if (!SUMUP_API_KEY || !SUMUP_MERCHANT_CODE) {
      throw new Error('Configuration SumUp manquante (SUMUP_API_KEY ou SUMUP_MERCHANT_CODE)');
    }

    // 2. Parser le body envoyé par la borne
    const { montant, description, return_url } = JSON.parse(event.body);
    
    if (!montant || isNaN(parseFloat(montant)) || parseFloat(montant) <= 0) {
      throw new Error('Montant invalide');
    }

    // 3. Générer un identifiant unique pour cette commande
    // (sert de référence côté SumUp pour réconcilier les ventes)
    const referenceId = 'GINKHAO-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);

    // 4. Appel à l'API SumUp Checkouts
    // Docs : https://developer.sumup.com/api/checkouts/v1
    const sumupResponse = await fetch('https://api.sumup.com/v0.1/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + SUMUP_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        checkout_reference: referenceId,
        amount: parseFloat(montant),
        currency: 'EUR',
        merchant_code: SUMUP_MERCHANT_CODE,
        description: description || 'Gin Khao - Borne',
        return_url: return_url || ''
      })
    });

    const sumupData = await sumupResponse.json();

    if (!sumupResponse.ok) {
      console.error('Erreur SumUp:', sumupData);
      throw new Error(sumupData.message || 'Erreur API SumUp : ' + sumupResponse.status);
    }

    // 5. Renvoyer l'ID checkout à la borne
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        checkout_id: sumupData.id,
        reference: referenceId,
        amount: sumupData.amount,
        currency: sumupData.currency,
        status: sumupData.status
      })
    };

  } catch (e) {
    console.error('Erreur lancement checkout:', e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, erreur: e.message })
    };
  }
};
