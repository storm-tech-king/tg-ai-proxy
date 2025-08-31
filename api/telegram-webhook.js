// api/telegram-webhook.js
import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  // проверка секрета от Telegram (совпадает с secret_token при setWebhook)
  const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (SECRET && req.headers["x-telegram-bot-api-secret-token"] !== SECRET) {
    return res.status(401).end();
  }

  const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TG_API = `https://api.telegram.org/bot${TG_TOKEN}`;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

  try {
    const update = req.body;
    const msg = update?.message;
    if (!msg) return res.status(200).end();

    const chatId = msg.chat.id;
    const userText = msg.text || msg.caption || "";

    // запрос к OpenAI
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: "Ты честный и краткий русскоязычный ассистент." },
        { role: "user", content: userText }
      ],
      max_tokens: 600
    });

    const ai = completion.choices?.[0]?.message?.content?.trim()
      || "Не удалось получить ответ.";

    // ответ в Telegram
    await fetch(`${TG_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: ai,
        reply_parameters: { message_id: msg.message_id }
      })
    });

    res.status(200).end();
  } catch (e) {
    console.error(e);
    res.status(500).end();
  }
}
