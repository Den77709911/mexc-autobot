const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const crypto = require("crypto");

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const MEXC_API_KEY = process.env.MEXC_API_KEY;
const MEXC_SECRET_KEY = process.env.MEXC_SECRET_KEY;
const CHAT_ID = process.env.CHAT_ID;

const bot = new TelegramBot(TELEGRAM_TOKEN);

// ===== TELEGRAM SEND =====
async function sendTelegram(text) {
    if (!CHAT_ID) return;
    try {
        await bot.sendMessage(CHAT_ID, text);
    } catch (err) {
        console.log("Telegram error:", err.message);
    }
}

// ===== OPEN LONG =====
async function openLong(symbol) {
    try {
        const timestamp = Date.now();
        const quantity = 1;

        const query = "symbol=${symbol}&side=BUY&type=MARKET&quantity=${quantity}&timestamp=${timestamp};

        const signature = crypto
            .createHmac("sha256", MEXC_SECRET_KEY)
            .update(query)
            .digest("hex");

        const url = https://contract.mexc.com/api/v1/private/order/submit?${query}&signature=${signature};

        await axios.post(url, {}, {
            headers: {
                "X-MEXC-APIKEY": MEXC_API_KEY
            }
        });

        await sendTelegram("✅ LONG открыт: " + symbol);

    } catch (err) {
        console.log(err.response?.data || err.message);
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
        await sendTelegram("🔴 Закрытие сигнала: " + body.symbol);
    }

    res.sendStatus(200);
});

app.get("/", (req, res) => {
    res.send("Bot is running 🚀");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
