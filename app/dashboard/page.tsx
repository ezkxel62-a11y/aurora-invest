"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { syncExpiredInvestments } from "@/lib/investmentHelper";
import { TrendingUp, ShieldCheck, Calendar, Wallet, ChevronLeft, ChevronRight } from "lucide-react";

// Konfigurasi Paket Investasi Fantastis Terbaru Sesuai Permintaan
const PACKAGES = [
  { id: "p1", name: "Aurora Starter", price: 50000, duration: 28, profit: 135000, yieldText: "Hasil Akhir Rp 185.000" },
  { id: "p2", name: "Aurora Bronze", price: 250000, duration: 30, profit: 750000, yieldText: "Hasil Akhir Rp 1.000.000" },
  { id: "p3", name: "Aurora Silver", price: 1000000, duration: 45, profit: 3500000, yieldText: "Hasil Akhir Rp 4.500.000" },
  { id: "p4", name: "Aurora Gold", price: 5000000, duration: 60, profit: 20000000, yieldText: "Hasil Akhir Rp 25.000.000" },
  { id: "p5", name: "Aurora Platinum", price: 15000000, duration: 90, profit: 75000000, yieldText: "Hasil Akhir Rp 90.000.000" },
];

export default function BerandaPage() {
  const [balance, setBalance] = useState<number>(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Menggunakan 4 file JPEG murni dari folder public
  const bannerSlides = [
    { src: "/banner1.jpeg", alt: "Aurora Banner 1" },
    { src: "/banner2.jpeg", alt: "Aurora Banner 2" },
    { src: "/banner3.jpeg", alt: "Aurora Banner 3" },
    { src: "/banner4.jpeg", alt: "Aurora Banner 4" }
  ];

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      await syncExpiredInvestments(user.id);
      const { data: prof } = await supabase.from("profiles").select("wallet_balance").eq("id", user.id).single();
      if (prof) setBalance(prof.wallet_balance);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // Engine Auto-Swipe Jalankan Pergantian Gambar Otomatis per 5 Detik
    const slideInterval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % bannerSlides.length);
    }, 5000);
    return () => clearInterval(slideInterval);
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % bannerSlides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + bannerSlides.length) % bannerSlides.length);

  const handleBuy = async (pkg: typeof PACKAGES[0]) => {
    if (!userId) return;
    if (balance < pkg.price) return alert("Gagal membeli: Saldo dompet Anda tidak mencukupi. Silakan lakukan isi saldo terlebih dahulu.");

    if (!confirm(`Konfirmasi pembelian paket ${pkg.name} seharga Rp ${pkg.price.toLocaleString("id-ID")}?`)) return;

    try {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + pkg.duration);

      // Amankan pemotongan: Daftarkan paket investasi terlebih dahulu
      const { error: invErr } = await supabase.from("investments").insert({
        user_id: userId,
        package_name: pkg.name,
        amount: pkg.price,
        amount_invested: pkg.price,          
        total_profit: pkg.profit,
        total_return: pkg.price + pkg.profit, 
        duration_days: pkg.duration,
        status: "active",
        expires_at: expirationDate.toISOString(),
        plan_type: "standard"
      });

      if (invErr) throw invErr;

      // Jalankan pemotongan saldo HANYA jika paket berhasil terdaftar
      const { error: balanceErr } = await supabase
        .from("profiles")
        .update({ wallet_balance: balance - pkg.price })
        .eq("id", userId);

      if (balanceErr) {
        // Rollback jika terjadi kegagalan pemotongan saldo di tengah jalan
        await supabase.from("investments").delete().eq("user_id", userId).eq("package_name", pkg.name).eq("status", "active").order("created_at", { ascending: false }).limit(1);
        throw balanceErr;
      }

      alert(`Sukses membeli paket ${pkg.name}! Paket Anda sekarang aktif.`);
      loadData();
    } catch (error: any) {
      console.error("--- DETAIL ERROR PEMBELIAN ---");
      console.error("Pesan:", error?.message || "Error tidak diketahui");
      console.error("Objek Lengkap:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
      
      alert("Gagal memproses pembelian: " + (error.message || "Terjadi masalah sinkronisasi database. Sila coba lagi."));
    }
  };

  if (loading) return <p className="text-xs text-slate-400 p-6">Memuat beranda investasi...</p>;

  return (
    <div className="p-2 space-y-6 max-w-6xl mx-auto text-xs text-slate-700 font-sans">
      
      {/* HERO BANNER CAROUSEL - ULTRA RESPONSIF TANPA TEKS OVERLAP */}
      <div className="relative rounded-3xl overflow-hidden w-full aspect-[2.3/1] sm:aspect-[2.6/1] md:aspect-[3/1] shadow-sm group bg-slate-950">
        
        {/* Render Gambar Utama Slide */}
        <div className="w-full h-full relative">
          <img 
            src={bannerSlides[currentSlide].src} 
            alt={bannerSlides[currentSlide].alt} 
            className="w-full h-full object-cover object-center transition-all duration-700 ease-in-out"
          />
        </div>
        
        {/* Tombol Navigasi Manual Banner */}
        <button onClick={prevSlide} className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"><ChevronLeft className="h-4 w-4" /></button>
        <button onClick={nextSlide} className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"><ChevronRight className="h-4 w-4" /></button>

        {/* Indikator Titik Posisi Banner */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 bg-black/20 backdrop-blur-sm px-2.5 py-1 rounded-full">
          {bannerSlides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${currentSlide === idx ? "w-4 bg-white" : "w-1.5 bg-white/40"}`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* PRODUK KONTRAK MANAJEMEN ASET */}
      <div className="bg-white border rounded-2xl p-4 flex justify-between items-center shadow-sm">
        <div>
          <h3 className="font-bold text-slate-900 text-xs">Produk Kontrak Manajemen Aset</h3>
          <p className="text-slate-400 text-[10px]">Dana investasi dikunci aman sesuai tenor masa kontrak.</p>
        </div>
        <div className="bg-slate-50 border px-3 py-1.5 rounded-xl text-right">
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 justify-end"><Wallet className="h-3 w-3 text-blue-600" /> Dompet Saya</p>
          <p className="text-xs font-black text-slate-900">Rp {balance.toLocaleString("id-ID")}</p>
        </div>
      </div>

      {/* DAFTAR KARTU PRODUK PAKET INVESTASI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {PACKAGES.map((pkg) => (
          <div key={pkg.id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex flex-col justify-between hover:border-blue-200 transition-all">
            <div>
              <div className="flex justify-between items-start mb-4">
                <span className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl"><TrendingUp className="h-4 w-4" /></span>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold text-[9px] px-2.5 py-1 rounded-xl">{pkg.yieldText}</span>
              </div>
              <h3 className="text-slate-900 font-bold text-xs uppercase tracking-wide">{pkg.name}</h3>
              <p className="text-slate-400 mt-0.5 flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Jangka Waktu: {pkg.duration} Hari</p>
              
              <div className="my-4 pt-4 border-t border-dashed border-slate-100 space-y-1.5">
                <div className="flex justify-between"><span className="text-slate-400">Harga Kontrak:</span><span className="font-bold text-slate-800">Rp {pkg.price.toLocaleString("id-ID")}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Bersih Keuntungan:</span><span className="font-extrabold text-emerald-600">+ Rp {pkg.profit.toLocaleString("id-ID")}</span></div>
              </div>
            </div>
            <button onClick={() => handleBuy(pkg)} className="w-full bg-slate-900 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl mt-2 transition-all shadow-sm cursor-pointer text-[11px]">Beli Kontrak Investasi</button>
          </div>
        ))}
      </div>
    </div>
  );
}