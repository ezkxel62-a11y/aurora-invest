"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { syncExpiredInvestments } from "@/lib/investmentHelper";
import { Wallet, Lock, ArrowDownCircle, ArrowUpCircle } from "lucide-react";

export default function DompetPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [runningProfit, setRunningProfit] = useState<number>(0);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [submittingDeposit, setSubmittingDeposit] = useState(false);
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

  // State Baru untuk Fitur Modal Keamanan QRIS
  const [showQrModal, setShowQrModal] = useState(false);
  const [timer, setTimer] = useState(600); // 10 Menit dalam hitungan detik
  const [fileProof, setFileProof] = useState<File | null>(null);

  const fetchWalletData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await syncExpiredInvestments(user.id);
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (prof) setProfile(prof);

      const { data: activeInvs } = await supabase.from("investments").select("total_profit").eq("user_id", user.id).eq("status", "active");
      if (activeInvs) {
        const total = activeInvs.reduce((acc, curr) => acc + Number(curr.total_profit), 0);
        setRunningProfit(total);
      }
    }
    setLoading(false);
  };

  useEffect(() => { 
    fetchWalletData(); 
  }, []);

  // Efek Sinkronisasi Hitung Mundur Waktu QRIS
  useEffect(() => {
    let interval: any;
    if (showQrModal && timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    } else if (timer === 0) {
      setShowQrModal(false);
      alert("Waktu transfer QRIS telah habis! Silakan ajukan ulang nominal deposit Anda.");
    }
    return () => clearInterval(interval);
  }, [showQrModal, timer]);

  // Langkah 1: Membuka Pop-up QRIS
  const handleDepositInitiate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositAmount || Number(depositAmount) < 10000) {
      return alert("Minimal pengajuan deposit adalah Rp 10.000");
    }
    setTimer(600); // Reset timer ke 10 menit
    setFileProof(null); // Bersihkan sisa file lama
    setShowQrModal(true);
  };

  // Langkah 2: Proses Upload Gambar Bukti + Insert ke Database Supabase
  const handleDepositConfirm = async () => {
    if (!fileProof) {
      return alert("Silakan pilih atau foto bukti transfer pembayaran Anda terlebih dahulu!");
    }

    setSubmittingDeposit(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Unggah berkas gambar bukti transaksi ke Supabase Storage Bucket
      const fileExt = fileProof.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(fileName, fileProof);

      if (uploadError) throw uploadError;

      // 2. Tarik URL Publik Gambar yang berhasil di-upload
      const { data: { publicUrl } } = supabase.storage
        .from("payment-proofs")
        .getPublicUrl(fileName);

      // 3. Masukkan data transaksi ke tabel deposits (Metode dipaksa QRIS sesuai alur modal)
      await supabase.from("deposits").insert({ 
        user_id: user.id, 
        amount: Number(depositAmount), 
        method: "QRIS", 
        type: "deposit", 
        status: "pending",
        proof_url: publicUrl
      });
      
      alert("Permohonan deposit dengan bukti QRIS berhasil diajukan! Menunggu verifikasi admin.");
      setDepositAmount("");
      setShowQrModal(false);
      fetchWalletData();
    } catch (err: any) { 
      alert("Gagal memproses deposit: " + err.message); 
    } finally { 
      setSubmittingDeposit(false); 
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawAmount || Number(withdrawAmount) < 50000) return alert("Minimal penarikan Rp 50.000");
    if (profile && profile.wallet_balance < Number(withdrawAmount)) return alert("Saldo Anda tidak mencukupi.");
    setSubmittingWithdraw(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const paymentMethod = profile?.payment_method || "DANA";

      await supabase.from("deposits").insert({ 
        user_id: user.id, 
        amount: Number(withdrawAmount), 
        method: paymentMethod, 
        type: "withdraw", 
        status: "pending" 
      });
      
      alert("Permohonan penarikan berhasil diajukan!");
      setWithdrawAmount("");
      fetchWalletData();
    } catch (err: any) { 
      alert("Gagal menarik dana: " + err.message); 
    } finally { 
      setSubmittingWithdraw(false); 
    }
  };

  // Helper Format Jam Menit Detik
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const formatRupiah = (num: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);

  if (loading) return <p className="text-xs text-slate-400 p-6">Memuat dompet...</p>;

  return (
    <div className="p-2 space-y-6 max-w-6xl mx-auto text-xs text-slate-700 font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* KOTAK KARTU UTAMA DENGAN KEUNTUNGAN BERJALAN DI DALAMNYA */}
        <div className="bg-[#0B1A30] text-white rounded-3xl p-6 shadow-md flex flex-col justify-between min-h-[220px]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold">Aurora Digital Wallet</p>
              <div className="w-9 h-6 bg-amber-400 rounded-md mt-1.5 opacity-90" />
            </div>
            <span className="text-[10px] font-bold bg-blue-900/60 border border-blue-800 text-blue-300 px-2 py-0.5 rounded-lg">Debit Card</span>
          </div>
          
          <div className="my-3">
            <p className="text-[9px] text-slate-400 uppercase tracking-wide">Total Saldo Aktif (Debit)</p>
            <h2 className="text-xl font-black tracking-tight mt-0.5">{profile ? formatRupiah(profile.wallet_balance) : "Rp 0"}</h2>
            
            <div className="mt-3 bg-slate-900/50 border border-slate-800/80 rounded-xl p-2.5 flex justify-between items-center">
              <span className="text-[9px] text-emerald-400 font-medium uppercase tracking-wider">Keuntungan Berjalan:</span>
              <span className="text-xs font-black text-emerald-400">+{formatRupiah(runningProfit)}</span>
            </div>
          </div>
          
          <div className="border-t border-slate-800/60 pt-2.5 flex justify-between items-center text-[9px]">
            <div>
              <p className="text-slate-500 uppercase">Pemilik Akun</p>
              <p className="font-bold tracking-wide uppercase mt-0.5 text-slate-200">{profile?.full_name || "MEMBER AURORA"}</p>
            </div>
            <p className="text-slate-500 tracking-widest">**** **** **** 2026</p>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-blue-950 font-bold text-sm mb-1"><Lock className="h-4 w-4 text-blue-600" /><h3>Informasi Rekening Terkunci</h3></div>
            <p className="text-[11px] text-slate-400 font-medium">Sistem menarik data langsung dari akun profil Anda untuk keamanan.</p>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 grid grid-cols-3 gap-2 text-center mt-4">
            <div><p className="text-[10px] text-slate-400 mb-1">METODE</p><p className="font-bold text-slate-800 uppercase text-[10px]">{profile?.payment_method || "-"}</p></div>
            <div><p className="text-[10px] text-slate-400 mb-1">NOMOR REKENING</p><p className="font-bold text-slate-800 tracking-wider text-[10px]">{profile?.account_number || "-"}</p></div>
            <div><p className="text-[10px] text-slate-400 mb-1">NAMA PEMILIK</p><p className="font-bold text-slate-800 uppercase text-[10px]">{profile?.account_name || "-"}</p></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* FORM DEPOSIT MENGARAH KE MODAL QRIS */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-4"><ArrowDownCircle className="h-4 w-4 text-emerald-600" /><h3>Isi Saldo (Deposit)</h3></div>
          <form onSubmit={handleDepositInitiate} className="space-y-4">
            <input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="Contoh: 100000" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-slate-800 text-sm focus:outline-none focus:border-blue-500" required />
            <button type="submit" className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 rounded-xl shadow-sm cursor-pointer transition">
              Ajukan Pembayaran Deposit
            </button>
          </form>
        </div>

        {/* FORM WITHDRAW */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-4"><ArrowUpCircle className="h-4 w-4 text-rose-600" /><h3>Tarik Dana (Withdraw)</h3></div>
          <form onSubmit={handleWithdraw} className="space-y-4">
            <input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="Minimal Rp 50.000" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-slate-800 text-sm focus:outline-none focus:border-rose-500" required />
            <button type="submit" disabled={submittingWithdraw} className="w-full bg-rose-700 hover:bg-rose-800 text-white font-bold py-3 rounded-xl shadow-sm cursor-pointer transition disabled:opacity-50">
              {submittingWithdraw ? "Memproses..." : "Ajukan Penarikan Cash"}
            </button>
          </form>
        </div>
      </div>

      {/* POP-UP MODAL KESELAMATAN QRIS AUTOMATION */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-3xl w-full max-w-sm text-center border border-slate-200 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-base font-black text-blue-950">Silahkan Lakukan Pembayaran</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Scan kode QRIS di bawah ini via M-Banking / E-Wallet Anda</p>
            
            {/* Indikator Hitung Mundur Keamanan */}
            <div className="mt-3 bg-rose-50 text-rose-600 py-1 px-3 inline-block rounded-full font-mono text-[11px] font-bold border border-rose-100">
              Sisa Waktu Pembayaran: {formatTime(timer)}
            </div>

            {/* Render Gambar QRIS Statis dari Folder Public */}
            <div className="my-4 bg-slate-50 p-3 rounded-2xl inline-block border border-slate-100 shadow-inner">
              <img src="/qris.jpeg" alt="QRIS Aurora Payment" className="w-44 h-44 mx-auto object-contain" />
            </div>

            {/* Bagian Input Unggah Gambar Bukti */}
            <div className="text-left bg-slate-50 border border-slate-100 p-3 rounded-xl">
              <label className="block text-[10px] font-black text-slate-600 mb-1.5 uppercase tracking-wide">📸 Kirim Bukti Transfer:</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFileProof(e.target.files?.[0] || null)}
                className="w-full text-[10px] text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-blue-950 file:text-white hover:file:bg-slate-800 cursor-pointer"
              />
            </div>

            {/* Tombol Kontrol Penentu Sesi */}
            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl font-bold transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDepositConfirm}
                disabled={submittingDeposit}
                className="w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-black tracking-wide transition disabled:opacity-50"
              >
                {submittingDeposit ? "Mengirim..." : "Kirim Bukti"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}