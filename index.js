const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const crypto = require("crypto");

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const MEXC_API_KEY = process.env.MEXC_API_KEY;
const MEXC_SECRET_KEY = process.env.MEXC_SECRET_KEY;

const bot = new TelegramBot(TELEGRAM_TOKEN);

// ====== TELEGRAM MESSAGE ======
async function sendTelegram(text) {
    try {
        const chatId = process.env.CHAT_ID;
        if (!chatId) return;
        await bot.sendMessage(chatId, text);
    } catch (err) {
        console.log("Telegram error:", err.message);
    }
}

// ====== OPEN LONG FUNCTION ======
async function openLong(symbol) {
    try {
        const timestamp = Date.now();
        const quantity = 10; // 10 USDT фиксировано

        const params = symbol=${symbol}&side=BUY&type=MARKET&quantity=${quantity}&timestamp=${timestamp};
        const signature = crypto
            .createHmac("sha256", MEXC_SECRET_KEY)
            .update(params)
            .digest("hex");

        const url = https://contract.mexc.com/api/v1/private/order/submit?${params}&signature=${signature};

        const response = await axios.post(url, {}, {
            headers: {
                "X-MEXC-APIKEY": MEXC_API_KEY
            }
        });

        await sendTelegram(`✅ LONG открыт: ${symbol}`);
        console.log("Order success:", response.data);

    } catch (err) {
        console.log("Order error:", err.response?.data || err.message);
        await sendTelegram("❌ Ошибка открытия сделки");
    }
}

// ====== WEBHOOK FROM TRADINGVIEW ======
app.post(`/bot${TELEGRAM_TOKEN}`, async (req, res) => {

    const body = req.body;

    if (body.action === "open" && body.side === "long") {
        await openLong(body.symbol);
    }

    if (body.action === "close") {
        await sendTelegram(`🔴 Закрытие сигнала: ${body.symbol}`);
    }

    res.sendStatus(200);
});

// ====== ROOT CHECK ======
app.get("/", (req, res) => {
    res.send("MEXC Autobot is running 🚀");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
