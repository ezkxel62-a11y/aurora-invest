"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowDownCircle, ArrowUpCircle, Clock } from "lucide-react";

export default function RiwayatPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRiwayat() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase.from("deposits").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
        if (error) throw error;
        setTransactions(data || []);
      } catch (error: any) {
        console.error(error.message);
      } finally {
        setLoading(false);
      }
    }
    fetchRiwayat();
  }, []);

  const renderStatusBadge = (status: string) => {
    if (status === "approved") return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">Disetujui</span>;
    if (status === "rejected") return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-600 border border-rose-200">Ditolak</span>;
    return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">Pending</span>;
  };

  if (loading) return <p className="text-xs text-slate-400 text-center py-10">Memuat mutasi...</p>;

  return (
    <div className="p-2 space-y-6 max-w-6xl mx-auto text-xs text-slate-700 font-sans">
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
        <h3 className="text-slate-900 font-bold text-sm">Semua Riwayat Transaksi</h3>
        <p className="text-[11px] text-slate-400 font-medium mt-0.5">Mutasi lengkap log keuangan Anda.</p>
        
        <div className="mt-6 divide-y divide-slate-100">
          {transactions.map((item) => {
            const isDeposit = item.type === "deposit";
            return (
              <div key={item.id} className="flex justify-between items-center py-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl ${isDeposit ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                    {isDeposit ? <ArrowDownCircle className="h-4 w-4" /> : <ArrowUpCircle className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 uppercase">{isDeposit ? "Deposit" : "Penarikan Dana"}</p>
                    <p className="text-slate-400 text-[10px] flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(item.created_at).toLocaleString("id-ID")}</p>
                  </div>
                </div>
                <div className="text-right space-y-1.5">
                  <p className={`font-bold text-sm ${isDeposit ? "text-emerald-600" : "text-rose-600"}`}>
                    {isDeposit ? "+" : "-"} {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(item.amount)}
                  </p>
                  <div>{renderStatusBadge(item.status)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}