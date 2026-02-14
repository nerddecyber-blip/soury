const express = require("express");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");

const P = require("pino");
const fs = require("fs");
const path = require("path");

const app = express();
app.get("/pair/:number", async (req, res) => {
    const phoneNumber = req.params.number;

    if (!phoneNumber) {
        return res.status(400).json({ error: "Phone number required" });
    }

    try {
        const code = await createSession(process.env.SESSION_ID || "default", phoneNumber);
        res.json({ pairing_code: code });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to generate pairing code" });
    }
});

app.use(express.json());

async function createSession(number, res) {
  const sessionPath = path.join(__dirname, "sessions", number);

  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: P({ level: "silent" }),
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection } = update;

    if (connection === "open") {
      console.log("Connected:", number);
    }
  });

  const code = await sock.requestPairingCode(number);

  res.json({
    status: "Pairing code generated",
    number: number,
    code: code,
  });
}

app.get("/", (req, res) => {
  res.send("Soury Multi-Session Bot is Running");
});

app.get("/pair/:number", async (req, res) => {
  try {
    const number = req.params.number;
    await createSession(number, res);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to generate pairing code" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
app.listen(process.env.PORT || 3000, () => {
    console.log("Server running...");
});

