"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { syncExpiredInvestments } from "@/lib/investmentHelper";
import { BarChart3, ShieldCheck, CheckCircle2, Clock } from "lucide-react";

export default function InvestasiSayaPage() {
  const [investments, setInvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvestments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Jalankan sinkronisasi otomatis
      await syncExpiredInvestments(user.id);

      const { data, error } = await supabase
        .from("investments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvestments(data || []);
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvestments(); }, []);

  if (loading) return <p className="text-xs text-slate-400 p-6 text-center">Membuat ringkasan portofolio Anda...</p>;

  return (
    <div className="p-2 space-y-6 max-w-6xl mx-auto text-xs text-slate-700 font-sans">
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="h-4 w-4 text-blue-600" />
          <h3 className="text-slate-900 font-bold text-sm">Portofolio Investasi Aktif & Selesai</h3>
        </div>
        <p className="text-[11px] text-slate-400 font-medium">Pantau pertumbuhan aset digital dan kontrak jangka waktu investasi Anda secara real-time di sini.</p>

        <div className="mt-6 space-y-4">
          {investments.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-2xl text-slate-400 font-medium bg-slate-50/50">
              Anda belum memiliki paket investasi aktif saat ini.
            </div>
          ) : (
            investments.map((item) => {
              const isActive = item.status === "active";
              return (
                <div key={item.id} className={`border rounded-2xl p-4 flex flex-col md:flex-row justify-between md:items-center gap-4 transition-all ${isActive ? "bg-white border-blue-100 shadow-sm" : "bg-slate-50/70 border-slate-200"}`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">{item.package_name}</h4>
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold flex items-center gap-0.5 ${isActive ? "bg-blue-50 text-blue-700 border border-blue-100" : "bg-slate-200 text-slate-600"}`}>
                        {isActive ? <Clock className="h-2.5 w-2.5" /> : <CheckCircle2 className="h-2.5 w-2.5" />}
                        {isActive ? "Berjalan" : "Selesai & Dicairkan"}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[10px]">
                      Tanggal Beli: <span className="font-semibold text-slate-600">{new Date(item.created_at).toLocaleDateString("id-ID")}</span> | 
                      Masa Habis Kontrak: <span className="font-semibold text-slate-600">{new Date(item.expires_at).toLocaleDateString("id-ID")} ({item.duration_days} Hari)</span>
                    </p>
                  </div>

                  <div className="flex gap-6 text-right justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                    <div>
                      <p className="text-[10px] text-slate-400">Modal Pokok</p>
                      <p className="font-bold text-slate-800">Rp {item.amount.toLocaleString("id-ID")}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">Total Imbal Hasil</p>
                      <p className="font-extrabold text-emerald-600">+ Rp {item.total_profit.toLocaleString("id-ID")}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}