const express = require("express");
const fs = require("fs");
const path = require("path");
const {
  default: makeWASocket,
  useMultiFileAuthState,
} = require("@whiskeysockets/baileys");

const app = express();
app.use(express.json());

const sessions = {};

async function startSession(id, res) {
  const sessionPath = path.join(__dirname, "sessions", id);

  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, pairingCode } = update;

    if (pairingCode) {
      res.json({
        code: pairingCode,
      });
    }

    if (connection === "open") {
      console.log("User connected:", id);
    }

    if (connection === "close") {
      console.log("User disconnected:", id);
    }
  });

  await sock.requestPairingCode(id);
}

app.get("/", (req, res) => {
  res.send("Bot is running");
});

app.get("/pair/:number", async (req, res) => {
  const number = req.params.number;

  try {
    await startSession(number, res);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Pairing failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
