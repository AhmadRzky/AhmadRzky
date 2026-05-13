import { config } from './config.js';

export const commandNames = new Set([
  'gambar',
  'image',
  'sticker',
  'music',
  'video',
  'help',
  'menu',
  'bantuan',
  'reset',
  'clear',
  'hapus'
]);

export const parseCommand = (text) => {
  const trimmed = text.trim();
  const prefix = config.botPrefix || '!';

  if (!trimmed.startsWith(prefix)) return null;

  const withoutPrefix = trimmed.slice(prefix.length).trim();
  const [rawName = '', ...rest] = withoutPrefix.split(/\s+/);
  const name = rawName.toLowerCase();

  if (!commandNames.has(name)) return null;

  return {
    name,
    args: rest.join(' ').trim(),
    raw: withoutPrefix
  };
};
