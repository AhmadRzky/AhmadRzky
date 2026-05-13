import 'dotenv/config';

const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === '') return defaultValue;
  return ['1', 'true', 'yes', 'y', 'on'].includes(String(value).toLowerCase());
};

const parsePositiveInteger = (value, defaultValue) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
};

const megabytesToBytes = (value, defaultValue) => parsePositiveInteger(value, defaultValue) * 1024 * 1024;

export const config = {
  openAiApiKey: process.env.OPENAI_API_KEY,
  openAiModel: process.env.OPENAI_MODEL || 'gpt-5.4-mini',
  imageProvider: (process.env.IMAGE_PROVIDER || 'pollinations').toLowerCase(),
  systemPrompt:
    process.env.BOT_SYSTEM_PROMPT ||
    'Kamu adalah asisten WhatsApp yang ramah, ringkas, dan membantu. Jawab dalam bahasa yang sama dengan pengguna.',
  botPrefix: process.env.BOT_PREFIX ?? '!',
  maxHistoryMessages: parsePositiveInteger(process.env.MAX_HISTORY_MESSAGES, 12),
  maxDownloadDurationSeconds: parsePositiveInteger(process.env.MAX_DOWNLOAD_DURATION_SECONDS, 600),
  maxAudioBytes: megabytesToBytes(process.env.MAX_AUDIO_MB, 25),
  maxVideoBytes: megabytesToBytes(process.env.MAX_VIDEO_MB, 45),
  replyFromMe: parseBoolean(process.env.REPLY_FROM_ME, false)
};

export const validateConfig = () => {
  const missing = [];

  if (!config.openAiApiKey) missing.push('OPENAI_API_KEY');

  if (missing.length > 0) {
    throw new Error(
      `Konfigurasi belum lengkap: ${missing.join(', ')}. Salin .env.example menjadi .env lalu isi nilainya.`
    );
  }
};
