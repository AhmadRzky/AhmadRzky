import makeWASocket, {
  DisconnectReason,
  downloadMediaMessage,
  fetchLatestBaileysVersion,
  jidNormalizedUser,
  useMultiFileAuthState
} from 'baileys';
import Pino from 'pino';
import qrcode from 'qrcode-terminal';
import { generateReply, resetConversation } from './ai.js';
import { parseCommand } from './commands.js';
import { config, validateConfig } from './config.js';
import {
  getMediaKind,
  getMessageText,
  hasBotMention,
  isGroupJid,
  isHelpCommand,
  isResetCommand,
  stripBotPrefix
} from './message-utils.js';
import {
  UserFacingError,
  bytesToMb,
  createTextSticker,
  downloadAudio,
  downloadVideo,
  imageToSticker,
  mediaLimits,
  videoToSticker
} from './media-utils.js';
import { generateImageBuffer } from './pollinations-image.js';

const logger = Pino({ level: process.env.LOG_LEVEL || 'info' });

const helpMessage = `Halo! Saya bot WhatsApp AI.\n\nCara pakai:\n- Chat pribadi: kirim pesan seperti biasa.\n- Grup: mention bot atau gunakan prefix "${config.botPrefix || '(tanpa prefix)'}".\n- ${config.botPrefix}gambar <prompt>: buat gambar AI.\n- ${config.botPrefix}sticker: ubah gambar/video caption menjadi sticker atau ${config.botPrefix}sticker <teks>.\n- ${config.botPrefix}music <url>: download audio via yt-dlp, maksimal ${Math.floor(mediaLimits.maxDurationSeconds / 60)} menit/${bytesToMb(mediaLimits.maxAudioBytes)}.\n- ${config.botPrefix}video <url>: download video via yt-dlp, maksimal ${bytesToMb(mediaLimits.maxVideoBytes)}.\n- ${config.botPrefix}reset: hapus memori percakapan chat ini.\n- ${config.botPrefix}help: tampilkan bantuan.`;


const downloadQuotedOrCurrentMedia = async (socket, message) =>
  downloadMediaMessage(
    message,
    'buffer',
    {},
    {
      logger,
      reuploadRequest: socket.updateMediaMessage
    }
  );

const handleCommand = async ({ socket, remoteJid, message, command }) => {
  if (isHelpCommand(command.name)) {
    await socket.sendMessage(remoteJid, { text: helpMessage }, { quoted: message });
    return;
  }

  if (isResetCommand(command.name)) {
    resetConversation(remoteJid);
    await socket.sendMessage(remoteJid, { text: 'Memori percakapan chat ini sudah dihapus.' }, { quoted: message });
    return;
  }

  if (command.name === 'gambar' || command.name === 'image') {
    if (!command.args) {
      throw new UserFacingError(`Tulis prompt gambar, contoh: ${config.botPrefix}gambar kucing astronot di bulan`);
    }

    await socket.sendMessage(remoteJid, { text: 'Sedang membuat gambar AI gratis via Pollinations...' }, { quoted: message });

    try {
      const imageBuffer = await generateImageBuffer(command.args, config.imageProvider);
      await socket.sendMessage(remoteJid, { image: imageBuffer, caption: `Hasil: ${command.args}` }, { quoted: message });
    } catch (error) {
      throw new UserFacingError(`Gagal generate gambar AI: ${error.message || 'terjadi kesalahan tidak diketahui.'}`);
    }

    return;
  }

  if (command.name === 'sticker') {
    const mediaKind = getMediaKind(message);
    let stickerBuffer;

    if (mediaKind === 'image') {
      const media = await downloadQuotedOrCurrentMedia(socket, message);
      stickerBuffer = await imageToSticker(media);
    } else if (mediaKind === 'video') {
      const media = await downloadQuotedOrCurrentMedia(socket, message);
      stickerBuffer = await videoToSticker(media);
    } else if (command.args) {
      stickerBuffer = await createTextSticker(command.args);
    } else {
      throw new UserFacingError(
        `Kirim gambar/video dengan caption ${config.botPrefix}sticker, atau ketik ${config.botPrefix}sticker teks kamu.`
      );
    }

    await socket.sendMessage(remoteJid, { sticker: stickerBuffer }, { quoted: message });
    return;
  }

  if (command.name === 'music') {
    if (!command.args) {
      throw new UserFacingError(`Kirim URL, contoh: ${config.botPrefix}music https://youtu.be/...`);
    }

    await socket.sendMessage(remoteJid, { text: 'Sedang download audio. Mohon tunggu...' }, { quoted: message });
    const audio = await downloadAudio(command.args);
    await socket.sendMessage(
      remoteJid,
      { audio: audio.buffer, mimetype: audio.mimeType, fileName: `${audio.title}.mp3` },
      { quoted: message }
    );
    return;
  }

  if (command.name === 'video') {
    if (!command.args) {
      throw new UserFacingError(`Kirim URL, contoh: ${config.botPrefix}video https://www.instagram.com/reel/...`);
    }

    await socket.sendMessage(remoteJid, { text: 'Sedang download video. Mohon tunggu...' }, { quoted: message });
    const video = await downloadVideo(command.args);
    await socket.sendMessage(
      remoteJid,
      { video: video.buffer, mimetype: video.mimeType, fileName: `${video.title}.mp4`, caption: video.title },
      { quoted: message }
    );
  }
};

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
      const cleanedText = textWithoutMention.trim();

      try {
        const command = parseCommand(cleanedText);

        if (command) {
          await handleCommand({ socket, remoteJid, message, command });
          continue;
        }

        const text = stripBotPrefix(cleanedText, config.botPrefix);
        await socket.sendPresenceUpdate('composing', remoteJid);
        const reply = await generateReply(remoteJid, text);
        await socket.sendPresenceUpdate('paused', remoteJid);
        await socket.sendMessage(remoteJid, { text: reply }, { quoted: message });
      } catch (error) {
        logger.error({ error }, 'Gagal memproses pesan');
        await socket.sendMessage(
          remoteJid,
          { text: error instanceof UserFacingError ? error.message : 'Maaf, sedang ada kendala saat memproses pesan. Coba lagi sebentar ya.' },
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
