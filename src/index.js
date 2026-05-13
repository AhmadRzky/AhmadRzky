import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  jidNormalizedUser,
  useMultiFileAuthState
} from 'baileys';
import Pino from 'pino';
import qrcode from 'qrcode-terminal';
import { generateReply, resetConversation } from './ai.js';
import { config, validateConfig } from './config.js';
import {
  getMessageText,
  hasBotMention,
  isGroupJid,
  isHelpCommand,
  isResetCommand,
  stripBotPrefix
} from './message-utils.js';

const logger = Pino({ level: process.env.LOG_LEVEL || 'info' });

const helpMessage = `Halo! Saya bot WhatsApp AI.\n\nCara pakai:\n- Chat pribadi: kirim pesan seperti biasa.\n- Grup: mention bot atau gunakan prefix "${config.botPrefix || '(tanpa prefix)'}".\n- ${config.botPrefix}reset: hapus memori percakapan chat ini.\n- ${config.botPrefix}help: tampilkan bantuan.`;

const shouldProcessMessage = (message, botJid) => {
  const remoteJid = message.key.remoteJid || '';
  const text = getMessageText(message);

  if (!text) return false;
  if (remoteJid === 'status@broadcast') return false;
  if (message.key.fromMe && !config.replyFromMe) return false;
  if (!isGroupJid(remoteJid)) return true;

  return text.startsWith(config.botPrefix) || hasBotMention(message, botJid);
};

const connectToWhatsApp = async () => {
  validateConfig();

  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const { version } = await fetchLatestBaileysVersion();
  const socket = makeWASocket({
    auth: state,
    logger,
    printQRInTerminal: false,
    version
  });

  socket.ev.on('creds.update', saveCreds);

  socket.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('Scan QR berikut dengan WhatsApp > Perangkat tertaut:');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      console.log('Bot WhatsApp AI berhasil terhubung.');
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      logger.warn({ statusCode, shouldReconnect }, 'Koneksi WhatsApp tertutup');

      if (shouldReconnect) {
        connectToWhatsApp().catch((error) => logger.error({ error }, 'Gagal reconnect'));
      } else {
        console.log('Sesi logout. Hapus folder auth lalu jalankan ulang untuk login lagi.');
      }
    }
  });

  socket.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const message of messages) {
      const remoteJid = message.key.remoteJid;
      const botJid = socket.user?.id ? jidNormalizedUser(socket.user.id) : undefined;

      if (!remoteJid || !shouldProcessMessage(message, botJid)) continue;

      const originalText = getMessageText(message);
      const botMentionTag = botJid ? `@${botJid.split('@')[0]}` : '';
      const textWithoutMention = botMentionTag ? originalText.replaceAll(botMentionTag, '') : originalText;
      const text = stripBotPrefix(textWithoutMention, config.botPrefix);

      try {
        if (isHelpCommand(text)) {
          await socket.sendMessage(remoteJid, { text: helpMessage }, { quoted: message });
          continue;
        }

        if (isResetCommand(text)) {
          resetConversation(remoteJid);
          await socket.sendMessage(remoteJid, { text: 'Memori percakapan chat ini sudah dihapus.' }, { quoted: message });
          continue;
        }

        await socket.sendPresenceUpdate('composing', remoteJid);
        const reply = await generateReply(remoteJid, text);
        await socket.sendPresenceUpdate('paused', remoteJid);
        await socket.sendMessage(remoteJid, { text: reply }, { quoted: message });
      } catch (error) {
        logger.error({ error }, 'Gagal memproses pesan');
        await socket.sendMessage(
          remoteJid,
          { text: 'Maaf, sedang ada kendala saat memproses pesan. Coba lagi sebentar ya.' },
          { quoted: message }
        );
      }
    }
  });
};

connectToWhatsApp().catch((error) => {
  logger.error({ error }, 'Bot gagal dijalankan');
  process.exit(1);
});
