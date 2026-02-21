const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
app.use(express.json());

// ENV
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const MEXC_API_KEY = process.env.MEXC_API_KEY;
const MEXC_SECRET_KEY = process.env.MEXC_SECRET_KEY;

const bot = new TelegramBot(TELEGRAM_TOKEN);

// ===== TELEGRAM =====
async function sendTelegram(text) {
  if (!CHAT_ID) return;
  try {
    await bot.sendMessage(CHAT_ID, text);
  } catch (err) {
    console.log("Telegram error:", err.response?.data || err.message);
  }
}

// ===== SIGN FUNCTION FOR MEXC =====
function createSignature(timestamp, body) {
  const signString = timestamp + JSON.stringify(body);
  return crypto
    .createHmac("sha256", MEXC_SECRET_KEY)
    .update(signString)
    .digest("hex");
}

// ===== OPEN LONG =====
async function openLong(symbol) {
  try {
    const cleanSymbol = symbol.replace(".P", "");
    const timestamp = Date.now().toString();

    const body = {
      symbol: cleanSymbol,
      price: 0,            // 0 = market
      vol: 1,              // 1 контракт (измени если нужно)
      leverage: 5,         // плечо
      side: 1,             // 1 = open long
      type: 1,             // 1 = market
      openType: 1          // 1 = isolated
    };

    const signature = createSignature(timestamp, body);

    const response = await axios.post(
      "https://contract.mexc.com/api/v1/private/order/submit",
      body,
      {
        headers: {
          "ApiKey": MEXC_API_KEY,
          "Request-Time": timestamp,
          "Signature": signature,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("Order success:", response.data);
    await sendTelegram("✅ LONG открыт: " + cleanSymbol);

  } catch (err) {
    console.log("Order error:", err.response?.data || err.message);
    await sendTelegram("❌ Ошибка открытия сделки");
  }
}

// ===== WEBHOOK =====
app.post(`/bot${TELEGRAM_TOKEN}`, async (req, res) => {
  const body = req.body;

  if (body.action === "open" && body.side === "long") {
    await openLong(body.symbol);
  }

  if (body.action === "close") {
    await sendTelegram("🔴 Сигнал закрытия: " + body.symbol);
  }

  res.sendStatus(200);
});

// ===== ROOT =====
app.get("/", (req, res) => {
  res.send("Bot is running 🚀");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
