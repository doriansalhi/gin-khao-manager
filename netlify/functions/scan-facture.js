// netlify/functions/scan-facture.js
// Lit une photo de facture et en extrait les montants

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ status: "Scan facture actif ✅" }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const { image, mediaType } = await req.json();
    if (!image) {
      return new Response(JSON.stringify({ erreur: "Aucune image reçue." }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    const prompt = `Tu es un assistant comptable. Analyse cette facture fournisseur et extrais les informations.
Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour ni backticks, au format exact :
{
  "fournisseur": "nom du fournisseur",
  "date": "JJ/MM/AAAA",
  "montant_ht": 0.00,
  "tva": 0.00,
  "montant_ttc": 0.00,
  "categorie": "une parmi : Alimentaire, Boissons, Emballages, Énergie, Loyer, Matériel, Services, Autre"
}
Si une information est absente, mets null. Les montants sont des nombres sans symbole €.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 512,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType || "image/jpeg", data: image } },
            { type: "text", text: prompt }
          ]
        }]
      })
    });

    const data = await response.json();
    if (data.error) {
      return new Response(JSON.stringify({ erreur: data.error.message }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    let texte = (data.content?.[0]?.text || "{}").replace(/```json|```/g, "").trim();
    let facture;
    try { facture = JSON.parse(texte); }
    catch { return new Response(JSON.stringify({ erreur: "Lecture impossible", brut: texte }), { headers: { "Content-Type": "application/json" } }); }

    return new Response(JSON.stringify({ facture }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ erreur: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
