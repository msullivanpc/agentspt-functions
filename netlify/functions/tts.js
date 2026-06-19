// netlify/functions/tts.js
// Grok TTS proxy — keeps XAI_API_KEY server-side
// Voice: ara (warm, friendly, conversational)
// Deploy: drop this file into netlify/functions/ in your repo

export async function handler(event) {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let text;
  try {
    const body = JSON.parse(event.body);
    text = (body.text || "").trim();
  } catch (e) {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  if (!text) {
    return { statusCode: 400, body: "No text provided" };
  }

  // Truncate to 4000 chars just in case
  text = text.substring(0, 4000);

  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: "XAI_API_KEY not configured" };
  }

  try {
    const response = await fetch("https://api.x.ai/v1/tts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text:     text,
        voice_id: "ara",
        language: "en"
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("xAI TTS error:", response.status, errText);
      return { statusCode: response.status, body: "TTS API error: " + errText };
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString("base64");

    return {
      statusCode: 200,
      headers: {
        "Content-Type":  "audio/mpeg",
        "Cache-Control": "no-store"
      },
      body:            base64Audio,
      isBase64Encoded: true
    };

  } catch (err) {
    console.error("TTS fetch failed:", err.message);
    return { statusCode: 500, body: "Internal error: " + err.message };
  }
}
