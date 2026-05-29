"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CheckCircle, XCircle, RefreshCw, Eye, Users, FileText } from "lucide-react";

export default function AdminPanelPage() {
  const router = useRouter();
  
  // State Keamanan
  const [authLoading, setAuthLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  // State Fitur Admin & Navigasi
  const [activeTab, setActiveTab] = useState<"transactions" | "investors">("transactions");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [investors, setInvestors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingInvestors, setLoadingInvestors] = useState(true);
  
  // State Modal Preview Bukti Transfer
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);

  // Fungsi mengambil seluruh data transaksi (agar bisa lihat bukti yang lalu juga)
  const fetchTransactions = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("deposits")
      .select("*, profiles(full_name, email)")
      .order("created_at", { ascending: false });
    
    if (data) setTransactions(data);
    setLoading(false);
  };

  // Fungsi mengambil data seluruh investor yang terdaftar
  const fetchInvestors = async () => {
    setLoadingInvestors(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setInvestors(data);
    setLoadingInvestors(false);
  };

  // Memuat ulang data aktif berdasarkan tab yang dipilih
  const handleRefresh = () => {
    if (activeTab === "transactions") {
      fetchTransactions();
    } else {
      fetchInvestors();
    }
  };

  // Gerbang Keamanan Utama sebelum data ditampilkan
  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        // 1. Cek sesi login aktif
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/");
          return;
        }

        // 2. Cek apakah role di database adalah 'admin'
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (error || profile?.role !== "admin") {
          alert("Akses Ditolak: Anda bukan Administrator!");
          router.push("/dashboard");
          return;
        }

        // Jika lolos sekuriti
        setAuthorized(true);
        fetchTransactions(); // Jalankan pengambilan data transaksi
        fetchInvestors();    // Jalankan pengambilan data investor
      } catch (err) {
        console.error("Gagal memvalidasi hak akses admin:", err);
        router.push("/");
      } finally {
        setAuthLoading(false);
      }
    };

    checkAdminAccess();
  }, [router]);

  // Eksekusi keputusan persetujuan/penolakan
  const handleDecision = async (item: any, action: "approve" | "reject") => {
    const isApprove = action === "approve";
    if (!confirm(`Yakin ingin ${isApprove ? "MENYETUJUI" : "MENOLAK"} transaksi ini?`)) return;

    try {
      if (isApprove) {
        const { data: prof, error: profFetchError } = await supabase
          .from("profiles")
          .select("wallet_balance")
          .eq("id", item.user_id)
          .single();
        
        if (profFetchError) throw profFetchError;

        const oldBalance = Number(prof?.wallet_balance || 0);
        const amount = Number(item.amount);
        
        const isWithdraw = item.type?.trim().toLowerCase() === "withdraw";
        const newBalance = isWithdraw ? oldBalance - amount : oldBalance + amount;

        const { error: profUpdateError } = await supabase
          .from("profiles")
          .update({ wallet_balance: newBalance })
          .eq("id", item.user_id);

        if (profUpdateError) throw profUpdateError;
      }

      const { error: depositError } = await supabase
        .from("deposits")
        .update({ status: isApprove ? "approved" : "rejected" })
        .eq("id", item.id);

      if (depositError) throw depositError;

      alert("Keputusan berhasil disimpan dan saldo telah disinkronkan!");
      fetchTransactions();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  // 1. Dinding Proteksi Awal (Mencegah kedipan UI halaman admin bocor ke publik)
  if (authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <p className="text-xl font-bold tracking-wider animate-pulse text-red-500">AURORA SECURITY SYSTEM</p>
          <p className="text-sm text-slate-400 mt-2">Memeriksa otoritas enkripsi administrator...</p>
        </div>
      </div>
    );
  }

  // Jika tidak diizinkan, blokir rendering halaman sepenuhnya
  if (!authorized) return null;

  // 2. Render Halaman Utama Admin (Mendukung Desktop & Android Mobile)
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto text-xs font-sans bg-slate-50 min-h-screen text-slate-700">
      
      {/* Bagian Header Menu */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-base md:text-lg font-black text-slate-900 tracking-tight">🛡️ Control Panel Admin Aurora</h2>
          <p className="text-slate-400 text-[11px] mt-0.5">Sistem sinkronisasi saldo investasi dan database investor.</p>
        </div>
        <button 
          onClick={handleRefresh} 
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-white border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-slate-800 shadow-sm hover:bg-slate-100 transition active:scale-95"
        >
          <RefreshCw className="h-3.5 w-3.5 text-slate-500" /> Refresh Data
        </button>
      </div>

      {/* Tab Navigasi - Sangat Friendly untuk Sentuhan Jari di Android */}
      <div className="flex border-b border-slate-200 mb-6 gap-1 bg-slate-200/60 p-1 rounded-xl max-w-sm">
        <button
          onClick={() => setActiveTab("transactions")}
          className={`flex items-center justify-center gap-1.5 w-1/2 py-2.5 font-bold rounded-lg transition-all text-xs ${
            activeTab === "transactions" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <FileText className="h-3.5 w-3.5" /> Transaksi ({transactions.length})
        </button>
        <button
          onClick={() => setActiveTab("investors")}
          className={`flex items-center justify-center gap-1.5 w-1/2 py-2.5 font-bold rounded-lg transition-all text-xs ${
            activeTab === "investors" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <Users className="h-3.5 w-3.5" /> Investor ({investors.length})
        </button>
      </div>

      {/* ==================== TAB 1: KENDALI TRANSAKSI ==================== */}
      {activeTab === "transactions" && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-200">
          
          {/* TAMPILAN DESKTOP: Tabel Tradisional Lengkap */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-900 text-white text-[10px] uppercase font-bold tracking-wider">
                <tr>
                  <th className="p-4">Anggota</th>
                  <th className="p-4">Tipe Transaksi</th>
                  <th className="p-4">Nominal</th>
                  <th className="p-4">Bukti TF</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Aksi Persetujuan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 animate-pulse font-medium">Memeriksa data keuangan...</td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">Tidak ada riwayat permohonan.</td>
                  </tr>
                ) : (
                  transactions.map((item) => {
                    const isWithdraw = item.type?.trim().toLowerCase() === "withdraw";
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4">
                          <p className="font-bold uppercase text-slate-800">{item.profiles?.full_name || "Tanpa Nama"}</p>
                          <p className="text-slate-400 lowercase mt-0.5">{item.profiles?.email}</p>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${isWithdraw ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"}`}>
                            {isWithdraw ? "🔴 PENARIKAN (WITHDRAW)" : "🟢 DEPOSIT UTAMA"}
                          </span>
                        </td>
                        <td className="p-4 font-extrabold text-sm text-slate-900">
                          Rp {item.amount.toLocaleString("id-ID")}
                        </td>
                        <td className="p-4">
                          {item.proof_url ? (
                            <button 
                              onClick={() => setSelectedProofUrl(item.proof_url)}
                              className="flex items-center gap-1 bg-blue-50 text-blue-600 border border-blue-100 px-2 py-1 rounded-md font-bold hover:bg-blue-100 transition text-[10px]"
                            >
                              <Eye className="h-3 w-3" /> Lihat Bukti
                            </button>
                          ) : (
                            <span className="text-slate-400 italic">Tidak Ada</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                            item.status === "approved" ? "bg-green-50 text-green-600 border-green-200" : 
                            item.status === "rejected" ? "bg-red-50 text-red-600 border-red-200" : "bg-yellow-50 text-yellow-600 border-yellow-200"
                          }`}>{item.status?.toUpperCase()}</span>
                        </td>
                        <td className="p-4 flex justify-center gap-2">
                          {item.status === "pending" ? (
                            <>
                              <button onClick={() => handleDecision(item, "approve")} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 transition-all shadow-sm">
                                <CheckCircle className="h-3.5 w-3.5" /> Setuju
                              </button>
                              <button onClick={() => handleDecision(item, "reject")} className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 transition-all shadow-sm">
                                <XCircle className="h-3.5 w-3.5" /> Tolak
                              </button>
                            </>
                          ) : (
                            <span className="text-slate-400 font-medium text-[11px]">Selesai Diproses</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* TAMPILAN ANDROID MOBILE: Susunan Card Stacked Responsif */}
          <div className="block md:hidden p-3 space-y-3">
            {loading ? (
              <div className="p-6 text-center text-slate-400 animate-pulse">Memuat data...</div>
            ) : transactions.length === 0 ? (
              <div className="p-6 text-center text-slate-400">Tidak ada riwayat permohonan.</div>
            ) : (
              transactions.map((item) => {
                const isWithdraw = item.type?.trim().toLowerCase() === "withdraw";
                return (
                  <div key={item.id} className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-2.5">
                    <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                      <div>
                        <p className="font-bold text-slate-800 uppercase text-xs">{item.profiles?.full_name || "Tanpa Nama"}</p>
                        <p className="text-slate-400 text-[10px] font-normal">{item.profiles?.email}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                        item.status === "approved" ? "bg-green-50 text-green-600" : item.status === "rejected" ? "bg-red-50 text-red-600" : "bg-yellow-50 text-yellow-600"
                      }`}>{item.status?.toUpperCase()}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Jenis & Bukti:</span>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded font-bold text-[9px] ${isWithdraw ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
                          {isWithdraw ? "WITHDRAW" : "DEPOSIT"}
                        </span>
                        {item.proof_url && (
                          <button onClick={() => setSelectedProofUrl(item.proof_url)} className="text-blue-500 font-bold bg-blue-50 px-2 py-0.5 rounded text-[10px]">
                            Lihat Foto
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-slate-50">
                      <span className="text-slate-500 font-medium">Nominal Asset:</span>
                      <span className="font-black text-sm text-slate-900">Rp {item.amount.toLocaleString("id-ID")}</span>
                    </div>

                    {item.status === "pending" && (
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <button onClick={() => handleDecision(item, "approve")} className="bg-emerald-600 text-white font-bold py-2 rounded-xl text-center active:bg-emerald-700 flex items-center justify-center gap-1">
                          <CheckCircle className="h-3 w-3" /> Setujui
                        </button>
                        <button onClick={() => handleDecision(item, "reject")} className="bg-rose-600 text-white font-bold py-2 rounded-xl text-center active:bg-rose-700 flex items-center justify-center gap-1">
                          <XCircle className="h-3 w-3" /> Tolak
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

        </div>
      )}

      {/* ==================== TAB 2: DAFTAR USER INVESTOR ==================== */}
      {activeTab === "investors" && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-900 text-white text-[10px] uppercase font-bold tracking-wider">
                <tr>
                  <th className="p-4">Nama Lengkap / Email</th>
                  <th className="p-4 text-right">Saldo Dompet</th>
                  <th className="p-4 text-center">Hak Otoritas (Role)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingInvestors ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-slate-400 animate-pulse font-medium">Memanggil daftar investor...</td>
                  </tr>
                ) : investors.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-slate-400 font-medium">Belum ada investor terdaftar.</td>
                  </tr>
                ) : (
                  investors.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-slate-800 uppercase">{user.name || user.full_name || "Tanpa Nama"}</p>
                        <p className="text-slate-400 text-[10px] mt-0.5 lowercase">{user.email || "No Email Loaded"}</p>
                      </td>
                      <td className="p-4 text-right font-bold text-slate-900 text-sm">
                        Rp {Number(user.wallet_balance || 0).toLocaleString("id-ID")}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded font-extrabold text-[9px] uppercase border ${
                          user.role === "admin" ? "bg-red-50 text-red-600 border-red-200" : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}>
                          {user.role || "user"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== SCREEN POP-UP: MODAL PREVIEW BUKTI TRANSFER ==================== */}
      {selectedProofUrl && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white p-4 rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl relative text-center animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-xs font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">🖼️ Validasi Foto Bukti Kiriman Investor</h3>
            
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 max-h-[60vh] overflow-hidden flex items-center justify-center">
              <img 
                src={selectedProofUrl} 
                alt="Bukti Transfer Unggulan" 
                className="max-w-full max-h-[50vh] object-contain rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://placehold.co/400x500?text=Bukti+Gagal+Dimuat";
                }}
              />
            </div>

            <button 
              onClick={() => setSelectedProofUrl(null)} 
              className="mt-4 w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-bold shadow-sm transition active:scale-98 cursor-pointer"
            >
              Tutup Layar Dokumen
            </button>
          </div>
        </div>
      )}

    </div>
  );
}