/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';

interface PetalConfig {
  id: number;
  left: number; // percentage 0-100
  size: number; // in pixels
  animationDuration: number; // in seconds
  animationDelay: number; // in seconds
  swayDuration: number; // in seconds
  rotationStart: number;
  rotationEnd: number;
  type: 'white-jasmine' | 'blush-rose' | 'gold-leaf';
  opacity: number;
}

export const FallingPetals: React.FC<{ count?: number }> = ({ count = 22 }) => {
  // Generate stable randomized petal attributes
  const petals: PetalConfig[] = useMemo(() => {
    const list: PetalConfig[] = [];
    const types: ('white-jasmine' | 'blush-rose' | 'gold-leaf')[] = [
      'white-jasmine',
      'blush-rose',
      'white-jasmine',
      'gold-leaf',
      'blush-rose'
    ];

    for (let i = 0; i < count; i++) {
      const type = types[i % types.length];
      list.push({
        id: i,
        left: Math.random() * 96 + 2, // 2% to 98%
        size: Math.floor(Math.random() * 12) + 14, // 14px to 26px
        animationDuration: Math.random() * 7 + 8, // 8s to 15s
        animationDelay: Math.random() * 8, // 0s to 8s
        swayDuration: Math.random() * 3 + 3, // 3s to 6s
        rotationStart: Math.floor(Math.random() * 360),
        rotationEnd: Math.floor(Math.random() * 360) + 360,
        type,
        opacity: Math.random() * 0.35 + 0.65 // 0.65 to 1.0
      });
    }
    return list;
  }, [count]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-30 overflow-hidden select-none"
    >
      {petals.map((p) => {
        // SVG paths for realistic organic petal shapes
        const isJasmine = p.type === 'white-jasmine';
        const isRose = p.type === 'blush-rose';
        const isGold = p.type === 'gold-leaf';

        return (
          <div
            key={p.id}
            className="absolute -top-10"
            style={{
              left: `${p.left}%`,
              animation: `petalFall ${p.animationDuration}s linear infinite`,
              animationDelay: `${p.animationDelay}s`,
              willChange: 'transform'
            }}
          >
            <div
              style={{
                animation: `petalSway ${p.swayDuration}s ease-in-out infinite alternate`,
                willChange: 'transform'
              }}
            >
              <svg
                width={p.size}
                height={p.size * 1.3}
                viewBox="0 0 30 40"
                fill="none"
                style={{
                  opacity: p.opacity,
                  filter: isGold
                    ? 'drop-shadow(0 0 4px rgba(230,200,139,0.7))'
                    : 'drop-shadow(0 2px 4px rgba(0,0,0,0.12))',
                  transform: `rotate(${p.rotationStart}deg)`
                }}
              >
                {isJasmine && (
                  // Delicate ivory/jasmine petal with soft gold tint
                  <path
                    d="M15 2 C22 8, 28 18, 26 28 C24 36, 17 39, 15 39 C13 39, 6 36, 4 28 C2 18, 8 8, 15 2 Z"
                    fill="url(#jasmine-grad)"
                  />
                )}
                {isRose && (
                  // Soft blush rose petal
                  <path
                    d="M15 1 C24 7, 29 17, 27 28 C25 36, 18 39, 15 39 C12 39, 5 36, 3 28 C1 17, 6 7, 15 1 Z"
                    fill="url(#rose-grad)"
                  />
                )}
                {isGold && (
                  // Shimmering gold leaf petal
                  <path
                    d="M15 2 C23 9, 27 20, 24 30 C22 37, 17 39, 15 39 C13 39, 8 37, 6 30 C3 20, 7 9, 15 2 Z"
                    fill="url(#gold-grad)"
                  />
                )}

                <defs>
                  <linearGradient id="jasmine-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                    <stop offset="50%" stopColor="#fbf9f4" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#e8dfce" stopOpacity="0.85" />
                  </linearGradient>

                  <linearGradient id="rose-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fce7e7" stopOpacity="0.95" />
                    <stop offset="50%" stopColor="#f7cad0" stopOpacity="0.88" />
                    <stop offset="100%" stopColor="#e29578" stopOpacity="0.8" />
                  </linearGradient>

                  <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fae0ad" stopOpacity="0.95" />
                    <stop offset="60%" stopColor="#c5a059" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#8d6e32" stopOpacity="0.85" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        );
      })}
    </div>
  );
};
