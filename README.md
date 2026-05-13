# WhatsApp AI Bot Node.js

Bot WhatsApp AI menggunakan Node.js, [Baileys](https://github.com/WhiskeySockets/Baileys), OpenAI Responses API untuk chat, Pollinations AI untuk gambar gratis, `ffmpeg`, dan `yt-dlp`.

## Fitur

- Login WhatsApp Web lewat QR code di terminal.
- Balasan AI untuk chat pribadi.
- Dukungan grup lewat mention bot atau prefix perintah.
- Memori percakapan per chat selama proses bot berjalan.
- `!gambar <prompt>` untuk generate gambar AI gratis via Pollinations dan mengirim hasilnya ke WhatsApp.
- `!sticker` untuk membuat sticker dari gambar/video caption atau teks.
- `!music <url>` untuk download audio dari link yang didukung `yt-dlp`.
- `!video <url>` untuk download video dari link yang didukung `yt-dlp`.
- Batas durasi dan ukuran file agar aman untuk WhatsApp/Termux.
- Konfigurasi lewat file `.env`.

## Prasyarat

- Node.js 20 atau lebih baru.
- Akun WhatsApp yang akan dipakai sebagai bot.
- API key OpenAI.
- `ffmpeg` untuk membuat sticker gambar/teks/video/gif dan konversi media.
- `yt-dlp` untuk command `!music` dan `!video`.

> Catatan: penggunaan automasi WhatsApp dapat dibatasi oleh ketentuan WhatsApp. Gunakan secara bertanggung jawab dan hindari spam.
>
> Download media hanya boleh digunakan untuk konten yang legal, milik sendiri, berlisensi, atau memang diizinkan oleh pemilik hak cipta/platform.

## Instalasi di PC/Linux/macOS

```bash
npm install
cp .env.example .env
```

Edit `.env`, lalu isi `OPENAI_API_KEY`.

## Instalasi di Termux Android

Update Termux dan install paket dasar:

```bash
pkg update && pkg upgrade
pkg install nodejs git python ffmpeg
```

Install `yt-dlp`:

```bash
python -m pip install -U pip
python -m pip install -U yt-dlp
```

Cek instalasi:

```bash
node -v
ffmpeg -version
yt-dlp --version
```

Lalu install dependency project:

```bash
npm install
cp .env.example .env
```

Project ini hanya memakai `ffmpeg` untuk proses sticker/media agar lebih ringan dan lebih kompatibel dengan Termux Android.

## Konfigurasi `.env`

| Variabel | Keterangan | Default |
| --- | --- | --- |
| `OPENAI_API_KEY` | API key OpenAI. | Wajib diisi |
| `OPENAI_MODEL` | Model OpenAI untuk chat bot. | `gpt-5.4-mini` |
| `IMAGE_PROVIDER` | Provider gambar untuk `!gambar`. Saat ini hanya `pollinations`. | `pollinations` |
| `BOT_SYSTEM_PROMPT` | Instruksi gaya dan perilaku bot. | Asisten ramah dan ringkas |
| `BOT_PREFIX` | Prefix perintah di grup. | `!` |
| `MAX_HISTORY_MESSAGES` | Jumlah pesan terakhir yang disimpan per chat. | `12` |
| `MAX_DOWNLOAD_DURATION_SECONDS` | Durasi maksimal `!music`/`!video`. | `600` |
| `MAX_AUDIO_MB` | Ukuran maksimal audio hasil `!music`. | `25` |
| `MAX_VIDEO_MB` | Ukuran maksimal video hasil `!video`. | `45` |
| `REPLY_FROM_ME` | Proses pesan dari akun bot sendiri. | `false` |

## Menjalankan Bot

```bash
npm start
```

Setelah bot berjalan, scan QR code yang muncul di terminal melalui WhatsApp:

1. Buka WhatsApp di ponsel.
2. Masuk ke **Perangkat tertaut**.
3. Pilih **Tautkan perangkat**.
4. Scan QR code dari terminal.

Sesi login disimpan di folder `auth/` dan sudah diabaikan oleh Git.

## Contoh Command

### Chat AI biasa

- **Chat pribadi:** kirim pesan biasa ke nomor bot.
- **Grup:** mention bot atau awali pesan dengan prefix, misalnya:

```text
!buatkan caption promosi kopi susu
```

### Generate gambar AI

```text
!gambar poster cyberpunk kota Jakarta saat hujan, warna neon, detail tinggi
```

Bot akan membuat URL `https://image.pollinations.ai/prompt/{prompt}` dengan `encodeURIComponent`, download hasil gambar dari Pollinations sebagai buffer, lalu mengirim buffer tersebut sebagai image WhatsApp lewat Baileys. Fitur gambar tidak memakai OpenAI API dan tidak membutuhkan billing OpenAI; OpenAI tetap hanya dipakai untuk chat biasa.

### Membuat sticker

Dari gambar:

1. Kirim gambar.
2. Isi caption:

```text
!sticker
```

Dari video pendek/gif:

1. Kirim video pendek/gif.
2. Isi caption:

```text
!sticker
```

Bot akan mencoba membuat sticker animasi WebP menggunakan `ffmpeg` jika memungkinkan.

Dari teks:

```text
!sticker Jangan lupa ngopi
```

### Download audio/music

```text
!music https://youtu.be/contoh
```

Bot memakai `yt-dlp`, membatasi durasi maksimal 10 menit, lalu mengirim audio sebagai MP3 jika berhasil.

### Download video

```text
!video https://www.instagram.com/reel/contoh
```

Bot memakai `yt-dlp`, membatasi durasi dan ukuran file, lalu mengirim video MP4 jika berhasil.

### Utility

```text
!help
!reset
```

## Batasan Download

Default batas download:

- Durasi maksimal: 10 menit (`MAX_DOWNLOAD_DURATION_SECONDS=600`).
- Audio maksimal: 25 MB (`MAX_AUDIO_MB=25`).
- Video maksimal: 45 MB (`MAX_VIDEO_MB=45`).

Jika link privat, tidak didukung `yt-dlp`, durasi terlalu panjang, atau file terlalu besar, bot akan mengirim pesan error yang bisa dipahami user.

## Struktur Proyek

```text
src/
├── ai.js             # Integrasi OpenAI Responses API untuk chat dan memori percakapan
├── commands.js       # Parser command prefix
├── config.js         # Konfigurasi environment
├── index.js          # Koneksi WhatsApp dan handler pesan
├── media-utils.js    # Sticker berbasis ffmpeg, yt-dlp, file temp, dan batas media
├── pollinations-image.js # Generate gambar gratis via Pollinations
└── message-utils.js  # Helper ekstraksi teks/media dan command
```

## Pemeriksaan Sintaks

```bash
npm run check
```
