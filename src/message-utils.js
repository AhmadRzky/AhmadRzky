export const getMessageText = (message) => {
  const content = message.message;

  if (!content) return '';

  return (
    content.conversation ||
    content.extendedTextMessage?.text ||
    content.imageMessage?.caption ||
    content.videoMessage?.caption ||
    content.buttonsResponseMessage?.selectedDisplayText ||
    content.listResponseMessage?.title ||
    ''
  ).trim();
};

export const isGroupJid = (jid = '') => jid.endsWith('@g.us');

export const stripBotPrefix = (text, prefix) => {
  if (!prefix || !text.startsWith(prefix)) return text.trim();
  return text.slice(prefix.length).trim();
};

export const hasBotMention = (message, botJid) => {
  if (!botJid) return false;

  const mentioned = message.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  return mentioned.includes(botJid);
};

export const isHelpCommand = (text) => ['help', 'menu', 'bantuan'].includes(text.toLowerCase());

export const isResetCommand = (text) => ['reset', 'clear', 'hapus'].includes(text.toLowerCase());
