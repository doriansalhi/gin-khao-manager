// netlify/functions/sumup-check-status.js
// ============================================================
// SumUp — Vérification du statut d'un checkout (polling)
// ============================================================

exports.handler = async function (event) {
  const SUMUP_API_KEY = process.env.SUMUP_API_KEY;
  if (!SUMUP_API_KEY) return jsonResp(500, { erreur: 'SUMUP_API_KEY manquante' });

  const checkoutId = (event.queryStringParameters || {}).checkout_id;
  if (!checkoutId) return jsonResp(400, { erreur: 'checkout_id manquant' });

  try {
    const res = await fetch('https://api.sumup.com/v0.1/checkouts/' + encodeURIComponent(checkoutId), {
      headers: { 'Authorization': 'Bearer ' + SUMUP_API_KEY }
    });

    const data = await res.json();
    if (!res.ok) {
      return jsonResp(500, { erreur: data.message || 'Erreur SumUp' });
    }

    // Statuts SumUp : PENDING, PAID, FAILED, EXPIRED
    return jsonResp(200, {
      statut: data.status,
      transaction_id: data.transaction_id || null,
      transaction_code: data.transaction_code || null,
      amount: data.amount,
      currency: data.currency
    });

  } catch (e) {
    return jsonResp(500, { erreur: e.message });
  }
};

function jsonResp(code, obj) {
  return {
    statusCode: code,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(obj)
  };
}
