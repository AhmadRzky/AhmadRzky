import { execFile, spawn } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import ffmpeg from 'fluent-ffmpeg';
import { config } from './config.js';

const execFileAsync = promisify(execFile);

export class UserFacingError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UserFacingError';
  }
}

const ensureBinary = async (binary, installHint) => {
  try {
    await execFileAsync(binary, ['--version'], { timeout: 10_000 });
  } catch {
    throw new UserFacingError(`${binary} belum tersedia. Install dulu: ${installHint}`);
  }
};

export const mediaLimits = {
  maxDurationSeconds: config.maxDownloadDurationSeconds,
  maxAudioBytes: config.maxAudioBytes,
  maxVideoBytes: config.maxVideoBytes
};

export const bytesToMb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export const assertSupportedUrl = (url) => {
  let parsed;

  try {
    parsed = new URL(url);
  } catch {
    throw new UserFacingError('Link tidak valid. Kirim URL lengkap, contoh: !music https://youtu.be/...');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new UserFacingError('Link harus diawali http:// atau https://.');
  }

  return parsed.toString();
};

const escapeSvg = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const wrapStickerText = (text) => {
  const words = text.split(/\s+/);
  const lines = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (next.length > 13 && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines.slice(0, 7);
};

export const saveTempMedia = async ({ buffer, extension, prefix = 'wa-media-', callback }) => {
  const safeExtension = extension.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin';
  const dir = await mkdtemp(path.join(tmpdir(), prefix));
  const filePath = path.join(dir, `media.${safeExtension}`);

  try {
    await writeFile(filePath, buffer);
    return await callback(filePath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};

const runFfmpeg = (inputPath, outputPath, configure) =>
  new Promise((resolve, reject) => {
    const command = ffmpeg(inputPath);
    configure(command);
    command.save(outputPath).on('end', resolve).on('error', reject);
  });

const bufferToStickerWithFfmpeg = async ({ buffer, inputExtension = 'bin', configure }) => {
  await ensureBinary('ffmpeg', 'pkg install ffmpeg');

  const dir = await mkdtemp(path.join(tmpdir(), 'wa-sticker-'));
  const safeExtension = inputExtension.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin';
  const inputPath = path.join(dir, `input.${safeExtension}`);
  const outputPath = path.join(dir, 'sticker.webp');

  try {
    await writeFile(inputPath, buffer);
    await runFfmpeg(inputPath, outputPath, configure);
    return await readFile(outputPath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};

export const createTextSticker = async (text) => {
  const safeText = text.trim().slice(0, 180);

  if (!safeText) {
    throw new UserFacingError('Tulis teks sticker, contoh: !sticker Halo dunia');
  }

  const lines = wrapStickerText(safeText);
  const longestLine = Math.max(...lines.map((line) => line.length), 1);
  const fontSize = Math.max(34, Math.min(70, Math.floor(340 / longestLine) * 2));
  const lineHeight = fontSize * 1.18;
  const startY = 256 - ((lines.length - 1) * lineHeight) / 2;
  const textNodes = lines
    .map(
      (line, index) =>
        `<text x="256" y="${startY + index * lineHeight}" text-anchor="middle" dominant-baseline="middle">${escapeSvg(line)}</text>`
    )
    .join('');

  const svg = `
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" rx="48" fill="#111827"/>
      <g fill="#ffffff" stroke="#000000" stroke-width="7" paint-order="stroke" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="800">
        ${textNodes}
      </g>
    </svg>`;

  return bufferToStickerWithFfmpeg({
    buffer: Buffer.from(svg),
    inputExtension: 'svg',
    configure: (command) => {
      command.outputOptions([
        '-vf',
        'scale=512:512:force_original_aspect_ratio=decrease:flags=lanczos,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
        '-frames:v',
        '1',
        '-lossless',
        '0',
        '-quality',
        '85'
      ]).format('webp');
    }
  });
};

export const imageToSticker = async (buffer) =>
  bufferToStickerWithFfmpeg({
    buffer,
    inputExtension: 'bin',
    configure: (command) => {
      command
        .outputOptions([
          '-vf',
          'scale=512:512:force_original_aspect_ratio=decrease:flags=lanczos,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
          '-frames:v',
          '1',
          '-lossless',
          '0',
          '-quality',
          '85'
        ])
        .format('webp');
    }
  });

export const videoToSticker = async (buffer) =>
  bufferToStickerWithFfmpeg({
    buffer,
    inputExtension: 'mp4',
    configure: (command) => {
      command
        .inputOptions(['-t 6'])
        .outputOptions([
          '-vf',
          'fps=12,scale=512:512:force_original_aspect_ratio=decrease:flags=lanczos,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
          '-loop',
          '0',
          '-an',
          '-vsync',
          '0',
          '-s',
          '512:512'
        ])
        .format('webp');
    }
  });

const getYtDlpMetadata = async (url) => {
  await ensureBinary('yt-dlp', 'pkg install python && pip install -U yt-dlp');

  try {
    const { stdout } = await execFileAsync('yt-dlp', ['--dump-single-json', '--no-playlist', url], {
      maxBuffer: 8 * 1024 * 1024,
      timeout: 30_000
    });
    return JSON.parse(stdout);
  } catch (error) {
    if (error instanceof UserFacingError) throw error;
    throw new UserFacingError('Gagal membaca link. Pastikan link publik dan didukung yt-dlp.');
  }
};

const assertDuration = (metadata) => {
  const duration = Number(metadata.duration || 0);

  if (duration > mediaLimits.maxDurationSeconds) {
    throw new UserFacingError(
      `Durasi terlalu panjang (${Math.ceil(duration / 60)} menit). Maksimal ${Math.floor(mediaLimits.maxDurationSeconds / 60)} menit.`
    );
  }
};

const runYtDlp = async ({ url, dir, outputTemplate, format, maxBytes, extractAudio }) =>
  new Promise((resolve, reject) => {
    const args = [
      '--no-playlist',
      '--max-filesize',
      String(maxBytes),
      '--no-part',
      '-o',
      outputTemplate,
      '-f',
      format
    ];

    if (extractAudio) {
      args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
    } else {
      args.push('--merge-output-format', 'mp4');
    }

    args.push(url);

    const child = spawn('yt-dlp', args, { cwd: dir });
    let stderr = '';

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new UserFacingError(
          `Download gagal. Link mungkin tidak valid, privat, terlalu besar, atau tidak didukung. Detail: ${stderr.slice(-300)}`
        )
      );
    });
  });

const pickDownloadedFile = async (dir, expectedExtension) => {
  const files = await readdir(dir);
  const file = files.find((name) => name.endsWith(expectedExtension)) || files[0];

  if (!file) throw new UserFacingError('Download selesai tetapi file hasil tidak ditemukan.');

  return path.join(dir, file);
};

const downloadWithYtDlp = async ({ url, kind }) => {
  await ensureBinary('ffmpeg', 'pkg install ffmpeg');

  const safeUrl = assertSupportedUrl(url);
  const metadata = await getYtDlpMetadata(safeUrl);
  assertDuration(metadata);

  const dir = await mkdtemp(path.join(tmpdir(), `wa-${kind}-`));
  const title = metadata.title || 'media';

  try {
    const isAudio = kind === 'audio';
    const maxBytes = isAudio ? mediaLimits.maxAudioBytes : mediaLimits.maxVideoBytes;
    const outputTemplate = path.join(dir, isAudio ? 'audio.%(ext)s' : 'video.%(ext)s');

    await runYtDlp({
      url: safeUrl,
      dir,
      outputTemplate,
      format: isAudio ? 'bestaudio/best' : 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/best',
      maxBytes,
      extractAudio: isAudio
    });

    const filePath = await pickDownloadedFile(dir, isAudio ? '.mp3' : '.mp4');
    const fileStat = await stat(filePath);

    if (fileStat.size > maxBytes) {
      throw new UserFacingError(`File terlalu besar (${bytesToMb(fileStat.size)}). Maksimal ${bytesToMb(maxBytes)}.`);
    }

    return {
      buffer: await readFile(filePath),
      title,
      size: fileStat.size,
      mimeType: isAudio ? 'audio/mpeg' : 'video/mp4'
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};

export const downloadAudio = (url) => downloadWithYtDlp({ url, kind: 'audio' });

export const downloadVideo = (url) => downloadWithYtDlp({ url, kind: 'video' });
