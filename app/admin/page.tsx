"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CheckCircle, XCircle, RefreshCw } from "lucide-react";

export default function AdminPanelPage() {
  const router = useRouter();
  
  // State Keamanan
  const [authLoading, setAuthLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  // State Fitur Admin Anda
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fungsi mengambil data pending
  const fetchPending = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("deposits")
      .select("*, profiles(full_name, email)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    
    if (data) setTransactions(data);
    setLoading(false);
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
        fetchPending(); // Jalankan pengambilan data internal admin
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
      fetchPending();
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

  // 2. Render Halaman Utama Admin (Hanya tampil jika lolos verifikasi admin)
  return (
    <div className="p-6 max-w-7xl mx-auto text-xs font-sans bg-slate-50 min-h-screen text-slate-700">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Control Panel Admin Aurora</h2>
        </div>
        <button 
          onClick={fetchPending} 
          className="flex items-center gap-1 bg-white border px-3 py-2 rounded-xl font-semibold cursor-pointer hover:bg-slate-50"
        >
          <RefreshCw className="h-3 w-3" /> Refresh Data
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
        <table className="w-full text-left">
          <thead className="bg-slate-900 text-white text-[10px] uppercase font-bold tracking-wider">
            <tr>
              <th className="p-4">Anggota</th>
              <th className="p-4">Tipe Transaksi</th>
              <th className="p-4">Nominal</th>
              <th className="p-4 text-center">Aksi Persetujuan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-400 animate-pulse font-medium">
                  Memeriksa permohonan baru...
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-400 font-medium">
                  Tidak ada permohonan pending saat ini.
                </td>
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
                      <span className={`px-2 py-1 rounded-md font-bold text-[10px] ${isWithdraw ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"}`}>
                        {isWithdraw ? "🔴 PENARIKAN (WITHDRAW)" : "🟢 DEPOSIT UTAMA"}
                      </span>
                    </td>
                    <td className="p-4 font-extrabold text-sm text-slate-900">
                      Rp {item.amount.toLocaleString("id-ID")}
                    </td>
                    <td className="p-4 flex justify-center gap-2">
                      <button 
                        onClick={() => handleDecision(item, "approve")} 
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                      >
                        <CheckCircle className="h-3.5 w-3.5" /> Setuju
                      </button>
                      <button 
                        onClick={() => handleDecision(item, "reject")} 
                        className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Tolak
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}