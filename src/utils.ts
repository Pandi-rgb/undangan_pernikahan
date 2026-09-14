import JSZip from 'jszip';

export function formatTimeAgo(dateInput: any): string {
  if (!dateInput) return 'Baru saja';
  
  let date: Date;
  if (typeof dateInput === 'object' && 'toDate' in dateInput && typeof dateInput.toDate === 'function') {
    date = dateInput.toDate();
  } else if (dateInput instanceof Date) {
    date = dateInput;
  } else if (typeof dateInput === 'string' || typeof dateInput === 'number') {
    date = new Date(dateInput);
  } else {
    return 'Baru saja';
  }

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Baru saja';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} menit yang lalu`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} jam yang lalu`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays} hari yang lalu`;
  
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function downloadProjectZip() {
  const zip = new JSZip();

  // Read current package.json and config files or define clean production bundle
  const readmeContent = `# Undangan Pernikahan Digital - The Wedding of Sopian & Annisa

Aplikasi undangan pernikahan digital Islami modern berbasis React, TypeScript, Tailwind CSS, dan Firebase Firestore real-time.

## Fitur Utama
1. **Layar Sampul Terkunci**: Pengguna tidak dapat scroll sebelum menekan tombol "Buka Undangan".
2. **Autoplay Musik Romantis**: Lagu otomatis berputar saat undangan dibuka, dilengkapi tombol kontrol musik mengambang.
3. **Nama Tamu Otomatis**: Menampilkan nama tamu sesuai parameter URL (contoh: \`?to=Bapak+Ahmad+Faisal+dan+Keluarga\`).
4. **Buku Tamu Doa & Ucapan Real-Time**: Sinkronisasi langsung ke Firebase Firestore, sehingga ucapan tamu langsung muncul untuk semua tamu lainnya.
5. **Scroll Mandiri untuk Doa & Ucapan**: Kontainer ucapan memiliki scroll tersendiri agar tidak mengganggu navigasi halaman utama.
6. **Hitung Mundur Acara (Countdown)**: Pengingat hari H terintegrasi ke Google Calendar.
7. **Tanda Kasih Digital**: Nomor rekening BCA dengan fitur satu-klik salin ke clipboard.
8. **Navigasi Bawah iOS**: Navigasi cepat antar seksi (Sampul, Mempelai, Acara, Kado, Doa).

## Cara Menjalankan Secara Lokal

1. Pastikan Node.js (versi 18+) sudah terpasang di komputer Anda.
2. Buka terminal pada folder proyek ini.
3. Pasang dependensi:
   \`\`\`bash
   npm install
   \`\`\`
4. Jalankan server pengembangan:
   \`\`\`bash
   npm run dev
   \`\`\`
5. Buka browser pada alamat \`http://localhost:3000\` (atau port yang tertera di terminal).

## Format Link Undangan untuk Tamu

Untuk mengirim undangan dengan nama tamu yang dipersonalisasi, tambahkan parameter \`?to=Nama+Tamu\` pada URL undangan:
- Contoh 1: \`https://domain-anda.com/?to=Bapak+Ahmad+Faisal\`
- Contoh 2: \`https://domain-anda.com/?to=Sahabat+Rina+Marlina\`
- Contoh 3: \`https://domain-anda.com/?to=Keluarga+Besar+Haji+Zulherman\`

## Konfigurasi Firebase
File konfigurasi Firebase terdapat pada \`firebase-applet-config.json\` atau \`src/firebase.ts\`. Pastikan aturan keamanan pada \`firestore.rules\` sudah terpasang agar koleksi \`wishes\` dapat dibaca publik dan ditambahkan ucapan baru secara aman.
`;

  zip.file('README.md', readmeContent);

  // We fetch or include key files
  try {
    const rawViteConfig = `import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
});
`;

    zip.file('vite.config.ts', rawViteConfig);

    const filesToInclude = [
      '.gitignore',
      '.env.example',
      'package.json',
      'tsconfig.json',
      'index.html',
      'metadata.json',
      'firebase-applet-config.json',
      'firebase-blueprint.json',
      'firestore.rules',
      'src/main.tsx',
      'src/App.tsx',
      'src/components/CoverScreen.tsx',
      'src/components/FallingPetals.tsx',
      'src/index.css',
      'src/types.ts',
      'src/firebase.ts',
      'src/utils.ts'
    ];

    for (const filePath of filesToInclude) {
      try {
        let content = '';
        // Prefer raw-file endpoint to guarantee untransformed, pristine source files
        const rawRes = await fetch(`/api/raw-file?path=${encodeURIComponent(filePath)}`);
        if (rawRes.ok) {
          content = await rawRes.text();
        } else {
          const fallbackRes = await fetch(`/${filePath}`);
          if (fallbackRes.ok) {
            content = await fallbackRes.text();
          }
        }
        if (content) {
          zip.file(filePath, content);
        }
      } catch (err) {
        console.warn(`Could not include file ${filePath} in zip:`, err);
      }
    }

    // Include audio file into zip
    try {
      const audioRes = await fetch('/audio/wedding-nasheed.mp3');
      if (audioRes.ok) {
        const audioBuffer = await audioRes.arrayBuffer();
        zip.file('public/audio/wedding-nasheed.mp3', audioBuffer);
      }
    } catch (err) {
      console.warn('Could not include audio file in zip:', err);
    }

    // Include wedding floral & couple images into zip
    const imagesToInclude = [
      { url: '/images/border-mempelai.jpg', path: 'public/images/border-mempelai.jpg' },
      { url: '/images/cover-bunga.jpg', path: 'public/images/cover-bunga.jpg' },
      { url: '/images/couple.jpg', path: 'public/images/couple.jpg' },
      { url: '/images/groom.jpg', path: 'public/images/groom.jpg' },
      { url: '/images/bride.jpg', path: 'public/images/bride.jpg' }
    ];

    for (const img of imagesToInclude) {
      try {
        const imgRes = await fetch(img.url);
        if (imgRes.ok) {
          const imgBuf = await imgRes.arrayBuffer();
          zip.file(img.path, imgBuf);
        }
      } catch (err) {
        console.warn(`Could not include image ${img.path} in zip:`, err);
      }
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'wedding-sopian-annisa-sourcecode.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Failed to generate zip:', error);
    alert('Terjadi kesalahan saat mengunduh source code. Silakan coba kembali.');
  }
}
