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
app.use(express.json());

async function createSession(number) {
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

  const code = await sock.requestPairingCode(number);
  return code;
}

app.get("/", (req, res) => {
  res.send("Soury Bot is Running ✅");
});

app.get("/pair/:number", async (req, res) => {
  try {
    const number = req.params.number;
    const code = await createSession(number);

    res.json({
      success: true,
      number,
      code,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
