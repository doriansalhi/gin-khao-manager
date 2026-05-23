// netlify/functions/upload-facture.js
// Dépose l'image sur Drive + ajoute une ligne dans le Google Sheet
import { google } from "googleapis";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ status: "Upload Drive + Sheet actif ✅" }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const { image, mediaType, nom, facture } = await req.json();
    if (!image) {
      return new Response(JSON.stringify({ erreur: "Aucune image reçue." }), { headers: { "Content-Type": "application/json" } });
    }

    // Authentification (ton compte Google)
    const oauth2 = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      "https://developers.google.com/oauthplayground"
    );
    oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

    // 1) Dépôt de l'image sur Drive
    const drive = google.drive({ version: "v3", auth: oauth2 });
    const buffer = Buffer.from(image, "base64");
    const { Readable } = await import("stream");
    const stream = Readable.from(buffer);

    const fichier = await drive.files.create({
      requestBody: {
        name: nom || `facture-${Date.now()}.jpg`,
        parents: [process.env.GDRIVE_FOLDER_ID]
      },
      media: { mimeType: mediaType || "image/jpeg", body: stream },
      fields: "id, name, webViewLink"
    });
    const lien = fichier.data.webViewLink;

    // 2) Ajout d'une ligne dans le Google Sheet
    const f = facture || {};
    const sheets = google.sheets({ version: "v4", auth: oauth2 });
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GSHEET_ID,
      range: "A:H",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[
          f.date || "",
          f.fournisseur || "",
          f.categorie || "",
          f.montant_ht ?? "",
          f.tva ?? "",
          f.montant_ttc ?? "",
          lien,
          new Date().toLocaleString("fr-FR")
        ]]
      }
    });

    console.log("SUCCÈS ! Image + ligne Sheet ajoutées.");
    return new Response(JSON.stringify({ ok: true, lien }), { headers: { "Content-Type": "application/json" } });

  } catch (err) {
    console.log("❌ ERREUR:", err.message);
    return new Response(JSON.stringify({ erreur: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};
