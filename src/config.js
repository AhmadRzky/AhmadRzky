import 'dotenv/config';

const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === '') return defaultValue;
  return ['1', 'true', 'yes', 'y', 'on'].includes(String(value).toLowerCase());
};

const parsePositiveInteger = (value, defaultValue) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
};

export const config = {
  openAiApiKey: process.env.OPENAI_API_KEY,
  openAiModel: process.env.OPENAI_MODEL || 'gpt-5.4-mini',
  systemPrompt:
    process.env.BOT_SYSTEM_PROMPT ||
    'Kamu adalah asisten WhatsApp yang ramah, ringkas, dan membantu. Jawab dalam bahasa yang sama dengan pengguna.',
  botPrefix: process.env.BOT_PREFIX ?? '!',
  maxHistoryMessages: parsePositiveInteger(process.env.MAX_HISTORY_MESSAGES, 12),
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
