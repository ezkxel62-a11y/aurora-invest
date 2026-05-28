"use client";

import React, { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/login",
    });

    if (error) alert(error.message);
    else alert("Link pemulihan kata sandi telah dikirim ke email Anda!");
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4 font-sans text-slate-700">
      <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm max-w-sm w-full space-y-4">
        <h2 className="text-base font-bold text-slate-900 text-center">Pulihkan Kata Sandi</h2>
        <form onSubmit={handleReset} className="space-y-4">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email terdaftar" className="w-full px-3 py-2 border text-xs rounded-xl" />
          <button type="submit" className="w-full bg-[#0B1A30] text-white py-2 text-xs font-semibold rounded-xl">{loading ? "Mengirim..." : "Kirim Link Pemulihan"}</button>
        </form>
        <p className="text-center text-xs"><Link href="/login" className="text-blue-600 hover:underline">Kembali ke Login</Link></p>
      </div>
    </div>
  );
}
