// netlify/functions/chat.js
// Le "Directeur IA" de Gin Khao — parle à Claude en gardant la clé secrète

export default async (req) => {
  const { message, historique } = await req.json();

  const systemPrompt = `Tu es le Directeur IA du restaurant Gin Khao, une street food thaï à Saint Just, Marseille.
Tu agis comme directeur des opérations, analyste financier et consultant croissance.
Ton objectif : faire gagner du temps au patron, augmenter le chiffre d'affaires, améliorer les marges.
Réponds de façon courte, concrète, orientée action et rentabilité, en français.
Quand c'est pertinent, structure avec : résumé, problèmes détectés, actions prioritaires, impact estimé en euros.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        ...(historique || []),
        { role: "user", content: message }
      ]
    })
  });

  const data = await response.json();
  const reponseIA = data.content?.[0]?.text || "Désolé, je n'ai pas pu répondre.";

  return new Response(JSON.stringify({ reponse: reponseIA }), {
    headers: { "Content-Type": "application/json" }
  });
};
