// netlify/functions/imprimer-ticket.js
// ============================================================
// Envoi du ticket cuisine au serveur d'impression local du resto
// ============================================================
// Le serveur d'impression Node.js tourne au resto sur une IP fixe.
// Cette fonction lui transmet le ticket via HTTP.
//
// Variable d'environnement requise :
//   PRINT_SERVER_URL = http://192.168.1.XX:3000/print
//   (ou autre IP locale du serveur d'impression)
// ============================================================

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return jsonResp(405, { ok: false, erreur: 'Method not allowed' });
  }

  const PRINT_URL = process.env.PRINT_SERVER_URL;
  if (!PRINT_URL) {
    console.log('⚠️ PRINT_SERVER_URL non configurée — impression désactivée (non bloquant)');
    return jsonResp(200, { ok: true, message: 'Impression désactivée (PRINT_SERVER_URL absente)' });
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return jsonResp(400, { ok: false, erreur: 'JSON invalide' }); }

  try {
    const res = await fetch(PRINT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vente_id: body.vente_id,
        numero: body.numero,
        mode_service: body.mode_service,
        origine: body.origine || 'caisse',
        client_nom: body.client_nom || null,
        lignes: body.lignes || [],
        cree_le: new Date().toISOString()
      }),
      // Timeout court : si le serveur d'impression est down, on ne bloque pas la borne
      signal: AbortSignal.timeout(5000)
    });

    const result = await res.text();
    return jsonResp(200, { ok: true, status: res.status, result });

  } catch (e) {
    // On retourne OK même en cas d'erreur d'impression pour ne pas bloquer la vente
    console.error('Impression KO:', e.message);
    return jsonResp(200, { ok: false, erreur: e.message, message: 'Vente enregistrée mais impression échouée' });
  }
};

function jsonResp(code, obj) {
  return {
    statusCode: code,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(obj)
  };
}
