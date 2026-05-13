const pollinationsBaseUrl = 'https://image.pollinations.ai/prompt';
const supportedProviders = new Set(['pollinations']);

export const buildPollinationsImageUrl = (prompt) => {
  const encodedPrompt = encodeURIComponent(prompt.trim());
  return `${pollinationsBaseUrl}/${encodedPrompt}`;
};

export const getPollinationsImageExtension = (contentType) => {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  return 'jpg';
};

export const generateImageBuffer = async (prompt, imageProvider = 'pollinations') => {
  const normalizedProvider = imageProvider.toLowerCase();

  if (!supportedProviders.has(normalizedProvider)) {
    throw new Error(`IMAGE_PROVIDER "${imageProvider}" belum didukung. Gunakan IMAGE_PROVIDER=pollinations.`);
  }

  const cleanPrompt = prompt.trim();

  if (!cleanPrompt) {
    throw new Error('Prompt gambar kosong. Contoh: !gambar kucing astronot di bulan');
  }

  const imageUrl = buildPollinationsImageUrl(cleanPrompt);
  const response = await fetch(imageUrl, {
    headers: {
      Accept: 'image/*'
    },
    signal: AbortSignal.timeout(60_000)
  });

  if (!response.ok) {
    throw new Error(`Pollinations gagal membuat gambar. Status HTTP ${response.status}.`);
  }

  const contentType = response.headers.get('content-type') || '';

  if (!contentType.startsWith('image/')) {
    throw new Error(`Pollinations tidak mengembalikan file gambar. Content-Type: ${contentType || 'tidak diketahui'}.`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const imageBuffer = Buffer.from(arrayBuffer);

  if (imageBuffer.length === 0) {
    throw new Error('Pollinations mengembalikan gambar kosong. Coba prompt lain.');
  }

  return {
    buffer: imageBuffer,
    contentType,
    extension: getPollinationsImageExtension(contentType),
    imageUrl
  };
};
