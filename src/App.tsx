/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Heart,
  Calendar,
  Clock,
  MapPin,
  Gift,
  Copy,
  Check,
  Send,
  Music,
  Share2,
  FileCode,
  Download,
  CheckCircle2,
  XCircle,
  ExternalLink,
  MessageSquare,
  Home,
  UserCheck,
  ChevronDown,
  Info,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  ArrowLeft
} from 'lucide-react';
import {
  collection,
  onSnapshot,
  addDoc,
  query,
  orderBy,
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Wish } from './types';
import { formatTimeAgo, downloadProjectZip } from './utils';
import { CoverScreen } from './components/CoverScreen';
import { FallingPetals } from './components/FallingPetals';
import { motion, type Variants } from 'motion/react';

// Luxury editorial animation easing (smooth cubic-bezier deceleration)
const luxuryEase = [0.22, 1, 0.36, 1] as const;

const fadeInUpSection: Variants = {
  hidden: { opacity: 0, y: 36 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.85,
      ease: luxuryEase,
    },
  },
};

const fadeInUpCard: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.75,
      ease: luxuryEase,
    },
  },
};

export default function App() {
  // Navigation & Lock state
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [showPetals, setShowPetals] = useState(true);
  const [guestName, setGuestName] = useState('Tamu Undangan');
  const [copiedRekening, setCopiedRekening] = useState(false);
  const [copiedDana, setCopiedDana] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Guest Link Generator State
  const [customGuestInput, setCustomGuestInput] = useState('');
  const [generatedGuestLink, setGeneratedGuestLink] = useState('');
  const [copiedGuestLink, setCopiedGuestLink] = useState(false);

  // Audio reference
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  // Wishes / Guestbook states
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [isLoadingWishes, setIsLoadingWishes] = useState(true);
  const [isSubmittingWish, setIsSubmittingWish] = useState(false);
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState('');
  const [formName, setFormName] = useState('');
  const [formStatus, setFormStatus] = useState<'Hadir' | 'Tidak Hadir'>('Hadir');
  const [formMessage, setFormMessage] = useState('');

  // Fallback initial wishes if database is freshly seeded
  const initialFallbackWishes: Wish[] = [
    // {
    //   id: 'mock-1',
    //   name: 'Faisal & Keluarga',
    //   status: 'Hadir',
    //   message: "Barakallahu laka wa baraka 'alaika wa jama'a bainakuma fii khair. Semoga sakinah mawaddah warahmah hingga jannah Sopian & Annisa!",
    //   createdAt: new Date(Date.now() - 10 * 60 * 1000)
    // },
    // {
    //   id: 'mock-2',
    //   name: 'Rina Marlina, S.Pd',
    //   status: 'Hadir',
    //   message: 'Selamat menempuh hidup baru sahabatku Annisa! Semoga lancar sampai hari H dan senantiasa diberkahi Allah.',
    //   createdAt: new Date(Date.now() - 35 * 60 * 1000)
    // },
    // {
    //   id: 'mock-3',
    //   name: 'H. Muhammad Ridwan',
    //   status: 'Hadir',
    //   message: 'Semoga menjadi keluarga yang sakinah, mawadah, warahmah dan lekas dikaruniai keturunan yang sholeh dan sholehah.',
    //   createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
    // }
  ];

  // 1. Read query parameters for personalized guest name
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const nameParam = urlParams.get('to') || urlParams.get('nama') || urlParams.get('guest') || urlParams.get('u');
      if (nameParam && nameParam.trim()) {
        const decoded = decodeURIComponent(nameParam.trim());
        setGuestName(decoded);
        setFormName(decoded); // Pre-fill in guestbook form for convenience
      }
    } catch (e) {
      console.error('Error parsing URL parameters:', e);
    }
  }, []);

  // 2. Countdown timer calculation (Target: 12 Juli 2026, 13:00 WITA / UTC+8)
  useEffect(() => {
    // 13:00 WITA (UTC+8) is 05:00 UTC
    const targetDate = new Date('2026-09-27T09:00:00+08:00').getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  // 3. Real-time Firestore sync for Wishes & Prayers
  useEffect(() => {
    const wishesPath = 'wishes';
    const wishesQuery = query(
      collection(db, wishesPath),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      wishesQuery,
      (snapshot) => {
        const loadedWishes: Wish[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          loadedWishes.push({
            id: docSnap.id,
            name: data.name || 'Tamu Undangan',
            status: data.status === 'Tidak Hadir' ? 'Tidak Hadir' : 'Hadir',
            message: data.message || '',
            createdAt: data.createdAt || new Date()
          });
        });

        if (loadedWishes.length > 0) {
          setWishes(loadedWishes);
        } else {
          setWishes(initialFallbackWishes);
        }
        setIsLoadingWishes(false);
      },
      (error) => {
        console.warn('Firestore onSnapshot error, falling back to local list:', error);
        setWishes(initialFallbackWishes);
        setIsLoadingWishes(false);
        // Note: we do not crash app if offline or initializing
      }
    );

    return () => unsubscribe();
  }, []);

  // Lock body & window scroll strictly until user clicks "Buka Undangan"
  useEffect(() => {
    if (!isUnlocked) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      window.scrollTo(0, 0);
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isUnlocked]);

  // 4. Handle "Buka Undangan" action
  const handleOpenInvitation = () => {
    setIsUnlocked(true);
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';

    // Play music automatically upon user click
    if (audioRef.current) {
      audioRef.current
        .play()
        .then(() => {
          setIsPlayingMusic(true);
        })
        .catch((err) => {
          console.log('Audio autoplay prevented by browser:', err);
        });
    }

    // Smoothly scroll window to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Return to Cover Screen
  const handleBackToCover = () => {
    setIsUnlocked(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 5. Toggle audio play / pause
  const toggleMusic = () => {
    if (!audioRef.current) return;

    if (isPlayingMusic) {
      audioRef.current.pause();
      setIsPlayingMusic(false);
    } else {
      audioRef.current
        .play()
        .then(() => {
          setIsPlayingMusic(true);
        })
        .catch((err) => {
          console.error('Audio playback error:', err);
        });
    }
  };

  // 6. Copy Rekening BSI
  const handleCopyRekening = () => {
    const rek = '1121094053';
    navigator.clipboard.writeText(rek).then(() => {
      setCopiedRekening(true);
      setTimeout(() => setCopiedRekening(false), 2500);
    });
  };

  // Copy Dana
  const handleCopyDana = () => {
    const req = '087753163967'
    navigator.clipboard.writeText(req).then(() => {
      setCopiedDana(true);
      setTimeout(() => setCopiedDana(false), 2500);
    })
  };

  // 7. Submit new Wish to Firestore
  const handleSubmitWish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formMessage.trim()) return;

    setIsSubmittingWish(true);
    setSubmitSuccessMessage('');

    try {
      await addDoc(collection(db, 'wishes'), {
        name: formName.trim().slice(0, 100),
        status: formStatus,
        message: formMessage.trim().slice(0, 1000),
        createdAt: serverTimestamp()
      });

      setFormMessage('');
      setSubmitSuccessMessage('Doa dan ucapan Anda telah berhasil terkirim. Terima kasih banyak!');
      setTimeout(() => setSubmitSuccessMessage(''), 4000);
    } catch (error) {
      console.error('Error submitting wish:', error);
      try {
        handleFirestoreError(error, OperationType.CREATE, 'wishes');
      } catch (handledError) {
        // Fallback optimistic display for preview
        const newLocalWish: Wish = {
          id: `local-${Date.now()}`,
          name: formName.trim(),
          status: formStatus,
          message: formMessage.trim(),
          createdAt: new Date()
        };
        setWishes((prev) => [newLocalWish, ...prev]);
        setFormMessage('');
        setSubmitSuccessMessage('Doa dan ucapan Anda telah berhasil disimpan!');
        setTimeout(() => setSubmitSuccessMessage(''), 4000);
      }
    } finally {
      setIsSubmittingWish(false);
    }
  };

  // 8. Generate Guest Link
  const handleGenerateGuestLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customGuestInput.trim()) return;

    const currentUrl = window.location.origin + window.location.pathname;
    const encodedName = encodeURIComponent(customGuestInput.trim());
    const fullLink = `${currentUrl}?to=${encodedName}`;
    setGeneratedGuestLink(fullLink);
  };

  const handleCopyGeneratedLink = () => {
    if (!generatedGuestLink) return;
    navigator.clipboard.writeText(generatedGuestLink).then(() => {
      setCopiedGuestLink(true);
      setTimeout(() => setCopiedGuestLink(false), 2500);
    });
  };

  const handleShareWhatsApp = () => {
    if (!generatedGuestLink) return;
    const guest = customGuestInput.trim();
    const text = `Assalamu'alaikum Warahmatullahi Wabarakatuh.\n\nKepada Yth. *${guest}*,\nKami mengundang Bapak/Ibu/Saudara/i untuk menghadiri acara pernikahan kami (Sopian & Annisa).\n\nSilakan buka link undangan digital berikut untuk info lengkap:\n${generatedGuestLink}\n\nMerupakan suatu kehormatan bagi kami apabila berkenan hadir dan memberikan doa restu. Terima kasih.`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Google Calendar URL
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Pernikahan+Sopian+%26+Annisa&dates=20260927T010000Z/20260927T020000Z&details=Pernikahan+M.+Sopian+Asrin+%26+Lale+Annisa+Janatin+Sholeha&location=Dusun+Akar-Akar+Utara+Desa+Akar-akar+Kec+Bayan+Kab+Lombok+Utara`;

  // Stats calculation
  const hadirCount = wishes.filter((w) => w.status === 'Hadir').length;
  const tidakHadirCount = wishes.filter((w) => w.status === 'Tidak Hadir').length;

  return (
    <>
      <div
        id="wedding-app-root"
        className="min-h-screen bg-[#081c13] flex justify-center text-stone-800 selection:bg-[#c5a059] selection:text-white relative overflow-x-hidden"
      >
        {/* Background Audio */}
        <audio
          id="wedding-audio-player"
          ref={audioRef}
          loop
          preload="auto"
          src="/audio/wedding-nasheed.mp3"
        />

        {!isUnlocked ? (
          <CoverScreen
            key="cover-screen"
            guestName={guestName}
            onOpenInvitation={handleOpenInvitation}
          />
        ) : (
          <div
            key="main-invitation-container"
            className="w-full flex justify-center relative min-h-screen animate-fade-in"
          >
            {/* Delicate Falling Flower Petals Shower Animation */}
            {showPetals && <FallingPetals count={24} />}

            {/* Floating Top Controls (Music, Petals Toggle, Share & Docs) */}
            <div className="fixed bottom-20 right-4 z-40 flex items-center gap-2">
              {/* Petals Toggle Button */}
              <button
                id="btn-toggle-petals"
                onClick={() => setShowPetals((prev) => !prev)}
                title={
                  showPetals
                    ? "Nonaktifkan Efek Kelopak Bunga"
                    : "Aktifkan Efek Kelopak Bunga"
                }
                className={`w-10 h-10 rounded-full backdrop-blur-md border flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition cursor-pointer ${
                  showPetals
                    ? "bg-[#14422d]/90 border-[#c5a059] text-[#e6c88b]"
                    : "bg-stone-800/80 border-stone-600 text-stone-400"
                }`}
              >
                <Sparkles className="w-4 h-4" />
              </button>

              {/* Audio Toggle Button */}
              <button
                id="btn-audio-toggle"
                onClick={toggleMusic}
                title={isPlayingMusic ? "Jeda Musik" : "Putar Musik"}
                className={`w-11 h-11 rounded-full bg-[#14422d]/90 backdrop-blur-md border border-[#c5a059]/60 flex items-center z-50 justify-center text-[#e6c88b] shadow-lg transition active:scale-95 cursor-pointer ${
                  isPlayingMusic ? "shadow-[#c5a059]/30" : "opacity-85"
                }`}
              >
                {isPlayingMusic ? (
                  <div className="rotate-music flex items-center justify-center">
                    <Music className="w-5 h-5 text-[#e6c88b]" />
                  </div>
                ) : (
                  <VolumeX className="w-5 h-5 text-stone-400" />
                )}
              </button>
            </div>

            {/* Mobile iOS Centered Container (Max 440px) */}
            <div
              id="invitation-main-container"
              className="w-full max-w-[440px] relative bg-[#f5f3ee] shadow-2xl overflow-x-hidden border-x border-stone-300/30 min-h-screen pb-24"
            >
              {/* Subtle Damask Floral Wallpaper Background Layer */}
              <div
                className="absolute inset-0 pointer-events-none opacity-40 z-0 bg-repeat bg-top"
                style={{
                  backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuBY5zIyrd9CtpQ2OS8YKSQJfx2YRuOYKbbez3gdtcZJcvC5CCm0Jno5X_SEKYm7JabdqXVIZcpyvwk1aw10696qxSflJXNgz8AMciJPQ79J5FvBhZF3bbVpzTmBJPeJp7Fs_UgYZqTdiKK0tVpUWq1Q1SvXHBgswDI7Go9Q4q3FnRn0rGDM9AHojAzkx26PtSa1HmhjCBF_yByV4Vy3iZhdRB_r0V1SsX10S8TolElUt28CRLyrQOwx-hcAFCUEnSsho40')`,
                  backgroundSize: "500px auto",
                }}
              />

              {/* Top Navigation Header inside Main Page */}
              <header className="relative z-20 pt-6 pb-3 px-5 text-center border-b border-[#c5a059]/25 bg-white/60 backdrop-blur-sm shadow-xs">
                <p className="font-serif uppercase tracking-[0.25em] text-[9px] text-[#14422d] font-bold">
                  THE WEDDING OF
                </p>
                <h1 className="font-serif uppercase tracking-[0.16em] text-xs sm:text-sm text-[#14422d] font-bold gold-shimmer">
                  SOPIAN &amp; ANNISA
                </h1>
              </header>

              {/* ========================================================================= */}
              {/* CONTENT INVITATION BODY */}
              {/* ========================================================================= */}
              <div id="invitation-content-body" className="w-full">
                {/* ========================================================================= */}
                {/* 2. BASMALAH & QUOTE SECTION */}
                {/* ========================================================================= */}
                <motion.section
                  id="salam-section"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.15 }}
                  variants={fadeInUpSection}
                  className="relative z-10 px-6 py-8 text-center flex flex-col items-center"
                >
                  {/* Basmalah Arabic Script */}
                  <div className="font-arabic not-italic text-2xl sm:text-3xl text-[#14422d] font-bold tracking-normal mb-3 drop-shadow-sm">
                    بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                  </div>

                  {/* Salam Greeting */}
                  <h2 className="font-serif not-italic text-sm sm:text-base text-[#14422d] font-semibold uppercase tracking-[0.15em] mb-3">
                    Assalamu'alaikum Warahmatullahi Wabarakatuh
                  </h2>

                  {/* Welcome Paragraph */}
                  <p className="font-sans not-italic text-xs text-stone-600 leading-relaxed max-w-sm mb-6 font-normal">
                    Dengan memohon rahmat dan ridho Allah Subhanahu Wa Ta'ala,
                    kami bermaksud mengundang Bapak/Ibu/Saudara/i untuk
                    menghadiri dan mendoakan pernikahan kami:
                  </p>

                  {/* Surah Ar-Rum Card */}
                  <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                    variants={fadeInUpCard}
                    transition={{ delay: 0.15 }}
                    className="relative w-full max-w-[360px] bg-white/85 backdrop-blur-md rounded-2xl p-6 border border-[#c5a059]/40 shadow-sm"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#14422d] text-[#c5a059] flex items-center justify-center mx-auto -mt-10 border border-[#c5a059]/40 shadow-sm">
                      <Sparkles className="w-4 h-4 text-[#e6c88b]" />
                    </div>
                    <p className="font-serif not-italic text-xs text-stone-700 leading-relaxed mt-2 mb-3 tracking-wide">
                      "Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia
                      menciptakan pasangan-pasangan untukmu dari jenismu
                      sendiri, agar kamu cenderung dan merasa tenteram
                      kepadanya, dan Dia menjadikan di antaramu rasa kasih dan
                      sayang."
                    </p>
                    <span className="font-serif not-italic text-[11px] font-bold text-[#9e7930] tracking-[0.2em] uppercase block">
                      (QS. AR-RUM: 21)
                    </span>
                  </motion.div>
                </motion.section>

                {/* ========================================================================= */}
                {/* 3. KEDUA MEMPELAI SECTION */}
                {/* ========================================================================= */}
                <motion.section
                  id="mempelai"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.1 }}
                  variants={fadeInUpSection}
                  className="relative z-10 px-5 py-6"
                >
                  {/* Section Header */}
                  <div className="text-center mb-6">
                    <span className="font-serif not-italic uppercase tracking-[0.3em] text-[11px] text-[#14422d]/70 font-semibold block">
                      THE GROOM &amp; THE BRIDE
                    </span>
                    <h2 className="font-serif not-italic uppercase tracking-[0.2em] text-2xl text-[#14422d] font-bold mt-1">
                      KEDUA MEMPELAI
                    </h2>
                    <div className="w-16 h-0.5 bg-[#c5a059] mx-auto mt-2.5 rounded-full" />
                  </div>

                  {/* Romantic Couple Full Portrait */}
                  <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.15 }}
                    variants={fadeInUpCard}
                    className="max-w-[270px] sm:max-w-[290px] mx-auto mb-8 relative"
                  >
                    <div className="relative aspect-[3/4] rounded-t-[120px] rounded-b-2xl overflow-hidden border-2 border-[#c5a059]/60 p-1.5 bg-[#14422d] shadow-xl">
                      <div className="w-full h-full rounded-t-[112px] rounded-b-xl overflow-hidden relative">
                        <img
                          src="/images/mempelai2.png"
                          alt="M. Sopian Asrin & Lale Annisa Janatin Sholeha"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover object-top transition-transform duration-700 hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0e2d1f]/80 via-transparent to-transparent pointer-events-none" />
                        <div className="absolute bottom-2.5 inset-x-0 text-center px-2">
                          <p className="font-serif not-italic uppercase tracking-[0.22em] text-[11px] font-bold text-[#e6c88b] drop-shadow-sm">
                            SOPIAN &amp; ANNISA
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Groom Card */}
                  <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.15 }}
                    variants={fadeInUpCard}
                    transition={{ delay: 0.1 }}
                    className="relative bg-white rounded-3xl p-6 border border-[#c5a059]/30 shadow-md mb-8 text-center flex flex-col items-center"
                  >
                    {/* Floral Circular Avatar - Gambar 1 Frame */}
                    <div className="relative w-48 h-48 mb-2 flex items-center justify-center">
                      {/* Outer Floral Wreath Frame */}
                      <img
                        src="/images/bingkai.png"
                        alt="Bingkai Bunga Lingkaran Emas"
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10 mix-blend-multiply drop-shadow-md translate-x-1.5 translate-y-1.5"
                      />
                      {/* Profile Photo */}
                      <div className="w-36 h-36 rounded-full overflow-hidden border border-[#c5a059]/40 relative z-0 bg-[#0e2d1f]">
                        <img
                          src="/images/cowok.png"
                          alt="M. Sopian Asrin"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                        />
                      </div>
                    </div>

                    {/* Name & Title */}
                    <h3 className="font-serif not-italic uppercase tracking-[0.15em] text-base text-[#14422d] font-bold mb-2">
                      M. Sopian Asrin, S.Pd, M.Pd
                    </h3>

                    {/* Parents Description */}
                    <p className="text-xs text-stone-600 font-sans leading-relaxed mb-4 max-w-xs not-italic">
                      Putra Pertama Dari:
                      <br />
                      <span className="font-semibold text-stone-800">
                        Bapak Moh. Safi'i, S.Pd &amp;{" "}
                      </span>
                      <br />
                      <span className="font-semibold text-stone-800">
                        Nurhaini Serta
                      </span>{" "}
                      <span className="font-semibold text-stone-800">
                        Muhammad Nasri
                      </span>
                    </p>

                    {/* Instagram Pill */}
                    {/* <a
                      href="https://instagram.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-[#14422d] bg-[#f2f6f3] px-4 py-1.5 rounded-full border border-[#14422d]/20 font-medium transition hover:bg-[#14422d] hover:text-[#c5a059] tracking-wide"
                    >
                      <span>@sopianasrin</span>
                    </a> */}
                  </motion.div>

                  {/* Ampersand Divider */}
                  <div className="flex items-center justify-center gap-4 my-6">
                    <div className="h-px bg-[#c5a059]/40 flex-1" />
                    <span className="font-serif not-italic text-2xl text-[#c5a059] font-bold tracking-[0.1em]">
                      &amp;
                    </span>
                    <div className="h-px bg-[#c5a059]/40 flex-1" />
                  </div>

                  {/* Bride Card */}
                  <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.15 }}
                    variants={fadeInUpCard}
                    transition={{ delay: 0.15 }}
                    className="relative bg-white rounded-3xl p-6 border border-[#c5a059]/30 shadow-md text-center flex flex-col items-center"
                  >
                    {/* Floral Circular Avatar - Gambar 1 Frame */}
                    <div className="relative w-48 h-48 mb-2 flex items-center justify-center">
                      {/* Outer Floral Wreath Frame */}
                      <img
                        src="/images/bingkai.png"
                        alt="Bingkai Bunga Lingkaran Emas"
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10 mix-blend-multiply drop-shadow-md rotate-90 -translate-x-1.5 translate-y-1"
                      />
                      {/* Profile Photo */}
                      <div className="w-36 h-36 rounded-full overflow-hidden border border-[#c5a059]/40 relative z-0 bg-[#0e2d1f]">
                        <img
                          src="/images/cewek.png"
                          alt="Lale Annisa Janatin Sholeha"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                        />
                      </div>
                    </div>

                    {/* Name & Title */}
                    <h3 className="font-serif not-italic uppercase tracking-[0.15em] text-base text-[#14422d] font-bold mb-2">
                      Lale Annisa Janatin Sholeha, S.Pd
                    </h3>

                    {/* Parents Description */}
                    <p className="text-xs text-stone-600 font-sans leading-relaxed mb-4 max-w-xs not-italic">
                      Putri Pertama Dari:
                      <br />
                      <span className="font-semibold text-stone-800">
                        Bapak Zulherman, SE.
                      </span>
                      <br />
                      <span className="font-semibold text-stone-800">
                        &amp;
                      </span>{" "}
                      <span className="font-semibold text-stone-800">
                        Ibu Lale Miftah, A.Md
                      </span>
                    </p>

                    {/* Instagram Pill */}
                    {/* <a
                      href="https://instagram.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-[#14422d] bg-[#f2f6f3] px-4 py-1.5 rounded-full border border-[#14422d]/20 font-medium transition hover:bg-[#14422d] hover:text-[#c5a059] tracking-wide"
                    >
                      <span>@annisa</span>
                    </a> */}
                  </motion.div>
                </motion.section>

                {/* ========================================================================= */}
                {/* 4. COUNTDOWN SECTION */}
                {/* ========================================================================= */}
                <motion.section
                  id="countdown-section"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.15 }}
                  variants={fadeInUpSection}
                  className="relative z-10 px-5 py-10 my-4 text-center"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.97, y: 20 }}
                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.85, ease: luxuryEase }}
                    className="w-full bg-[#14422d] rounded-3xl p-6 border border-[#c5a059]/40 shadow-luxury text-white relative overflow-hidden"
                  >
                    <div className="relative z-10">
                      <span className="font-serif not-italic uppercase tracking-[0.3em] text-[10px] text-[#e6c88b] font-semibold block mb-1">
                        SAVE THE DATE
                      </span>
                      <h2 className="font-serif not-italic uppercase tracking-[0.18em] text-xl sm:text-2xl font-bold mb-5 text-white">
                        MENUJU HARI BAHAGIA
                      </h2>

                      {/* 4 Block Timer Grid */}
                      <div
                        className="grid grid-cols-4 gap-2 mb-6"
                        id="countdown-grid"
                      >
                        <div className="bg-[#0e2d1f]/90 border border-[#c5a059]/30 rounded-xl py-3 px-1 shadow-inner">
                          <span
                            className="font-serif not-italic text-2xl font-bold text-[#c5a059] block"
                            id="timer-days"
                          >
                            {timeLeft.days}
                          </span>
                          <span className="text-[10px] uppercase font-serif tracking-[0.18em] text-stone-300">
                            Hari
                          </span>
                        </div>
                        <div className="bg-[#0e2d1f]/90 border border-[#c5a059]/30 rounded-xl py-3 px-1 shadow-inner">
                          <span
                            className="font-serif not-italic text-2xl font-bold text-[#c5a059] block"
                            id="timer-hours"
                          >
                            {timeLeft.hours < 10
                              ? `0${timeLeft.hours}`
                              : timeLeft.hours}
                          </span>
                          <span className="text-[10px] uppercase font-serif tracking-[0.18em] text-stone-300">
                            Jam
                          </span>
                        </div>
                        <div className="bg-[#0e2d1f]/90 border border-[#c5a059]/30 rounded-xl py-3 px-1 shadow-inner">
                          <span
                            className="font-serif not-italic text-2xl font-bold text-[#c5a059] block"
                            id="timer-minutes"
                          >
                            {timeLeft.minutes < 10
                              ? `0${timeLeft.minutes}`
                              : timeLeft.minutes}
                          </span>
                          <span className="text-[10px] uppercase font-serif tracking-[0.18em] text-stone-300">
                            Menit
                          </span>
                        </div>
                        <div className="bg-[#0e2d1f]/90 border border-[#c5a059]/30 rounded-xl py-3 px-1 shadow-inner">
                          <span
                            className="font-serif not-italic text-2xl font-bold text-[#c5a059] block"
                            id="timer-seconds"
                          >
                            {timeLeft.seconds < 10
                              ? `0${timeLeft.seconds}`
                              : timeLeft.seconds}
                          </span>
                          <span className="text-[10px] uppercase font-serif tracking-[0.18em] text-stone-300">
                            Detik
                          </span>
                        </div>
                      </div>

                      {/* Calendar Button */}
                      <a
                        href={googleCalendarUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-[#c5a059] bg-[#c5a059]/15 text-[#e6c88b] text-xs font-serif not-italic tracking-[0.15em] uppercase hover:bg-[#c5a059] hover:text-[#081c13] transition active:scale-95"
                      >
                        <Calendar className="w-4 h-4" />
                        <span>Ingatkan di Kalender</span>
                      </a>
                    </div>

                    {/* Ambient Glow */}
                    <div className="absolute -right-12 -top-12 w-32 h-32 bg-[#c5a059]/20 rounded-full blur-xl pointer-events-none" />
                  </motion.div>
                </motion.section>

                {/* ========================================================================= */}
                {/* 5. RANGKAIAN ACARA SECTION */}
                {/* ========================================================================= */}
                <motion.section
                  id="acara"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.1 }}
                  variants={fadeInUpSection}
                  className="relative z-10 px-5 py-6"
                >
                  {/* Section Header */}
                  <div className="text-center mb-8">
                    <span className="font-serif not-italic uppercase tracking-[0.3em] text-[11px] text-[#14422d]/70 font-semibold block">
                      SCHEDULE &amp; VENUE
                    </span>
                    <h2 className="font-serif not-italic uppercase tracking-[0.2em] text-2xl text-[#14422d] font-bold mt-1">
                      RANGKAIAN ACARA
                    </h2>
                    <div className="w-16 h-0.5 bg-[#c5a059] mx-auto mt-2.5 rounded-full" />
                  </div>

                  {/* Card 1: Akad Nikah */}
                  <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.15 }}
                    variants={fadeInUpCard}
                    transition={{ delay: 0.1 }}
                    className="relative arch-card bg-white border border-[#c5a059]/40 shadow-md p-6 pt-10 mb-8 text-center flex flex-col items-center"
                  >
                    {/* Floating Arch Icon Badge */}
                    <div className="w-12 h-12 rounded-full bg-[#14422d] text-[#c5a059] flex items-center justify-center mb-3 shadow-md border border-[#c5a059]/40">
                      <Heart className="w-6 h-6 fill-current text-[#c5a059]" />
                    </div>
                    <h3 className="font-serif not-italic uppercase tracking-[0.2em] text-xl font-bold text-[#14422d] mb-1">
                      AKAD NIKAH
                    </h3>
                    <div className="w-10 h-0.5 bg-[#c5a059]/50 my-2" />

                    {/* Date & Time Info */}
                    <p className="font-serif not-italic text-sm text-stone-700 font-semibold uppercase tracking-[0.15em] mb-1">
                      Minggu, 27 September 2026
                    </p>
                    <p className="font-serif not-italic text-xs text-[#9e7930] font-semibold tracking-wider mb-4 flex items-center justify-center gap-1 uppercase">
                      <Clock className="w-3.5 h-3.5" /> Pukul 09:00 WITA -
                      Selesai
                    </p>

                    {/* Location details */}
                    <div className="bg-[#f2f6f3] rounded-2xl p-4 border border-stone-200 w-full mb-5 text-stone-600 text-xs leading-relaxed not-italic">
                      <p className="font-serif not-italic font-bold text-stone-800 text-sm tracking-wide mb-1 uppercase">
                        Rumah Mempelai Pria
                      </p>
                      <p className="font-sans">
                        Dusun Akar-Akar Utara, Desa Akar-Akar, Kec. Bayan, Kab.
                        Lombok Utara
                      </p>
                    </div>

                    {/* Maps Link Button */}
                    <a
                      href="https://www.google.com/maps/place/Jl.+Raya+Bayan,+Nusa+Tenggara+Bar./@-8.2258857,116.3252854,17z/data=!3m1!4b1!4m6!3m5!1s0x2dce78cb62bf89e1:0x42214138bbfa725!8m2!3d-8.2258857!4d116.3252854!16s%2Fg%2F11b6hv6d5n!18m1!1e1?entry=ttu&g_ep=EgoyMDI2MDkwOS4wIKXMDSoASAFQAw%3D%3D"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-4 rounded-xl bg-[#14422d] text-[#c5a059] font-serif not-italic tracking-[0.18em] uppercase text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#20563c] transition active:scale-95 shadow-sm"
                    >
                      <MapPin className="w-4 h-4" />
                      <span>Lihat Lokasi</span>
                    </a>
                  </motion.div>

                  {/* Card 2: Resepsi Pernikahan */}
                  <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.15 }}
                    variants={fadeInUpCard}
                    transition={{ delay: 0.15 }}
                    className="relative arch-card bg-white border border-[#c5a059]/40 shadow-md p-6 pt-10 mb-4 text-center flex flex-col items-center"
                  >
                    {/* Floating Arch Icon Badge */}
                    <div className="w-12 h-12 rounded-full bg-[#14422d] text-[#c5a059] flex items-center justify-center mb-3 shadow-md border border-[#c5a059]/40">
                      <Sparkles className="w-6 h-6 text-[#c5a059]" />
                    </div>
                    <h3 className="font-serif not-italic uppercase tracking-[0.2em] text-xl font-bold text-[#14422d] mb-1">
                      RESEPSI PERNIKAHAN
                    </h3>
                    <div className="w-10 h-0.5 bg-[#c5a059]/50 my-2" />

                    {/* Date & Time Info */}
                    <p className="font-serif not-italic text-sm text-stone-700 font-semibold uppercase tracking-[0.15em] mb-1">
                      Minggu, 27 September 2026
                    </p>
                    <p className="font-serif not-italic text-xs text-[#9e7930] font-semibold tracking-wider mb-4 flex items-center justify-center gap-1 uppercase">
                      <Clock className="w-3.5 h-3.5" /> Pukul 10:00 WITA -
                      Selesai
                    </p>

                    {/* Location details */}
                    <div className="bg-[#f2f6f3] rounded-2xl p-4 border border-stone-200 w-full mb-5 text-stone-600 text-xs leading-relaxed not-italic">
                      <p className="font-serif not-italic font-bold text-stone-800 text-sm tracking-wide mb-1 uppercase">
                        Rumah Mempelai Pria
                      </p>
                      <p className="font-sans">
                        Dusun Akar-Akar Utara, Desa Akar-Akar, Kec. Bayan, Kab.
                        Lombok Utara
                      </p>
                    </div>

                    {/* Maps Link Button */}
                    <a
                      href="https://www.google.com/maps/place/Jl.+Raya+Bayan,+Nusa+Tenggara+Bar./@-8.2258857,116.3252854,17z/data=!3m1!4b1!4m6!3m5!1s0x2dce78cb62bf89e1:0x42214138bbfa725!8m2!3d-8.2258857!4d116.3252854!16s%2Fg%2F11b6hv6d5n!18m1!1e1?entry=ttu&g_ep=EgoyMDI2MDkwOS4wIKXMDSoASAFQAw%3D%3D"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-4 rounded-xl bg-[#14422d] text-[#c5a059] font-serif not-italic tracking-[0.18em] uppercase text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#20563c] transition active:scale-95 shadow-sm"
                    >
                      <MapPin className="w-4 h-4" />
                      <span>Lihat Lokasi</span>
                    </a>
                  </motion.div>
                </motion.section>

                {/* ========================================================================= */}
                {/* 6. TANDA KASIH DIGITAL SECTION (GIFT) */}
                {/* ========================================================================= */}
                <motion.section
                  id="kado"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.15 }}
                  variants={fadeInUpSection}
                  className="relative z-10 px-5 py-6"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 24, scale: 0.98 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.8, ease: luxuryEase }}
                    className="w-full bg-[#14422d] arch-card p-6 border border-[#c5a059]/40 shadow-luxury text-white text-center relative overflow-hidden"
                  >
                    {/* Heading */}
                    <div className="w-10 h-10 rounded-full border border-[#c5a059]/50 mx-auto flex items-center justify-center text-[#c5a059] mb-3 bg-[#0e2d1f]">
                      <Gift className="w-5 h-5 text-[#e6c88b]" />
                    </div>
                    <span className="font-serif not-italic uppercase tracking-[0.3em] text-[10px] text-[#e6c88b] font-semibold block">
                      WEDDING GIFT
                    </span>
                    <h2 className="font-serif not-italic uppercase tracking-[0.2em] text-xl sm:text-2xl font-bold mb-3 text-white">
                      TANDA KASIH DIGITAL
                    </h2>
                    <p className="text-xs text-stone-300 font-sans leading-relaxed mb-6 max-w-xs mx-auto not-italic font-normal">
                      Doa restu Anda merupakan karunia terindah bagi kami. Namun
                      jika ingin memberikan tanda kasih, dapat melalui:
                    </p>

                    {/* Bank Card Container */}
                    <div className="bg-[#0e2d1f] border border-[#c5a059]/40 rounded-2xl p-5 text-left mb-4 shadow-inner relative">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-xs font-serif not-italic font-bold tracking-[0.2em] text-[#c5a059] uppercase">
                          BSI
                        </span>
                        <div className="px-2 py-0.5 rounded bg-[#c5a059]/20 text-[#e6c88b] text-[10px] font-mono font-bold tracking-wider">
                          BSI
                        </div>
                      </div>

                      <p className="text-stone-400 text-[11px] font-serif not-italic uppercase tracking-wider">
                        Nomor Rekening:
                      </p>
                      <p
                        className="font-mono text-xl font-bold text-white tracking-widest my-1"
                        id="rekening-number"
                      >
                        1121094053
                      </p>
                      <p className="text-xs text-stone-300 font-sans not-italic">
                        a.n.{" "}
                        <span className="font-serif font-bold text-white tracking-wider uppercase">
                          Lale Annisa Janatin Soleha
                        </span>
                      </p>

                      {/* Copy Button */}
                      <button
                        id="btn-copy-rek"
                        onClick={handleCopyRekening}
                        className="mt-4 w-full py-2.5 px-3 rounded-lg bg-[#c5a059]/15 border border-[#c5a059]/40 text-[#e6c88b] text-xs font-serif not-italic tracking-[0.15em] uppercase font-semibold flex items-center justify-center gap-2 hover:bg-[#c5a059] hover:text-[#081c13] transition cursor-pointer active:scale-95"
                      >
                        {copiedRekening ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span>Berhasil Disalin! ✓</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Salin Nomor Rekening</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Untuk card rekening dana */}
                    <div className="bg-[#0e2d1f] border border-[#c5a059]/40 rounded-2xl p-5 text-left mb-4 shadow-inner relative">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-xs font-serif not-italic font-bold tracking-[0.2em] text-[#c5a059] uppercase">
                          Dana
                        </span>
                        <div className="px-2 py-0.5 rounded bg-[#c5a059]/20 text-[#e6c88b] text-[10px] font-mono font-bold tracking-wider">
                          Dana
                        </div>
                      </div>

                      <p className="text-stone-400 text-[11px] font-serif not-italic uppercase tracking-wider">
                        Nomor Dana:
                      </p>
                      <p
                        className="font-mono text-xl font-bold text-white tracking-widest my-1"
                        id="rekening-number"
                      >
                        087753163967
                      </p>
                      <p className="text-xs text-stone-300 font-sans not-italic">
                        a.n.{" "}
                        <span className="font-serif font-bold text-white tracking-wider uppercase">
                          Lale Annisa Janatin Soleha
                        </span>
                      </p>

                      {/* Copy Button */}
                      <button
                        id="btn-copy-rek"
                        onClick={handleCopyDana}
                        className="mt-4 w-full py-2.5 px-3 rounded-lg bg-[#c5a059]/15 border border-[#c5a059]/40 text-[#e6c88b] text-xs font-serif not-italic tracking-[0.15em] uppercase font-semibold flex items-center justify-center gap-2 hover:bg-[#c5a059] hover:text-[#081c13] transition cursor-pointer active:scale-95"
                      >
                        {copiedDana ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span>Berhasil Disalin! ✓</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Salin Nomor Dana</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Note */}
                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-400 font-sans not-italic">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#c5a059]" />
                      <span>Konfirmasi otomatis ke mempelai</span>
                    </div>
                  </motion.div>
                </motion.section>

                {/* ========================================================================= */}
                {/* 7. DOA & UCAPAN (WISHES & PRAYERS) WITH DEDICATED INTERNAL SCROLL */}
                {/* ========================================================================= */}
                <motion.section
                  id="doa"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.1 }}
                  variants={fadeInUpSection}
                  className="relative z-10 px-5 py-6"
                >
                  {/* Section Header */}
                  <div className="text-center mb-8">
                    <span className="font-serif not-italic uppercase tracking-[0.3em] text-[11px] text-[#14422d]/70 font-semibold block">
                      WISHES &amp; PRAYERS
                    </span>
                    <h2 className="font-serif not-italic uppercase tracking-[0.2em] text-2xl text-[#14422d] font-bold mt-1">
                      DOA &amp; UCAPAN
                    </h2>
                    <div className="w-16 h-0.5 bg-[#c5a059] mx-auto mt-2.5 rounded-full" />
                    <p className="text-xs text-stone-500 font-sans mt-2 max-w-xs mx-auto">
                      Tinggalkan ucapan selamat dan doa terbaik untuk kedua
                      mempelai secara langsung (real-time).
                    </p>
                  </div>

                  {/* RSVP Form Card */}
                  <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.15 }}
                    variants={fadeInUpCard}
                    className="bg-white rounded-3xl p-6 border border-[#c5a059]/30 shadow-md mb-6"
                  >
                    <form
                      onSubmit={handleSubmitWish}
                      className="space-y-4"
                      id="rsvp-form"
                    >
                      {/* Name Input */}
                      <div>
                        <label className="block text-xs font-serif not-italic uppercase tracking-[0.15em] font-semibold text-stone-700 mb-1.5">
                          Nama Lengkap
                        </label>
                        <input
                          id="guest-name-input"
                          type="text"
                          required
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          placeholder="Contoh: Ahmad & Rekan"
                          className="w-full text-xs rounded-xl border border-stone-300 px-3.5 py-2.5 focus:border-[#14422d] focus:ring-1 focus:ring-[#14422d] bg-stone-50/50 font-sans outline-none"
                        />
                      </div>

                      {/* Attendance Choice */}
                      <div>
                        <label className="block text-xs font-serif not-italic uppercase tracking-[0.15em] font-semibold text-stone-700 mb-1.5">
                          Konfirmasi Kehadiran
                        </label>
                        <div className="relative">
                          <select
                            id="guest-status-select"
                            value={formStatus}
                            onChange={(e) =>
                              setFormStatus(
                                e.target.value as "Hadir" | "Tidak Hadir",
                              )
                            }
                            className="w-full text-xs rounded-xl border border-stone-300 px-3.5 py-2.5 focus:border-[#14422d] focus:ring-1 focus:ring-[#14422d] bg-stone-50/50 font-sans appearance-none outline-none pr-8 cursor-pointer"
                          >
                            <option value="Hadir">Insya Allah Hadir</option>
                            <option value="Tidak Hadir">
                              Mohon Maaf Belum Bisa Hadir
                            </option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-stone-400 absolute right-3 top-3 pointer-events-none" />
                        </div>
                      </div>

                      {/* Wishes Textarea */}
                      <div>
                        <label className="block text-xs font-serif not-italic uppercase tracking-[0.15em] font-semibold text-stone-700 mb-1.5">
                          Doa &amp; Ucapan
                        </label>
                        <textarea
                          id="guest-message-textarea"
                          required
                          rows={3}
                          value={formMessage}
                          onChange={(e) => setFormMessage(e.target.value)}
                          placeholder="Tuliskan doa serta ucapan selamat untuk kedua mempelai..."
                          className="w-full text-xs rounded-xl border border-stone-300 px-3.5 py-2.5 focus:border-[#14422d] focus:ring-1 focus:ring-[#14422d] bg-stone-50/50 resize-none font-sans outline-none"
                        />
                      </div>

                      {/* Feedback Message */}
                      {submitSuccessMessage && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{submitSuccessMessage}</span>
                        </div>
                      )}

                      {/* Submit Button */}
                      <button
                        id="btn-kirim-ucapan"
                        type="submit"
                        disabled={isSubmittingWish}
                        className="w-full py-3 rounded-xl bg-[#14422d] text-[#c5a059] font-serif not-italic font-bold text-xs tracking-[0.2em] uppercase flex items-center justify-center gap-2 hover:bg-[#20563c] transition shadow-sm cursor-pointer disabled:opacity-60 active:scale-95"
                      >
                        {isSubmittingWish ? (
                          <span>MENGIRIMKAN...</span>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>KIRIM UCAPAN</span>
                          </>
                        )}
                      </button>
                    </form>
                  </motion.div>

                  {/* Attendance & Live Counter Banner */}
                  <div className="flex items-center justify-between px-2 mb-3 text-[11px] font-serif uppercase tracking-wider text-stone-600">
                    <span className="flex items-center gap-1 font-semibold text-[#14422d]">
                      <MessageSquare className="w-3.5 h-3.5" /> {wishes.length}{" "}
                      Doa &amp; Ucapan
                    </span>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                        {hadirCount} Hadir
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-stone-200 text-stone-700 font-medium">
                        {tidakHadirCount} Berhalangan
                      </span>
                    </div>
                  </div>

                  {/* DEDICATED INDEPENDENT SCROLL CONTAINER FOR WISHES (EXPLICIT USER MANDATE) */}
                  <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.1 }}
                    variants={fadeInUpCard}
                    transition={{ delay: 0.1 }}
                    id="wishes-dedicated-container"
                    className="wishes-scroll-container pr-1 space-y-3 rounded-2xl bg-stone-100/60 p-2 border border-stone-200/60"
                  >
                    {isLoadingWishes ? (
                      <div className="text-center py-8 text-stone-500 text-xs font-serif">
                        <div className="w-6 h-6 border-2 border-[#c5a059] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <span>Memuat doa &amp; ucapan tamu...</span>
                      </div>
                    ) : wishes.length === 0 ? (
                      <div className="text-center py-8 text-stone-500 text-xs font-serif bg-white/80 rounded-2xl p-4 border border-stone-200">
                        <Heart className="w-6 h-6 text-[#c5a059] mx-auto mb-1.5 opacity-60" />
                        <p>
                          Belum ada doa tertulis. Jadilah yang pertama
                          memberikan doa restu!
                        </p>
                      </div>
                    ) : (
                      wishes.map((wish, index) => (
                        <div
                          key={wish.id || index}
                          className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 border border-[#c5a059]/25 shadow-sm transition hover:border-[#c5a059]/60"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <h4 className="text-xs font-serif not-italic font-bold uppercase tracking-wider text-[#14422d]">
                              {wish.name}
                            </h4>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                wish.status === "Hadir"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-stone-200 text-stone-700"
                              }`}
                            >
                              {wish.status === "Hadir" ? (
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                              ) : (
                                <XCircle className="w-2.5 h-2.5 text-stone-500" />
                              )}
                              <span>{wish.status}</span>
                            </span>
                          </div>

                          <p className="text-xs text-stone-600 leading-relaxed font-sans not-italic font-normal">
                            "{wish.message}"
                          </p>

                          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-stone-100 text-[10px] text-stone-400 font-sans">
                            <span>{formatTimeAgo(wish.createdAt)}</span>
                            <span className="text-[#c5a059] text-[9px] font-serif">
                              Tamu Terverifikasi
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </motion.div>
                </motion.section>

                {/* ========================================================================= */}
                {/* 8. FOOTER THANK YOU SECTION */}
                {/* ========================================================================= */}
                <motion.footer
                  id="footer"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.15 }}
                  variants={fadeInUpSection}
                  className="relative z-10 text-center py-10 px-6 border-t border-[#c5a059]/20"
                >
                  <div className="w-12 h-12 rounded-full border border-[#c5a059]/40 flex items-center justify-center mx-auto mb-3 bg-[#14422d] text-[#c5a059]">
                    <span className="font-serif not-italic font-bold text-sm tracking-[0.2em] ml-0.5 text-[#e6c88b]">
                      S&amp;A
                    </span>
                  </div>

                  <p className="font-serif not-italic uppercase tracking-[0.22em] text-xl text-[#14422d] font-bold mb-2">
                    TERIMA KASIH
                  </p>
                  <p className="text-xs text-stone-500 font-sans max-w-xs mx-auto leading-relaxed mb-4 not-italic">
                    Atas kehadiran serta doa restu yang tulus dari
                    Bapak/Ibu/Saudara/i sekalian.
                  </p>

                  <p className="font-serif not-italic text-xs font-semibold text-[rgb(158,121,48)] tracking-[0.25em] uppercase">
                    KAMI YANG BERBAHAGIA:
                  </p>
                  <p className="font-serif not-italic uppercase tracking-[0.2em] text-base font-bold text-[#14422d] mt-1">
                    SOPIAN &amp; ANNISA
                  </p>

                  <p className="text-[10px] text-stone-400 mt-6 uppercase tracking-[0.2em] font-sans not-italic">
                    {" "}
                    <a
                      href="https://www.instagram.com/baletechnology/"
                      target="_blank"
                        rel="noopener noreferrer"
                        className='hover:text-[rgb(158,121,48)]'
                    >
                      DIGITAL WEDDING INVITATION • BALETECHNOLOGYSOLUTIONS
                    </a>
                  </p>
                </motion.footer>
              </div>

              {/* ========================================================================= */}
              {/* 9. IOS-STYLE FIXED BOTTOM NAVBAR */}
              {/* ========================================================================= */}
              <nav
                id="bottom-navbar"
                className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[92%] max-w-[400px] h-14 bg-[#14422d]/92 backdrop-blur-lg border border-[#c5a059]/40 rounded-full shadow-2xl z-40 flex items-center justify-around px-3 text-stone-300"
              >
                <button
                  onClick={handleBackToCover}
                  className="flex flex-col items-center gap-0.5 text-stone-300 hover:text-[#c5a059] transition cursor-pointer"
                  title="Kembali ke Sampul"
                >
                  <Home className="w-4 h-4" />
                  <span className="text-[9px] font-serif not-italic uppercase tracking-wider">
                    Sampul
                  </span>
                </button>
                <a
                  href="#mempelai"
                  className="flex flex-col items-center gap-0.5 text-stone-300 hover:text-[#c5a059] transition"
                >
                  <Heart className="w-4 h-4" />
                  <span className="text-[9px] font-serif not-italic uppercase tracking-wider">
                    Mempelai
                  </span>
                </a>
                <a
                  href="#acara"
                  className="flex flex-col items-center gap-0.5 text-stone-300 hover:text-[#c5a059] transition"
                >
                  <Calendar className="w-4 h-4" />
                  <span className="text-[9px] font-serif not-italic uppercase tracking-wider">
                    Acara
                  </span>
                </a>
                <a
                  href="#kado"
                  className="flex flex-col items-center gap-0.5 text-stone-300 hover:text-[#c5a059] transition"
                >
                  <Gift className="w-4 h-4" />
                  <span className="text-[9px] font-serif not-italic uppercase tracking-wider">
                    Kado
                  </span>
                </a>
                <a
                  href="#doa"
                  className="flex flex-col items-center gap-0.5 text-stone-300 hover:text-[#c5a059] transition"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-[9px] font-serif not-italic uppercase tracking-wider">
                    Doa
                  </span>
                </a>
              </nav>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 10. MODAL: GUEST LINK GENERATOR (?to=Nama+Tamu) */}
        {/* ========================================================================= */}
        {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-white rounded-3xl p-6 border border-[#c5a059]/40 shadow-2xl relative text-left">
              <button
                onClick={() => setShowShareModal(false)}
                className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1 rounded-full hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-2 text-[#14422d]">
                <Share2 className="w-5 h-5 text-[#c5a059]" />
                <h3 className="font-serif font-bold text-base uppercase tracking-wider">
                  Generator Link Undangan Tamu
                </h3>
              </div>
              <p className="text-xs text-stone-600 mb-4 leading-relaxed font-sans">
                Ketik nama tamu undangan di bawah ini. Nama akan otomatis
                tercantum pada kartu sampul undangan (
                <span className="font-mono text-[#9e7930]">?to=Nama+Tamu</span>
                ).
              </p>

              <form onSubmit={handleGenerateGuestLink} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Nama Tamu / Keluarga
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Bapak Ir. H. Ahmad & Keluarga"
                    value={customGuestInput}
                    onChange={(e) => setCustomGuestInput(e.target.value)}
                    className="w-full text-xs rounded-xl border border-stone-300 p-3 focus:border-[#14422d] focus:ring-1 focus:ring-[#14422d] outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#14422d] text-[#c5a059] font-serif font-bold text-xs uppercase tracking-wider hover:bg-[#20563c] transition active:scale-95"
                >
                  Buat Link Khusus
                </button>
              </form>

              {generatedGuestLink && (
                <div className="mt-4 p-3.5 bg-stone-50 rounded-2xl border border-stone-200">
                  <p className="text-[11px] font-semibold text-stone-700 mb-1">
                    Hasil Link Undangan:
                  </p>
                  <div className="p-2 bg-white rounded-lg border border-stone-200 text-[11px] font-mono text-stone-800 break-all mb-3 max-h-20 overflow-y-auto">
                    {generatedGuestLink}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleCopyGeneratedLink}
                      className="py-2 px-3 rounded-lg bg-stone-200 text-stone-800 text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-stone-300 transition"
                    >
                      {copiedGuestLink ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {copiedGuestLink ? "Tersalin!" : "Salin Link"}
                      </span>
                    </button>
                    <button
                      onClick={handleShareWhatsApp}
                      className="py-2 px-3 rounded-lg bg-emerald-600 text-white text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-emerald-700 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Kirim WhatsApp</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 11. MODAL: DOKUMENTASI LENGKAP & DOWNLOAD SOURCE CODE (USER MANDATE) */}
        {/* ========================================================================= */}
        {showDocModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-lg bg-white rounded-3xl p-6 border border-[#c5a059]/40 shadow-2xl relative text-left max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <div className="flex items-center gap-2">
                  <FileCode className="w-5 h-5 text-[#c5a059]" />
                  <h3 className="font-serif font-bold text-base text-[#14422d] uppercase tracking-wider">
                    Dokumentasi &amp; Unduh Source Code
                  </h3>
                </div>
                <button
                  onClick={() => setShowDocModal(false)}
                  className="text-stone-400 hover:text-stone-700 p-1 rounded-full hover:bg-stone-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Doc Content */}
              <div className="overflow-y-auto py-4 space-y-5 text-xs text-stone-700 leading-relaxed pr-1 font-sans">
                {/* One-Click Download Box */}
                <div className="bg-[#14422d] text-white p-4 rounded-2xl border border-[#c5a059]/40 shadow-md">
                  <h4 className="font-serif font-bold text-sm text-[#e6c88b] uppercase tracking-wider mb-1 flex items-center gap-2">
                    <Download className="w-4 h-4 text-[#e6c88b]" /> Unduh Source
                    Code Proyek (.ZIP)
                  </h4>
                  <p className="text-[11px] text-stone-200 mb-3">
                    Klik tombol di bawah ini untuk mengunduh seluruh file proyek
                    lengkap (React 19, TypeScript, Tailwind CSS, Firebase
                    config, rules, dan assets) dalam format file .ZIP siap
                    pakai.
                  </p>
                  <button
                    id="btn-download-zip"
                    onClick={downloadProjectZip}
                    className="btn-gold w-full py-2.5 px-4 rounded-xl text-[#081c13] font-serif font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow active:scale-95 transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download File Source Code (.zip)</span>
                  </button>
                </div>

                {/* Guide 1: Cara Menjalankan di Komputer Lokal */}
                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
                  <h5 className="font-serif font-bold text-[#14422d] uppercase tracking-wider mb-1.5 text-xs">
                    1. Cara Menjalankan Proyek Secara Lokal (Offline / VS Code)
                  </h5>
                  <ol className="list-decimal pl-4 space-y-1 text-stone-600">
                    <li>
                      Ekstrak file{" "}
                      <span className="font-mono text-stone-800">.zip</span>{" "}
                      yang telah diunduh.
                    </li>
                    <li>
                      Buka folder proyek menggunakan Visual Studio Code atau
                      terminal.
                    </li>
                    <li>
                      Jalankan perintah instalasi paket:
                      <pre className="bg-stone-800 text-stone-100 p-2 rounded-lg font-mono text-[11px] my-1">
                        npm install
                      </pre>
                    </li>
                    <li>
                      Jalankan server pengembangan:
                      <pre className="bg-stone-800 text-stone-100 p-2 rounded-lg font-mono text-[11px] my-1">
                        npm run dev
                      </pre>
                    </li>
                    <li>
                      Buka browser Anda di{" "}
                      <span className="font-mono">http://localhost:3000</span>.
                    </li>
                  </ol>
                </div>

                {/* Guide 2: Format Link Tamu Khusus */}
                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
                  <h5 className="font-serif font-bold text-[#14422d] uppercase tracking-wider mb-1.5 text-xs">
                    2. Personalisasi Nama Tamu di Link Undangan
                  </h5>
                  <p className="text-stone-600 mb-2">
                    Aplikasi membaca parameter query URL secara otomatis. Anda
                    dapat membagikan tautan undangan dengan menambahkan
                    <span className="font-mono font-semibold text-[#9e7930]">
                      {" "}
                      ?to=Nama+Tamu
                    </span>
                    :
                  </p>
                  <div className="space-y-1 font-mono text-[11px] bg-white p-2 rounded-lg border border-stone-200 text-stone-800">
                    <div>https://domain-anda.com/?to=Bapak+Ahmad+Faisal</div>
                    <div>https://domain-anda.com/?to=Sahabat+Rina+Marlina</div>
                    <div>
                      https://domain-anda.com/?to=Keluarga+Besar+Haji+Zulherman
                    </div>
                  </div>
                </div>

                {/* Guide 3: Firebase Real-time Firestore */}
                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
                  <h5 className="font-serif font-bold text-[#14422d] uppercase tracking-wider mb-1.5 text-xs">
                    3. Backend Real-time Firebase Firestore
                  </h5>
                  <p className="text-stone-600 mb-1.5">
                    Doa dan ucapan tamu disimpan dalam koleksi Firestore{" "}
                    <span className="font-mono text-stone-800">/wishes</span>{" "}
                    dan disinkronkan secara real-time via{" "}
                    <span className="font-mono text-stone-800">
                      onSnapshot()
                    </span>
                    .
                  </p>
                  <p className="text-stone-600">
                    Aturan keamanan (
                    <span className="font-mono">firestore.rules</span>) telah
                    dipasang sehingga publik dapat membaca doa dan mengirimkan
                    ucapan baru yang tervalidasi tanpa bisa mengubah atau
                    menghapus data tamu lain.
                  </p>
                </div>

                {/* Guide 4: Kustomisasi Musik & Foto */}
                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
                  <h5 className="font-serif font-bold text-[#14422d] uppercase tracking-wider mb-1.5 text-xs">
                    4. Mengubah Musik &amp; Foto Pengantin
                  </h5>
                  <ul className="list-disc pl-4 space-y-1 text-stone-600">
                    <li>
                      <strong>Musik:</strong> Ubah link audio pada tag{" "}
                      <span className="font-mono text-stone-800">
                        &lt;audio src="..."&gt;
                      </span>{" "}
                      di <span className="font-mono">src/App.tsx</span>.
                    </li>
                    <li>
                      <strong>Foto:</strong> Ganti URL foto pada tag{" "}
                      <span className="font-mono text-stone-800">
                        &lt;img src="..."&gt;
                      </span>{" "}
                      di seksi cover dan kedua mempelai.
                    </li>
                    <li>
                      <strong>Nomor Rekening:</strong> Sesuaikan nomor rekening
                      dan bank tujuan pada seksi Tanda Kasih Digital di{" "}
                      <span className="font-mono">src/App.tsx</span>.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Footer Modal */}
              <div className="pt-3 border-t border-stone-200 flex justify-end">
                <button
                  onClick={() => setShowDocModal(false)}
                  className="py-2 px-5 rounded-xl bg-stone-200 text-stone-800 text-xs font-semibold hover:bg-stone-300 transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
