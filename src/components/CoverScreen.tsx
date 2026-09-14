/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Calendar, Heart } from "lucide-react";
import { weddingConfig } from "../weddingConfig";

interface CoverScreenProps {
  guestName: string;
  onOpenInvitation: () => void;
  onOpenShareModal?: () => void;
  onOpenDocModal?: () => void;
}

export const CoverScreen: React.FC<CoverScreenProps> = ({
  guestName,
  onOpenInvitation,
}) => {
  const [isClosing, setIsClosing] = useState(false);

  const handleOpenClick = () => {
    if (isClosing) return;
    setIsClosing(true);
    // Smooth exit transition before unmounting
    setTimeout(() => {
      onOpenInvitation();
    }, 650);
  };

  return (
    <div
      key="cover-screen"
      className={`fixed inset-0 z-50 flex justify-center bg-[#081c13] overflow-y-auto select-none transition-all duration-700 ease-out ${
        isClosing
          ? "opacity-0 -translate-y-8 scale-95 pointer-events-none"
          : "opacity-100 translate-y-0 scale-100"
      }`}
    >
      {/* Outer Desktop Subtle Glow */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#14422d]/30 via-[#081c13]/80 to-[#081c13] z-0" />

      {/* Centered Mobile Container matching main invitation */}
      <div className="w-full max-w-[440px] min-h-screen relative bg-[#f5f3ee] shadow-2xl overflow-x-hidden border-x border-stone-300/30 flex flex-col justify-between items-center py-6 px-4 z-10">
        {/* Damask Floral Wallpaper Background Layer - Guaranteed Full Coverage */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40 z-0 bg-repeat bg-top"
          style={{
            backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuBY5zIyrd9CtpQ2OS8YKSQJfx2YRuOYKbbez3gdtcZJcvC5CCm0Jno5X_SEKYm7JabdqXVIZcpyvwk1aw10696qxSflJXNgz8AMciJPQ79J5FvBhZF3bbVpzTmBJPeJp7Fs_UgYZqTdiKK0tVpUWq1Q1SvXHBgswDI7Go9Q4q3FnRn0rGDM9AHojAzkx26PtSa1HmhjCBF_yByV4Vy3iZhdRB_r0V1SsX10S8TolElUt28CRLyrQOwx-hcAFCUEnSsho40')`,
            backgroundSize: "500px auto",
          }}
        />

        {/* Main Cover Card Frame */}
        <div className="w-full max-w-[390px] relative z-10 my-auto flex flex-col items-center">
          {/* Top Flourish Garland - Gambar 2 Floral Arrangement */}
          <div className="w-full max-w-[340px] mb-[-24px] sm:mb-[-28px] relative z-20 pointer-events-none px-2">
            <img
              src="/images/bunga.png"
              alt="Bunga Sampul Undangan"
              className="w-full h-auto drop-shadow-xl mix-blend-multiply"
            />
          </div>

          {/* Arch Card Container */}
          <div className="w-full arch-card bg-[#14422d] p-1.5 sm:p-2 border border-[#c5a059]/50 shadow-luxury relative overflow-hidden">
            {/* Inner Golden Border */}
            <div className="w-full arch-inner border border-[#c5a059]/30 p-4 sm:p-5 flex flex-col items-center text-center relative z-10">
              {/* Monogram Seal */}
              <div className="w-12 h-12 rounded-full border border-[#c5a059]/60 flex items-center justify-center mb-2 bg-[#0e2d1f]/90 shadow-inner">
                <span className="font-serif not-italic text-[#e6c88b] text-base sm:text-lg font-bold tracking-[0.2em] ml-1">
                  S&amp;A
                </span>
              </div>

              {/* Subtitle */}
              <p className="font-serif not-italic uppercase tracking-[0.35em] text-[10px] sm:text-[11px] text-[#e6c88b] font-medium mb-2">
                THE WEDDING OF
              </p>

              {/* Arch Portrait Container */}
              <div className="w-full max-w-[190px] sm:max-w-[210px] aspect-[4/5] rounded-t-[100px] sm:rounded-t-[115px] rounded-b-xl overflow-hidden relative border-2 border-[#c5a059]/60 p-1 mb-2.5 sm:mb-3 bg-[#0e2d1f] shadow-lg">
                <div className="w-full h-full rounded-t-[96px] sm:rounded-t-[111px] rounded-b-lg overflow-hidden relative">
                  <img
                    src={weddingConfig.couple.togetherImage}
                    alt={weddingConfig.couple.jointTitle}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-top scale-105 transition-transform duration-700 hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#081c13]/85 via-transparent to-transparent pointer-events-none" />
                </div>
              </div>

              {/* Couple Names */}
              <h1 className="font-serif not-italic uppercase tracking-[0.22em] text-xl sm:text-2xl md:text-3xl gold-shimmer font-bold mb-1.5 sm:mb-2 drop-shadow-md py-0.5">
                {weddingConfig.couple.jointTitle}
              </h1>

              {/* Date Pill */}
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-[#c5a059]/35 bg-[#0e2d1f]/90 text-[#e6c88b] text-[10px] sm:text-[11px] font-serif not-italic tracking-[0.2em] uppercase mb-3">
                <Calendar className="w-3.5 h-3.5 text-[#e6c88b]" />
                <span className="font-medium">
                  {weddingConfig.schedule.displayDate}
                </span>
              </div>

              {/* Guest Recipient Box */}
              <div className="w-full bg-[#0e2d1f]/90 border border-[#c5a059]/35 rounded-2xl p-3 sm:p-3.5 mb-3 shadow-sm">
                <p className="text-[10px] sm:text-[11px] font-sans text-stone-300 mb-0.5 tracking-wider uppercase font-medium">
                  Kepada Yth. Bapak/Ibu/Saudara/i:
                </p>
                <h2 className="font-serif not-italic text-sm sm:text-base font-bold text-white tracking-[0.16em] uppercase py-0.5">
                  {guestName}
                </h2>
                <p className="text-[9px] text-stone-400 mt-0.5 not-italic font-sans tracking-normal">
                  *Mohon maaf bila ada kesalahan penulisan nama &amp; gelar
                </p>
              </div>

              {/* Primary Action Button */}
              <button
                id="btn-buka-undangan-cover"
                onClick={handleOpenClick}
                className="btn-gold w-full py-3 sm:py-3.5 px-6 rounded-full text-[#081c13] font-serif not-italic font-bold text-xs tracking-[0.25em] uppercase flex items-center justify-center gap-2.5 transition transform hover:scale-[1.02] active:scale-95 shadow-xl cursor-pointer"
              >
                <Heart className="w-4 h-4 fill-current animate-pulse text-[#081c13]" />
                <span>BUKA UNDANGAN</span>
              </button>

              {/* Audio & Hint Note */}
              <p className="text-[10px] text-[#e6c88b]/75 mt-2.5 font-sans tracking-wide">
                Ketuk tombol untuk membuka undangan &amp; memutar musik
              </p>
            </div>
          </div>
        </div>

        {/* Bottom subtle brand credit */}
        <div className="relative z-10 mt-3 text-center">
          <p className="font-serif uppercase tracking-[0.25em] text-[8px] text-stone-500">
            Exclusive Digital Wedding Invitation
          </p>
        </div>
      </div>
    </div>
  );
};
