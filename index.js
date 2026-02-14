const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const fs = require("fs");
const ytdl = require("ytdl-core");
const config = require("./config");

let db = JSON.parse(fs.readFileSync("./database.json"));
function saveDB() {
  fs.writeFileSync("./database.json", JSON.stringify(db, null, 2));
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("session");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    auth: state,
  });

  if (!sock.authState.creds.registered) {
  const phone = process.env.PHONE_NUMBER || "255682738351";
  const code = await sock.requestPairingCode(phone);
  console.log("Pairing Code:", code);
}


  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) startBot();
    } else if (connection === "open") {
      console.log("SOURY connected");
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;

    const from = msg.key.remoteJid;

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    // DATABASE
    if (!db.users[from]) {
      db.users[from] = { messages: 0 };
    }
    db.users[from].messages += 1;
    saveDB();

    if (!text.startsWith(config.prefix)) return;

    const args = text.slice(config.prefix.length).trim().split(" ");
    const cmd = args.shift().toLowerCase();

    // MENU
    if (cmd === "menu") {
      await sock.sendMessage(from, {
        image: fs.readFileSync("./menu.jpg"),
        caption: `🤖 *${config.botName}*

Commands:
.menu
.ping
.play <link>
.yt <link>
.owner
`,
      });
    }

    // PING
    if (cmd === "ping") {
      await sock.sendMessage(from, { text: "pong" });
    }

    // OWNER
    if (cmd === "owner") {
      await sock.sendMessage(from, {
        text: `Owner: wa.me/${config.ownerNumber}`,
      });
    }

    // PLAY
    if (cmd === "play") {
      if (!args[0]) {
        return sock.sendMessage(from, { text: "Send YouTube link" });
      }

      const url = args[0];

      try {
        const file = `song_${Date.now()}.mp3`;
        const stream = ytdl(url, { filter: "audioonly" });

        stream.pipe(fs.createWriteStream(file)).on("finish", async () => {
          await sock.sendMessage(from, {
            audio: fs.readFileSync(file),
            mimetype: "audio/mp4",
          });
          fs.unlinkSync(file);
        });
      } catch (e) {
        sock.sendMessage(from, { text: "Download error" });
      }
    }

    // YT VIDEO
    if (cmd === "yt") {
      if (!args[0]) {
        return sock.sendMessage(from, { text: "Send YouTube link" });
      }

      const url = args[0];

      try {
        const file = `video_${Date.now()}.mp4`;
        const stream = ytdl(url, { quality: "18" });

        stream.pipe(fs.createWriteStream(file)).on("finish", async () => {
          await sock.sendMessage(from, {
            video: fs.readFileSync(file),
          });
          fs.unlinkSync(file);
        });
      } catch (e) {
        sock.sendMessage(from, { text: "Download error" });
      }
    }
  });
}

startBot();
