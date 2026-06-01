// netlify/functions/envoyer-sms.js
// ============================================================
// Envoie un SMS via l'API Brevo (anciennement Sendinblue)
// ============================================================
// Appel attendu : POST /.netlify/functions/envoyer-sms
// Body JSON : { "numero": "0612345678", "texte": "...", "expediteur": "GinKhao" }
// Retour : { ok: true, messageId: "...", numero: "..." } ou { ok: false, erreur: "..." }
// ============================================================

exports.handler = async function (event) {
  // CORS pour appel depuis l'app
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
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, erreur: 'Méthode non autorisée' }) };
  }

  try {
    const { numero, texte, expediteur } = JSON.parse(event.body || '{}');

    // Validations
    if (!numero) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, erreur: 'Numéro manquant' }) };
    }
    if (!texte || texte.trim().length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, erreur: 'Texte vide' }) };
    }
    if (texte.length > 612) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, erreur: 'SMS trop long (max 612 caractères)' }) };
    }

    // Vérifier que la clé API Brevo est bien configurée
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, erreur: 'BREVO_API_KEY non configurée dans Netlify' }) };
    }

    // Nettoyer le numéro : retirer espaces, tirets, points
    let numeroClean = numero.replace(/[\s\-\.\(\)]/g, '');

    // Convertir au format international (E.164) : +33...
    if (numeroClean.startsWith('0')) {
      numeroClean = '+33' + numeroClean.substring(1);
    } else if (!numeroClean.startsWith('+')) {
      numeroClean = '+' + numeroClean;
    }

    // Validation basique du format
    if (!/^\+\d{10,15}$/.test(numeroClean)) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, erreur: 'Format de numéro invalide : ' + numeroClean }) };
    }

    // Nom de l'expéditeur (max 11 caractères alphanumériques sans accents)
    const sender = (expediteur || 'GinKhao').replace(/[^a-zA-Z0-9]/g, '').slice(0, 11);

    // Appel API Brevo
    const reponseAPI = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: sender,
        recipient: numeroClean,
        content: texte,
        type: 'transactional', // SMS transactionnel (vs marketing)
        unicodeEnabled: true   // pour gérer les accents et emojis
      })
    });

    const dataAPI = await reponseAPI.json();

    if (!reponseAPI.ok) {
      console.error('Erreur Brevo:', dataAPI);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          ok: false,
          erreur: dataAPI.message || dataAPI.code || 'Erreur Brevo inconnue',
          details: dataAPI
        })
      };
    }

    // Succès
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        messageId: dataAPI.messageId,
        reference: dataAPI.reference,
        numero: numeroClean,
        cout: dataAPI.smsCount,
        usage: dataAPI.usage
      })
    };
  } catch (e) {
    console.error('Exception envoyer-sms:', e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, erreur: e.message })
    };
  }
};
