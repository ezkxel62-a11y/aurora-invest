"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Wallet, History, TrendingUp, User, Shield, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  // State Keamanan & Data Profil
  const [profile, setProfile] = useState<any>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    async function checkAuthAndFetchProfile() {
      try {
        // 1. Ambil sesi login aktif dari Supabase Auth
        const { data: { session } } = await supabase.auth.getSession();
        
        // JIKA TIDAK LOGIN: Tendang langsung ke halaman utama/login
        // Catatan: Ubah "/login" menjadi "/" jika halaman login Anda berada di root utama
        if (!session) {
          router.push("/"); 
          return;
        }

        // 2. Jika sesi ada, ambil data profil lengkap dari tabel database
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        
        if (error) throw error;
        
        setProfile(data);
        setAuthenticated(true); // Izinkan akses masuk ke dashboard
      } catch (error) {
        console.error("Gagal memproses verifikasi keamanan:", error);
        router.push("/"); // Jalur aman: kembalikan ke halaman depan jika terjadi error
      } finally {
        setLoading(false); // Matikan layar loading proteksi
      }
    }
    
    checkAuthAndFetchProfile();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/"); // Setelah logout, arahkan kembali ke halaman utama
  };

  const navItems = [
    { name: "Beranda", href: "/dashboard", icon: Home },
    { name: "Investasi Saya", href: "/dashboard/investasi", icon: TrendingUp },
    { name: "Dompet", href: "/dashboard/dompet", icon: Wallet },
    { name: "Riwayat", href: "/dashboard/riwayat", icon: History },
    { name: "Profil", href: "/dashboard/profil", icon: User },
  ];

  // LAYAR LOADING PROTEKSI (Mencegah kebocoran UI sebelum cek login selesai)
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl font-bold tracking-wider animate-pulse text-blue-400">AURORA GATEKEEPER</p>
          <p className="text-sm text-slate-400 mt-2">Sinkronisasi keamanan sesi akun...</p>
        </div>
      </div>
    );
  }

  // Jika tidak lolos otentikasi, cekal rendering halaman demi keamanan
  if (!authenticated) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col md:flex-row pb-16 md:pb-0">
      {/* SIDEBAR FOR DESKTOP */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0a1428] text-white min-h-screen p-4 sticky top-0 h-screen shadow-xl">
        <div className="flex items-center gap-3 px-2 py-4 border-b border-slate-800 mb-6">
          <div className="h-9 w-9 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-lg shadow-md shadow-blue-600/20">A</div>
          <span className="font-bold text-xl tracking-wider text-white">AURORA <span className="text-blue-500 text-xs block -mt-1 tracking-normal font-normal">INVEST</span></span>
        </div>
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20" : "text-slate-400 hover:bg-slate-800/50 hover:text-white"}`}>
                <Icon className={`h-5 w-5 ${isActive ? "text-white" : "text-slate-400"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-100 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-40 shadow-sm">
          <div className="md:hidden">
            <span className="font-extrabold text-lg text-slate-900 tracking-tight">AURORA <span className="text-blue-600">INVEST</span></span>
          </div>
          <div className="hidden md:block text-sm text-slate-400 font-medium">Selamat datang kembali di dashboard investasi Anda.</div>
          
          <div className="relative">
            <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-2 bg-slate-50 border border-slate-200/60 rounded-full py-1.5 pl-3 pr-1.5 hover:bg-slate-100 transition-all">
              <span className="text-xs font-semibold text-slate-700">{profile?.full_name || profile?.name || "User"}</span>
              <div className="h-7 w-7 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase shadow-sm">
                {(profile?.full_name || profile?.name || "AU").substring(0, 2)}
              </div>
            </button>
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50">
                {profile?.role === "admin" && (
                  <Link href="/admin" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-blue-600 hover:bg-blue-50 w-full text-left border-b border-slate-50 font-semibold">
                    <Shield className="h-4 w-4 text-blue-500" /> Panel Admin
                  </Link>
                )}
                <button onClick={() => { setIsDropdownOpen(false); handleLogout(); }} className="flex items-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 w-full text-left font-medium">
                  <LogOut className="h-4 w-4 text-red-400" /> Keluar Akun
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="p-4 md:p-8 flex-1 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* BOTTOM NAV FOR MOBILE */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-100 flex items-center justify-around py-2 px-2 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${isActive ? "text-blue-600 font-bold scale-105" : "text-slate-400"}`}>
              <Icon className="h-5 w-5 mb-0.5" />
              <span className="text-[10px] tracking-tight">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}