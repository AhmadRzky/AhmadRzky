import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import OpenAI from 'openai';
import { config } from './config.js';
import { generateImageBuffer } from './pollinations-image.js';

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

export const generateImageFile = async (prompt) => {
  const imageBuffer = await generateImageBuffer(prompt, config.imageProvider);
  const tempDir = await mkdtemp(path.join(tmpdir(), 'wa-pollinations-image-'));
  const filePath = path.join(tempDir, 'generated-image.png');

  await writeFile(filePath, imageBuffer);

  return { filePath, tempDir };
};

export const cleanupGeneratedImageFile = async (generatedImage) => {
  if (!generatedImage?.tempDir) return;
  await rm(generatedImage.tempDir, { recursive: true, force: true });
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
