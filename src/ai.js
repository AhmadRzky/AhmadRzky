import OpenAI from 'openai';
import { config } from './config.js';

const client = new OpenAI({ apiKey: config.openAiApiKey });
const histories = new Map();

const trimHistory = (messages) => messages.slice(-config.maxHistoryMessages);

const extractOutputText = (response) => {
  if (response.output_text) return response.output_text.trim();

  return (response.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text || '')
    .join('\n')
    .trim();
};

export const resetConversation = (chatId) => {
  histories.delete(chatId);
};

export const generateImage = async (prompt) => {
  const response = await client.images.generate({
    model: config.openAiImageModel,
    prompt,
    size: config.openAiImageSize,
    quality: config.openAiImageQuality,
    n: 1
  });

  const imageBase64 = response.data?.[0]?.b64_json;

  if (!imageBase64) {
    throw new Error('OpenAI tidak mengembalikan data gambar.');
  }

  return Buffer.from(imageBase64, 'base64');
};

export const generateReply = async (chatId, userText) => {
  const history = histories.get(chatId) || [];
  const nextHistory = trimHistory([...history, { role: 'user', content: userText }]);

  const response = await client.responses.create({
    model: config.openAiModel,
    instructions: config.systemPrompt,
    input: nextHistory
  });

  const answer = extractOutputText(response) || 'Maaf, saya belum bisa membuat jawaban untuk pesan itu.';
  histories.set(chatId, trimHistory([...nextHistory, { role: 'assistant', content: answer }]));

  return answer;
};
