/**
 * =========================================================================
 * PUSAT KONFIGURASI UNDANGAN PERNIKAHAN (WEDDING CONFIGURATION)
 * =========================================================================
 * Anda dapat mengubah jadwal pernikahan, nama kedua mempelai, lokasi acara,
 * serta nomor rekening di file ini.
 *
 * Mengubah targetIsoDate di sini akan OTOMATIS memperbarui Countdown Timer
 * secara langsung tanpa perlu menyunting komponen lain.
 */

export interface WeddingConfig {
  couple: {
    groom: {
      fullName: string;
      shortName: string;
      fatherName: string;
      motherName: string;
      origin: string;
      instagram: string;
      instagramUrl: string;
      image: string;
    };
    bride: {
      fullName: string;
      shortName: string;
      fatherName: string;
      motherName: string;
      origin: string;
      instagram: string;
      instagramUrl: string;
      image: string;
    };
    jointTitle: string;
    togetherImage: string;
  };
  schedule: {
    // Target ISO format tanggal untuk Countdown Timer
    // Format: 'YYYY-MM-DDTHH:mm:ss+TZ'
    // Contoh Zona Waktu:
    // +08:00 untuk WITA (Mataram / Bali / Makassar)
    // +07:00 untuk WIB (Jakarta / Surabaya / Medan)
    // +09:00 untuk WIT (Jayapura / Ambon)
    targetIsoDate: string;

    // Format tampilan tanggal untuk pembaca manusia di Sampul & Kartu Acara
    displayDate: string;

    akad: {
      title: string;
      date: string;
      time: string;
      venueName: string;
      venueAddress: string;
      mapsUrl: string;
    };

    resepsi: {
      title: string;
      date: string;
      time: string;
      venueName: string;
      venueAddress: string;
      mapsUrl: string;
    };

    // Link "Ingatkan di Kalender" (Google Calendar)
    googleCalendarUrl: string;
  };
  gift: {
    bankName: string;
    bankTitle: string;
    accountNumber: string;
    accountHolder: string;
  };
  audio: {
    title: string;
    src: string;
  };
}

export const weddingConfig: WeddingConfig = {
  // 1. DATA KEDUA MEMPELAI
  couple: {
    groom: {
      fullName: "M. Sopian Asrin, M.Pd",
      shortName: "Sopian",
      fatherName: "H. Asrin",
      motherName: "Hj. Mariam",
      origin: "Pagesangan Barat, Kota Mataram",
      instagram: "@sopian_asrin",
      instagramUrl: "https://instagram.com",
      image: "/images/groom.jpg",
    },
    bride: {
      fullName: "Lale Annisa Janatin Sholeha, S.Pd",
      shortName: "Annisa",
      fatherName: "H. Lalu Sholehuddin",
      motherName: "Hj. Baiq Rahmah",
      origin: "Pagesangan Barat, Kota Mataram",
      instagram: "@annisa_janatin",
      instagramUrl: "https://instagram.com",
      image: "/images/bride.jpg",
    },
    jointTitle: "SOPIAN & ANNISA",
    togetherImage: "/images/mempelai.png",
  },

  // 2. JADWAL PERNIKAHAN & COUNTDOWN TIMER
  schedule: {
    // ⬇️ UBAH TANGGAL TARGET COUNTDOWN DI SINI (Format ISO 8601):
    // Contoh: '2026-07-12T13:00:00+08:00' (Minggu, 12 Juli 2026 pukul 13:00 WITA)
    targetIsoDate: "2026-09-27T09:00:00+08:00",

    // Teks tanggal yang tampil di Sampul & Header
    displayDate: "Minggu, 27 September 2026",

    // Detail Akad Nikah
    akad: {
      title: "AKAD NIKAH",
      date: "Minggu, 27 September 2026",
      time: "Pukul 09:00 WITA - Selesai",
      venueName: "Masjid Asy-Syafi'iyah Gubuk Mamben",
      venueAddress: "Jl. Sultan Kaharudin, Pagesangan Barat, Kota Mataram",
      mapsUrl: "https://maps.google.com/?q=Pagesangan+Barat+Mataram",
    },

    // Detail Resepsi Pernikahan
    resepsi: {
      title: "RESEPSI PERNIKAHAN",
      date: "Minggu, 27 September 2026",
      time: "Pukul 10:00 WITA - Selesai",
      venueName: "Rumah Mempelai Pria",
      venueAddress: "Jl. Sultan Kaharudin, Pagesangan Barat, Kota Mataram",
      mapsUrl: "https://maps.google.com/?q=Pagesangan+Barat+Mataram",
    },

    // Tombol Tambah ke Google Calendar
    googleCalendarUrl:
      "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Pernikahan+Sopian+%26+Annisa&dates=20260927T050000Z/20260927T090000Z&details=Pernikahan+M.+Sopian+Asrin+%26+Lale+Annisa+Janatin+Sholeha&location=Masjid+Asy-Syafi%27iyah+Gubuk+Mamben",
  },

  // 3. TANDA KASIH DIGITAL (NOMOR REKENING / KADO)
  gift: {
    bankName: "BSI",
    bankTitle: "BSI",
    accountNumber: "1121094053",
    accountHolder: "Lale Annisa Janatin Soleha",
  },

  // 4. MUSIK LATAR BELAKANG
  audio: {
    title: "Wedding Nasheed & Instrumental",
    src: "/audio/wedding-nasheed.mp3",
  },
};
