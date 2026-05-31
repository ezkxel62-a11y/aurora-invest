"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CheckCircle, XCircle, RefreshCw, Eye, Users, FileText, CreditCard, Volume2, VolumeX } from "lucide-react";

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
  
  // State Proteksi & Engine Web Audio API khusus untuk iPhone / PWA iOS
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // State Modal Preview Bukti Transfer
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);

  // FUNGSI BARU: Update pesan di Telegram saat Admin klik tombol di Panel
  const updateTelegramMessage = async (item: any, status: string) => {
    try {
      await fetch(`https://api.telegram.org/bot8769600539:AAEDhHK-QjFQzbRwiAnGg2mi1_iaw3h2-r4/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: item.telegram_chat_id,
          message_id: item.telegram_message_id,
          text: `*Status Transaksi Diperbarui*\n\nNominal: Rp ${Number(item.amount).toLocaleString('id-ID')}\nStatus: ${status === 'approved' ? '✅ BERHASIL' : '❌ DITOLAK'}\n\nDiproses oleh Admin Panel Aurora.`,
          parse_mode: 'Markdown',
        }),
      });
    } catch (e) {
      console.error("Gagal update Telegram:", e);
    }
  };

  // Fungsi mengambil seluruh data transaksi beserta detail data rekening profil investor
  const fetchTransactions = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("deposits")
      .select("*, profiles(full_name, email, payment_method, account_number, account_name)")
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

  // Gerbang Keamanan Utama
  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/");
          return;
        }

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

        setAuthorized(true);
        fetchTransactions();
        fetchInvestors();
      } catch (err) {
        console.error("Gagal memvalidasi hak akses admin:", err);
        router.push("/");
      } finally {
        setAuthLoading(false);
      }
    };

    checkAdminAccess();
  }, [router]);

  // Efek Realtime Listener & Mekanisme Bypass Keamanan Suara iOS Safari + Auto Reconnect PWA
  useEffect(() => {
    if (!authorized) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioContextClass();
    audioContextRef.current = audioCtx;

    const playSyntheticNotification = () => {
      if (!audioCtx) return;
      if (audioCtx.state === "suspended") {
        audioCtx.resume().catch((e) => console.log("Gagal membangunkan audio:", e));
      }

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      osc.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    };

    const unlockAudio = () => {
      if (audioCtx.state === "suspended") {
        audioCtx.resume().then(() => {
          setIsAudioUnlocked(true);
        });
      } else {
        setIsAudioUnlocked(true);
      }
      document.removeEventListener("click", unlockAudio);
      document.removeEventListener("touchstart", unlockAudio);
    };

    document.addEventListener("click", unlockAudio);
    document.addEventListener("touchstart", unlockAudio);

    let channel: any = null;

    const startRealtimeSubscription = () => {
      if (channel) {
        supabase.removeChannel(channel);
      }

      channel = supabase
        .channel("realtime-admin-deposits")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "deposits" },
          (payload) => {
            playSyntheticNotification(); 
            setTransactions((prev) => [payload.new, ...prev]);
            fetchTransactions(); 
          }
        )
        .subscribe();
    };

    startRealtimeSubscription();

    const handlePWAResume = () => {
      if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume().catch((e) => console.log(e));
      }
      startRealtimeSubscription();
      fetchTransactions();
    };

    window.addEventListener("focus", handlePWAResume);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        handlePWAResume();
      }
    });

    return () => {
      if (channel) supabase.removeChannel(channel);
      document.removeEventListener("click", unlockAudio);
      document.removeEventListener("touchstart", unlockAudio);
      window.removeEventListener("focus", handlePWAResume);
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [authorized]);

  const triggerManualSoundTest = () => {
    if (audioContextRef.current) {
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(783.99, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
      setIsAudioUnlocked(true);
    }
  };

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

      // Sinkronisasi status ke Telegram
      if (item.telegram_message_id) {
        await updateTelegramMessage(item, isApprove ? "approved" : "rejected");
      }

      alert("Keputusan berhasil disimpan!");
      fetchTransactions();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

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

  if (!authorized) return null;

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto text-xs font-sans bg-slate-50 min-h-screen text-slate-700">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-base md:text-lg font-black text-slate-900 tracking-tight">🛡️ Control Panel Admin Aurora</h2>
          <p className="text-slate-400 text-[11px] mt-0.5">Sistem sinkronisasi saldo investasi dan database investor.</p>
        </div>
        
        <div className="w-full sm:w-auto flex flex-col sm:flex-row sm:items-center gap-2">
          <button 
            type="button"
            onClick={triggerManualSoundTest}
            className={`w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[10px] font-black border transition active:scale-95 cursor-pointer ${
              isAudioUnlocked ? "bg-green-50 text-green-600 border-green-200" : "bg-amber-50 text-amber-600 border-amber-200 animate-pulse"
            }`}
          >
            {isAudioUnlocked ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            {isAudioUnlocked ? "🔊 Notif Suara Aktif (Ketuk untuk Tes)" : "⚡ Ketuk Layar HP Untuk Aktifkan Suara"}
          </button>
          <button 
            type="button"
            onClick={handleRefresh} 
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-white border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-slate-800 shadow-sm hover:bg-slate-100 transition active:scale-95"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" /> Refresh Data
          </button>
        </div>
      </div>

      <div className="flex border-b border-slate-200 mb-6 gap-1 bg-slate-200/60 p-1 rounded-xl w-full max-w-xs">
        <button
          type="button"
          onClick={() => setActiveTab("transactions")}
          className={`flex items-center justify-center gap-1.5 w-1/2 py-2.5 font-bold rounded-lg transition-all text-xs ${
            activeTab === "transactions" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <FileText className="h-3.5 w-3.5" /> Transaksi ({transactions.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("investors")}
          className={`flex items-center justify-center gap-1.5 w-1/2 py-2.5 font-bold rounded-lg transition-all text-xs ${
            activeTab === "investors" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <Users className="h-3.5 w-3.5" /> Investor ({investors.length})
        </button>
      </div>

      {activeTab === "transactions" && (
        <div>
          <div className="hidden md:block bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-200">
            <table className="w-full text-left">
              <thead className="bg-slate-900 text-white text-[10px] uppercase font-bold tracking-wider">
                <tr>
                  <th className="p-4">Anggota</th>
                  <th className="p-4">Info Rekening Tujuan</th>
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
                    <td colSpan={7} className="p-8 text-center text-slate-400 animate-pulse font-medium">Memeriksa data keuangan...</td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">Tidak ada riwayat permohonan.</td>
                  </tr>
                ) : (
                  transactions.map((item) => {
                    const isWithdraw = item.type?.trim().toLowerCase() === "withdraw";
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4">
                          <p className="font-bold uppercase text-slate-800">{item.profiles?.full_name || "Investor"}</p>
                          <p className="text-slate-400 lowercase mt-0.5">{item.profiles?.email}</p>
                        </td>
                        <td className="p-4">
                          <div className="text-[11px] space-y-0.5">
                            <span className="font-bold text-slate-800">{item.profiles?.payment_method || "DANA"} - {item.profiles?.account_number || "-"}</span>
                            <p className="text-slate-400 text-[10px]">a/n {item.profiles?.account_name || "-"}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${isWithdraw ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"}`}>
                            {isWithdraw ? "🔴 WITHDRAW" : "🟢 DEPOSIT UTAMA"}
                          </span>
                        </td>
                        <td className="p-4 font-extrabold text-sm text-slate-900">
                          Rp {item.amount?.toLocaleString("id-ID") || 0}
                        </td>
                        <td className="p-4">
                          {item.proof_url ? (
                            <button 
                              type="button"
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
                              <button type="button" onClick={() => handleDecision(item, "approve")} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 transition-all shadow-sm">
                                <CheckCircle className="h-3.5 w-3.5" /> Setuju
                              </button>
                              <button type="button" onClick={() => handleDecision(item, "reject")} className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 transition-all shadow-sm">
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

          <div className="block md:hidden space-y-4">
            {loading ? (
              <div className="p-6 text-center text-slate-400 animate-pulse">Memuat data...</div>
            ) : transactions.length === 0 ? (
              <div className="p-6 text-center text-slate-400">Tidak ada riwayat permohonan.</div>
            ) : (
              transactions.map((item) => {
                const isWithdraw = item.type?.trim().toLowerCase() === "withdraw";
                return (
                  <div key={item.id} className="bg-white border border-slate-100 p-4 rounded-3xl shadow-sm space-y-3 w-full box-border">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-extrabold text-slate-900 uppercase text-xs truncate">{item.profiles?.full_name || "Investor"}</p>
                        <p className="text-slate-400 text-[10px] font-medium truncate lowercase">{item.profiles?.email}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md font-black text-[9px] tracking-wider shrink-0 border ${
                        item.status === "approved" ? "bg-green-50 text-green-600 border-green-100" : 
                        item.status === "rejected" ? "bg-red-50 text-red-600 border-red-100" : 
                        "bg-amber-50 text-amber-600 border-amber-100"
                      }`}>{item.status?.toUpperCase()}</span>
                    </div>
                    <div className="border-t border-slate-50"></div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-400 font-medium block">Jenis Transaksi:</span>
                        <span className={`inline-block font-bold text-[9px] px-1.5 py-0.5 rounded mt-0.5 ${isWithdraw ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
                          {isWithdraw ? "WITHDRAW" : "DEPOSIT"}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 font-medium block">Bukti Transfer:</span>
                        {item.proof_url ? (
                          <button type="button" onClick={() => setSelectedProofUrl(item.proof_url)} className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded text-[10px] inline-flex items-center gap-1 mt-0.5">
                            <Eye className="h-3 w-3" /> Lihat Foto
                          </button>
                        ) : (
                          <span className="text-slate-400 italic text-[10px]">Tidak Ada</span>
                        )}
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-start gap-2 text-[11px]">
                      <CreditCard className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <span className="text-slate-400 font-medium block text-[10px]">Info Rekening Penarikan / Transfer:</span>
                        <p className="font-extrabold text-slate-800 tracking-wide truncate">
                          {item.profiles?.payment_method || "DANA"} - {item.profiles?.account_number || "-"}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium truncate">
                          a/n {item.profiles?.account_name || "-"}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center bg-slate-50/50 rounded-2xl px-3 py-2">
                      <span className="text-slate-500 font-semibold text-[11px]">Nominal Asset:</span>
                      <span className="font-black text-sm text-slate-900">Rp {item.amount?.toLocaleString("id-ID") || 0}</span>
                    </div>
                    {item.status === "pending" && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button type="button" onClick={() => handleDecision(item, "approve")} className="bg-emerald-600 text-white font-bold py-2 rounded-xl text-center active:bg-emerald-700 flex items-center justify-center gap-1 transition-all">
                          <CheckCircle className="h-3.5 w-3.5" /> Setujui
                        </button>
                        <button type="button" onClick={() => handleDecision(item, "reject")} className="bg-rose-600 text-white font-bold py-2 rounded-xl text-center active:bg-rose-700 flex items-center justify-center gap-1 transition-all">
                          <XCircle className="h-3.5 w-3.5" /> Tolak
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

      {selectedProofUrl && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white p-4 rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl relative text-center animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-xs font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">🖼️ Validasi Foto Bukti Kiriman Investor</h3>
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 max-h-[60vh] overflow-hidden flex items-center justify-center">
              <img 
                src={selectedProofUrl} 
                alt="Bukti Transfer" 
                className="max-w-full max-h-[50vh] object-contain rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://placehold.co/400x500?text=Bukti+Gagal+Dimuat";
                }}
              />
            </div>
            <button 
              type="button"
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