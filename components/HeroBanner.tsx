"use client";

import { useState, useEffect } from "react";

export default function HeroBanner() {
  // Daftar 4 banner yang ada di folder public
  const banners = [
    "/banner1.jpeg",
    "/banner2.jpeg",
    "/banner3.jpeg",
    "/banner4.jpeg",
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  // Efek slider otomatis berganti setiap 4 detik
  useEffect(() => {
    const slideInterval = setInterval(() => {
      setCurrentIndex((prevIndex) =>
        prevIndex === banners.length - 1 ? 0 : prevIndex + 1
      );
    }, 4000); // 4000 ms = 4 detik

    return () => clearInterval(slideInterval);
  }, [banners.length]);

  return (
    <div className="w-full max-w-4xl mx-auto mb-6">
      {/* Kontainer Utama Slider */}
      <div className="relative h-[180px] sm:h-[260px] md:h-[350px] w-full overflow-hidden rounded-2xl border border-slate-800 shadow-lg bg-slate-950">
        
        {/* Wrapper Gambar Interaktif */}
        <div
          className="flex h-full w-full transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {banners.map((src, index) => (
            <div key={index} className="w-full h-full flex-shrink-0">
              <img
                src={src}
                alt={`Aurora Banner ${index + 1}`}
                className="w-full h-full object-cover object-center"
              />
            </div>
          ))}
        </div>

        {/* Indikator Titik (Dots) di Bagian Bawah */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full z-10">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                currentIndex === index 
                  ? "w-5 bg-blue-500" 
                  : "w-2 bg-slate-500/70 hover:bg-slate-300"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}