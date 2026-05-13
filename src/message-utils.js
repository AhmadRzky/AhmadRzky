export const getMessageContent = (message) => {
  const content = message.message || {};
  return (
    content.ephemeralMessage?.message ||
    content.viewOnceMessage?.message ||
    content.viewOnceMessageV2?.message ||
    content.documentWithCaptionMessage?.message ||
    content
  );
};

export const getMessageText = (message) => {
  const content = getMessageContent(message);

  if (!content) return '';

  return (
    content.conversation ||
    content.extendedTextMessage?.text ||
    content.imageMessage?.caption ||
    content.videoMessage?.caption ||
    content.documentMessage?.caption ||
    content.buttonsResponseMessage?.selectedDisplayText ||
    content.listResponseMessage?.title ||
    ''
  ).trim();
};

export const getMediaKind = (message) => {
  const content = getMessageContent(message);

  if (content.imageMessage) return 'image';
  if (content.videoMessage) return 'video';

  return null;
};

export const isGroupJid = (jid = '') => jid.endsWith('@g.us');

export const stripBotPrefix = (text, prefix) => {
  if (!prefix || !text.startsWith(prefix)) return text.trim();
  return text.slice(prefix.length).trim();
};

export const hasBotMention = (message, botJid) => {
  if (!botJid) return false;

  const content = getMessageContent(message);
  const mentioned = content.extendedTextMessage?.contextInfo?.mentionedJid || [];
  return mentioned.includes(botJid);
};

export const isHelpCommand = (text) => ['help', 'menu', 'bantuan'].includes(text.toLowerCase());

export const isResetCommand = (text) => ['reset', 'clear', 'hapus'].includes(text.toLowerCase());
