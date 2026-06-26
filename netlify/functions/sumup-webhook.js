// ============================================================
// 💳 SumUp — Webhook (réceptionne les notifications de paiement)
// ============================================================
// Quand un paiement est terminé sur le Solo (PAID ou FAILED),
// SumUp appelle cette URL. On met à jour Supabase.
// ============================================================

const SUPABASE_URL = 'https://szpgbdnijyoquqmjhhjj.supabase.co';

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
    
    if (!SUPABASE_SERVICE_KEY) {
      console.error('SUPABASE_SERVICE_KEY manquante');
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, erreur: 'Config DB' }) };
    }

    // SumUp peut envoyer en POST (webhook body) ou en GET (return_url avec query)
    let payload = {};
    if (event.httpMethod === 'POST' && event.body) {
      payload = JSON.parse(event.body);
    } else if (event.queryStringParameters) {
      payload = event.queryStringParameters;
    }

    // Log complet pour debug
    console.log('Webhook SumUp reçu:', JSON.stringify({ 
      method: event.httpMethod,
      payload,
      query: event.queryStringParameters 
    }));

    // Extraire les infos clés
    // SumUp peut envoyer différents formats selon le contexte
    const clientTransactionId = 
      payload.client_transaction_id || 
      payload.transaction_id || 
      payload.event?.client_transaction_id ||
      payload.data?.client_transaction_id;
    
    const reference = 
      payload.foreign_transaction_id || 
      payload.ref || 
      payload.checkout_reference;
    
    // Statut : peut être 'successful', 'failed', 'paid', etc
    let statut = (
      payload.status || 
      payload.transaction_status || 
      payload.event_type || 
      payload.data?.status || 
      ''
    ).toUpperCase();

    // Normaliser le statut
    if (statut.includes('SUCC') || statut.includes('PAID') || statut === 'PAYMENT_SUCCESS') {
      statut = 'PAID';
    } else if (statut.includes('FAIL') || statut.includes('CANCEL') || statut.includes('DECLIN')) {
      statut = 'FAILED';
    } else if (!statut) {
      statut = 'UNKNOWN';
    }

    // Trouver le paiement par client_transaction_id OU par reference
    let filterUrl = '';
    if (clientTransactionId) {
      filterUrl = 'client_transaction_id=eq.' + encodeURIComponent(clientTransactionId);
    } else if (reference) {
      filterUrl = 'reference=eq.' + encodeURIComponent(reference);
    } else {
      console.error('Pas de client_transaction_id ni reference pour identifier');
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, msg: 'Pas d\'identifiant' }) };
    }

    // UPDATE le paiement dans Supabase
    const updateResp = await fetch(
      SUPABASE_URL + '/rest/v1/paiements_sumup?' + filterUrl,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          statut: statut,
          raw_webhook: payload,
          maj_le: new Date().toISOString()
        })
      }
    );

    const updateData = await updateResp.json();
    console.log('Update DB:', JSON.stringify(updateData));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, statut, updated: updateData })
    };

  } catch (e) {
    console.error('Erreur webhook:', e);
    // On renvoie 200 quand même pour éviter que SumUp réessaie en boucle
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: false, erreur: e.message })
    };
  }
};
