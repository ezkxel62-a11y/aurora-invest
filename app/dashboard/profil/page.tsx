"use client";
import React, { useState, useEffect, useRef } from "react";
import { Save, Upload, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ProfilPage() {
  const [emailUser, setEmailUser] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // State Input Form
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [job, setJob] = useState("");
  const [education, setEducation] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("DANA");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Reference untuk memicu klik pada input galeri tersembunyi
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmailUser(user.email || "");
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (data) {
          setFullName(data.full_name || "");
          setPhoneNumber(data.phone_number || "");
          setAddress(data.address || "");
          setJob(data.job || "");
          setEducation(data.education || "");
          setPaymentMethod(data.payment_method || "DANA");
          setAccountNumber(data.account_number || "");
          setAccountName(data.account_name || "");
          setAvatarUrl(data.avatar_url || null);
        }
      }
      setLoading(false);
    }
    fetchProfile();
  }, []);

  // Fungsi untuk memicu jendela pencarian berkas media / galeri
  const handleTriggerUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Fungsi memproses unggahan gambar setelah dipilih dari galeri
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Proteksi batas file gambar maksimal 2MB
    if (file.size > 2 * 1024 * 1024) {
      return alert("Ukuran foto terlalu besar! Batas maksimal adalah 2MB.");
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // 1. Unggah berkas gambar asli ke Storage Bucket Supabase 'investasi'
      const { error: uploadError } = await supabase.storage
        .from("investasi")
        .upload(filePath, file, { cacheControl: "3600", upsert: true });

      if (uploadError) {
        throw new Error(uploadError.message + ". Pastikan Anda sudah membuat bucket bernama 'investasi' dengan akses Public di Supabase Storage.");
      }

      // 2. Dapatkan tautan URL publik dari gambar yang berhasil disimpan
      const { data: { publicUrl } } = supabase.storage
        .from("investasi")
        .getPublicUrl(filePath);

      // 3. Sinkronisasikan kolom avatar_url di tabel profil database
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      alert("Foto profil berhasil diperbarui!");
    } catch (error: any) {
      console.error(error);
      alert("Gagal mengunggah foto: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  // Fungsi menghapus tautan foto profil (Rollback ke inisial nama)
  const handleDeleteAvatar = async () => {
    if (!confirm("Apakah Anda yakin ingin menghapus foto profil saat ini?")) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Putus tautan gambar pada row profil user di database
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id);

      if (error) throw error;

      setAvatarUrl(null);
      alert("Foto profil berhasil dihapus!");
    } catch (error: any) {
      alert("Gagal menghapus foto profil: " + error.message);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        email: emailUser, 
        full_name: fullName,
        phone_number: phoneNumber,
        address: address,
        job: job,
        education: education,
        payment_method: paymentMethod,
        account_number: accountNumber,
        account_name: accountName,
        avatar_url: avatarUrl
      });

      if (error) throw error;
      alert("Profil dan Data Rekening Sukses Diperbarui!");
    } catch (err: any) {
      alert("Gagal memperbarui profil: " + err.message);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "AU";
    return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  };

  if (loading) return <p className="text-xs text-slate-400 animate-pulse p-6">Sinkronisasi data profil Aurora...</p>;

  return (
    <div className="max-w-6xl mx-auto p-2">
      
      {/* INPUT FILE MEDIA TERSEMBUNYI (Pemicu Utama Galeri Perangkat) */}
      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg, image/png, image/jpg"
        className="hidden"
      />

      {/* SEKAT TATA LETAK UTAMA GRID BERDAMPINGAN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* BLOK KIRI: AVATAR FOTO PROFIL */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm text-center flex flex-col items-center justify-center">
          <div className="w-24 h-24 bg-[#0B1A30] text-white rounded-full flex items-center justify-center text-xl font-bold mb-4 shadow-md border-4 border-slate-50 uppercase overflow-hidden relative">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profil" className="w-full h-full object-cover" />
            ) : (
              getInitials(fullName)
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] text-white font-medium">
                Memuat...
              </div>
            )}
          </div>
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-tight">{fullName || "MEMBER AURORA"}</h4>
          <p className="text-[11px] text-slate-400 font-medium mb-5 lowercase">{emailUser}</p>
          
          {/* GRUP CONTAINER TOMBOL FOTO PROFIL */}
          <div className="w-full space-y-2">
            <button 
              type="button" 
              onClick={handleTriggerUpload}
              disabled={uploading}
              className="w-full bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold py-2 px-4 border border-slate-200 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              <Upload className="h-3.5 w-3.5" /> {uploading ? "Mengunggah..." : "Ganti Foto"}
            </button>

            {avatarUrl && (
              <button 
                type="button" 
                onClick={handleDeleteAvatar}
                disabled={uploading}
                className="w-full bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold py-2 px-4 border border-red-100 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Hapus Foto
              </button>
            )}
          </div>
        </div>

        {/* BLOK KANAN: FORM ISIAN LENGKAP */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
          <div className="border-b border-slate-50 pb-3 mb-5">
            <h3 className="font-bold text-slate-900 text-sm">Informasi Akun Lengkap</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Kelola informasi pribadi dan data rekening bank tujuan penarikan Anda di sini.</p>
          </div>

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-500 font-semibold block mb-1">Nama Lengkap / Username</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-600 font-medium text-slate-800" />
              </div>
              <div>
                <label className="text-slate-500 font-semibold block mb-1">Nomor Telepon / WA</label>
                <input type="text" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-600 font-medium text-slate-800" />
              </div>
            </div>

            <div>
              <label className="text-slate-500 font-semibold block mb-1">Alamat Rumah Lengkap</label>
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-600 font-medium text-slate-800 h-20 resize-none" placeholder="Nama jalan, nomor rumah, RT/RW, kecamatan" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-500 font-semibold block mb-1">Pekerjaan Saat Ini</label>
                <input type="text" value={job} onChange={(e) => setJob(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-600 font-medium text-slate-800" />
              </div>
              <div>
                <label className="text-slate-500 font-semibold block mb-1">Pendidikan Terakhir</label>
                <input type="text" value={education} onChange={(e) => setEducation(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-600 font-medium text-slate-800" />
              </div>
            </div>

            {/* SEKTOR PENERIMAAN DANA WALLET */}
            <div className="bg-blue-50/30 border border-blue-100/60 rounded-2xl p-4 space-y-3">
              <span className="font-bold text-[#0B1A30] block text-[11px]">Pengaturan Rekening Penarikan Dana</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 font-medium block mb-1">Metode Pembayaran</label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 focus:outline-none focus:border-blue-600 font-medium text-slate-800">
                    <option value="DANA">DANA</option>
                    <option value="Bank Mandiri">Bank Mandiri</option>
                    <option value="Bank BCA">Bank BCA</option>
                    <option value="Bank BRI">Bank BRI</option>
                    <option value="OVO">OVO</option>
                    <option value="Gopay">Gopay</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 font-medium block mb-1">Nomor Rekening / No. HP DANA</label>
                  <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Masukkan nomor rekening/HP" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-600 font-bold text-slate-800 tracking-wider" required />
                </div>
                <div>
                  <label className="text-slate-400 font-medium block mb-1">Nama Sesuai Rekening</label>
                  <input type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-600 font-medium text-slate-800" />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button type="submit" className="bg-[#0B1A30] hover:bg-slate-800 text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-sm">
                <Save className="h-4 w-4" /> Simpan Perubahan
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}