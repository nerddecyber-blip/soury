const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");

const P = require("pino");
const fs = require("fs");

async function startBot(session) {
  const { state, saveCreds } = await useMultiFileAuthState(
    `./sessions/${session}`
  );

  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: P({ level: "silent" }),
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, qr } = update;

    if (qr) {
      console.log(`Scan QR for session: ${session}`);
    }

    if (connection === "open") {
      console.log(`Bot connected for: ${session}`);
    }
  });

  sock.ev.on("messages.upsert", async (m) => {
    const msg = m.messages[0];
    if (!msg.message) return;

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text;

    const from = msg.key.remoteJid;

    if (text === ".ping") {
      await sock.sendMessage(from, { text: "Bot is alive!" });
    }
  });
}

function startAllSessions() {
  if (!fs.existsSync("./sessions")) fs.mkdirSync("./sessions");

  const sessions = fs.readdirSync("./sessions");

  sessions.forEach((session) => {
    startBot(session);
  });
}

startAllSessions();
