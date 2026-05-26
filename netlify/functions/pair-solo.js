// netlify/functions/pair-solo.js
// Associe un lecteur Solo (réel ou virtuel) au compte SumUp via la Cloud API.
// Utilisation : ouvrir dans le navigateur
//   /.netlify/functions/pair-solo?code=LE_CODE_APPAIRAGE
//
// Utilise les clés SANDBOX (_TEST) pour les tests.
// Renvoie le Reader ID à noter pour la suite.

exports.handler = async function (event) {
  const API_KEY = process.env.SUMUP_API_KEY_TEST;       // clé API sandbox
  const MERCHANT_CODE = 'MQBD65RS';                      // merchant code sandbox

  // Récupère le code d'appairage depuis l'URL (?code=...)
  const pairingCode = event.queryStringParameters && event.queryStringParameters.code;

  if (!API_KEY) {
    return json(500, { ok: false, etape: 'config', message: "SUMUP_API_KEY_TEST manquante dans Netlify." });
  }
  if (!pairingCode) {
    return json(400, { ok: false, etape: 'code', message: "Ajoute ?code=TON_CODE dans l'URL." });
  }

  try {
    const reponse = await fetch(
      `https://api.sumup.com/v0.1/merchants/${MERCHANT_CODE}/readers`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pairing_code: pairingCode,
          name: 'Solo Test Gin Khao'
        })
      }
    );

    const data = await reponse.json();

    if (!reponse.ok) {
      return json(200, {
        ok: false,
        etape: 'pairing',
        statut_http: reponse.status,
        message: "Le pairing a échoué (code expiré ? déjà utilisé ?).",
        details: data
      });
    }

    return json(200, {
      ok: true,
      message: 'Lecteur associé ✅',
      reader_id: data.id || '(voir details)',
      details: data
    });
  } catch (e) {
    return json(500, { ok: false, etape: 'reseau', message: 'Erreur réseau : ' + e.message });
  }
};

function json(statusCode, obj) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) };
}
