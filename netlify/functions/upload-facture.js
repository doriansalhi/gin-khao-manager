// netlify/functions/upload-facture.js
import { google } from "googleapis";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ status: "Upload Drive actif ✅" }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const { image, mediaType, nom } = await req.json();
    if (!image) {
      return new Response(JSON.stringify({ erreur: "Aucune image reçue." }), { headers: { "Content-Type": "application/json" } });
    }

    // Authentification avec TON compte Google (via refresh token)
    const oauth2 = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      "https://developers.google.com/oauthplayground"
    );
    oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

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

    console.log("SUCCÈS ! Fichier:", fichier.data.id);
    return new Response(JSON.stringify({ ok: true, id: fichier.data.id, lien: fichier.data.webViewLink }), { headers: { "Content-Type": "application/json" } });

  } catch (err) {
    console.log("❌ ERREUR:", err.message);
    return new Response(JSON.stringify({ erreur: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};
