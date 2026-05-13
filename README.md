# WhatsApp AI Bot Node.js

Bot WhatsApp AI sederhana menggunakan Node.js, [Baileys](https://github.com/WhiskeySockets/Baileys), dan OpenAI Responses API.

## Fitur

- Login WhatsApp Web lewat QR code di terminal.
- Balasan AI untuk chat pribadi.
- Dukungan grup lewat mention bot atau prefix perintah.
- Memori percakapan per chat selama proses bot berjalan.
- Perintah `!help` dan `!reset`.
- Konfigurasi lewat file `.env`.

## Prasyarat

- Node.js 20 atau lebih baru.
- Akun WhatsApp yang akan dipakai sebagai bot.
- API key OpenAI.

> Catatan: penggunaan automasi WhatsApp dapat dibatasi oleh ketentuan WhatsApp. Gunakan secara bertanggung jawab dan hindari spam.

## Instalasi

```bash
npm install
cp .env.example .env
```

Edit `.env`, lalu isi `OPENAI_API_KEY`.

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

## Konfigurasi `.env`

| Variabel | Keterangan | Default |
| --- | --- | --- |
| `OPENAI_API_KEY` | API key OpenAI. | Wajib diisi |
| `OPENAI_MODEL` | Model OpenAI untuk jawaban bot. | `gpt-5.4-mini` |
| `BOT_SYSTEM_PROMPT` | Instruksi gaya dan perilaku bot. | Asisten ramah dan ringkas |
| `BOT_PREFIX` | Prefix perintah di grup. | `!` |
| `MAX_HISTORY_MESSAGES` | Jumlah pesan terakhir yang disimpan per chat. | `12` |
| `REPLY_FROM_ME` | Proses pesan dari akun bot sendiri. | `false` |

## Cara Pakai

- **Chat pribadi:** kirim pesan biasa ke nomor bot.
- **Grup:** mention bot atau awali pesan dengan prefix, misalnya `!buatkan caption promosi kopi`.
- **Reset memori chat:** kirim `!reset`.
- **Bantuan:** kirim `!help`.

## Struktur Proyek

```text
src/
├── ai.js             # Integrasi OpenAI Responses API dan memori percakapan
├── config.js         # Konfigurasi environment
├── index.js          # Koneksi WhatsApp dan handler pesan
└── message-utils.js  # Helper ekstraksi teks dan command
```

## Pemeriksaan Sintaks

```bash
npm run check
```
