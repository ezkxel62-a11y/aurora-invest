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

  useEffect(() => { fetchWalletData(); }, []);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositAmount || Number(depositAmount) <= 0) return alert("Nominal tidak valid.");
    setSubmittingDeposit(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // FIX: Menambahkan fallback "DANA" jika profile?.payment_method bernilai null atau kosong
      const paymentMethod = profile?.payment_method || "DANA";

      await supabase.from("deposits").insert({ 
        user_id: user.id, 
        amount: Number(depositAmount), 
        method: paymentMethod, 
        type: "deposit", 
        status: "pending" 
      });
      
      alert("Permohonan deposit berhasil diajukan!");
      setDepositAmount("");
      fetchWalletData();
    } catch (err: any) { 
      alert("Gagal deposit: " + err.message); 
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

      // FIX: Menambahkan fallback "DANA" jika profile?.payment_method bernilai null atau kosong
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

  const formatRupiah = (num: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);

  if (loading) return <p className="text-xs text-slate-400 p-6">Memuat dompet...</p>;

  return (
    <div className="p-2 space-y-6 max-w-6xl mx-auto text-xs text-slate-700 font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* BERKAS PERBAIKAN: KOTAK KARTU UTAMA DENGAN KEUNTUNGAN BERJALAN DI DALAMNYA */}
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
            
            {/* TAMPILAN KEUNTUNGAN DIMASUKKAN SEBAGAI SUB-BARIS ELEGAN DI DALAM KARTU */}
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
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-4"><ArrowDownCircle className="h-4 w-4 text-emerald-600" /><h3>Isi Saldo (Deposit)</h3></div>
          <form onSubmit={handleDeposit} className="space-y-4">
            <input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="Contoh: 100000" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-slate-800" required />
            <button type="submit" disabled={submittingDeposit} className="w-full bg-blue-700 text-white font-bold py-3 rounded-xl shadow-sm cursor-pointer">{submittingDeposit ? "Mengirim..." : "Ajukan Pembayaran Deposit"}</button>
          </form>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-4"><ArrowUpCircle className="h-4 w-4 text-rose-600" /><h3>Tarik Dana (Withdraw)</h3></div>
          <form onSubmit={handleWithdraw} className="space-y-4">
            <input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="Minimal Rp 50.000" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-slate-800" required />
            <button type="submit" disabled={submittingWithdraw} className="w-full bg-rose-700 text-white font-bold py-3 rounded-xl shadow-sm cursor-pointer">{submittingWithdraw ? "Memproses..." : "Ajukan Penarikan Cash"}</button>
          </form>
        </div>
      </div>
    </div>
  );
}