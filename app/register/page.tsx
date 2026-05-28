"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    address: "",
    occupation: "",
    education: "",
    paymentMethod: "DANA",
    accountName: "",
    email: "",
    password: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 1. Daftarkan akun ke sistem autentikasi Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });

    if (authError) {
      alert("Pendaftaran Gagal: " + authError.message);
      setLoading(false);
      return;
    }

    const user = authData?.user;
    if (user) {
      // 2. Simpan data lengkap ke Table Editor Profiles (Termasuk Email wajib)
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          email: formData.email, // Memenuhi syarat NOT NULL database
          full_name: formData.fullName,
          phone_number: formData.phone,
          address: formData.address,
          job: formData.occupation,
          education: formData.education,
          payment_method: formData.paymentMethod,
          account_name: formData.accountName,
          account_number: formData.phone, // Otomatis nomor HP menjadi nomor rekening awal
          wallet_balance: 0
        });

      if (profileError) {
        alert("Gagal menyimpan detail profil tambahan: " + profileError.message);
      } else {
        alert("Pendaftaran Berhasil! Silakan masuk ke akun Anda.");
        router.push("/login");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex bg-white font-sans text-slate-700">
      {/* SISI KIRI: BRAND PANEL */}
      <div className="w-[25%] bg-[#0B1A30] text-white flex flex-col justify-between p-8 hidden lg:flex shrink-0 border-r border-slate-800">
        <div className="flex items-center gap-3 py-4">
          <div className="text-blue-500">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 22h20L12 2zm0 4.5l6.5 13h-13L12 6.5z"/>
            </svg>
          </div>
          <span className="text-white text-base font-semibold tracking-wider leading-tight">
            AURORA <br /> <span className="text-xs font-normal text-slate-400">INVEST</span>
          </span>
        </div>
        <div className="text-xs text-slate-500">© 2024 Aurora Invest. Semua Hak Dilindungi.</div>
      </div>

      {/* SISI KANAN: FORMULIR LENGKAP */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-8 overflow-y-auto">
        <div className="w-full max-w-2xl space-y-6 bg-white p-2">
          <div className="text-center md:text-left space-y-1">
            <h2 className="text-xl font-bold text-slate-900">Formulir Pendaftaran Anggota</h2>
            <p className="text-xs text-slate-400">Lengkapi seluruh data di bawah ini untuk validasi akun investasi.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-500 mb-1">Nama Lengkap</label>
                <input type="text" name="fullName" required value={formData.fullName} onChange={handleChange} placeholder="Sesuai KTP / Rekening" className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0B1A30]" />
              </div>
              <div>
                <label className="block font-medium text-slate-500 mb-1">Nomor Telepon / WA</label>
                <input type="text" name="phone" required value={formData.phone} onChange={handleChange} placeholder="Contoh: 08123456789" className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0B1A30]" />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-medium text-slate-500 mb-1">Alamat Rumah Lengkap</label>
                <input type="text" name="address" required value={formData.address} onChange={handleChange} placeholder="Nama jalan, nomor rumah, RT/RW, kecamatan" className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0B1A30]" />
              </div>
              <div>
                <label className="block font-medium text-slate-500 mb-1">Pekerjaan Saat Ini</label>
                <input type="text" name="occupation" required value={formData.occupation} onChange={handleChange} placeholder="Contoh: Karyawan Swasta" className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0B1A30]" />
              </div>
              <div>
                <label className="block font-medium text-slate-500 mb-1">Pendidikan Terakhir</label>
                <input type="text" name="education" required value={formData.education} onChange={handleChange} placeholder="Contoh: S1 Teknik" className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0B1A30]" />
              </div>
              <div>
                <label className="block font-medium text-slate-500 mb-1">Pilihan Bank / E-Wallet Pembayaran</label>
                <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-[#0B1A30]">
                  <option value="DANA">DANA</option>
                  <option value="Bank Mandiri">Bank Mandiri</option>
                  <option value="Bank BCA">Bank BCA</option>
                  <option value="Bank BRI">Bank BRI</option>
                  <option value="OVO">OVO</option>
                  <option value="Gopay">Gopay</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-500 mb-1">Nama Pemilik Rekening / Akun</label>
                <input type="text" name="accountName" required value={formData.accountName} onChange={handleChange} placeholder="Harus sama dengan nama pendaftar" className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0B1A30]" />
              </div>
              <div>
                <label className="block font-medium text-slate-500 mb-1">Alamat Email Baru</label>
                <input type="email" name="email" required value={formData.email} onChange={handleChange} placeholder="nama@email.com" className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0B1A30]" />
              </div>
              <div>
                <label className="block font-medium text-slate-500 mb-1">Kata Sandi Akun</label>
                <input type="password" name="password" required value={formData.password} onChange={handleChange} placeholder="••••••••" className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0B1A30]" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-[#0B1A30] text-white py-3 rounded-xl font-semibold hover:bg-slate-800 transition-colors mt-2 text-xs cursor-pointer">
              {loading ? "Menyimpan Data Anggota..." : "Daftar Akun Aurora"}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400">
            Sudah terdaftar? <Link href="/login" className="text-blue-600 font-medium hover:underline">Masuk Aplikasi</Link>
          </p>
        </div>
      </div>
    </div>
  );
}