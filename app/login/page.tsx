"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Eye, EyeOff } from "lucide-react";

// Inisialisasi Supabase Client (Ganti dengan URL dan Anon Key project Anda)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fungsi Login dengan Email & Password
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      window.location.href = "/dashboard"; // Redirect setelah login sukses
    }
    setLoading(false);
  };

  // Fungsi Login dengan Google
  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) setError(error.message);
  };

  return (
    <div className="min-h-screen flex w-full font-sans bg-white">
      {/* Kiri: Sidebar Biru Gelap (disembunyikan di layar kecil) */}
      <div className="hidden lg:flex w-[35%] bg-[#0B1A30] p-10 flex-col justify-between">
        <div className="flex items-center gap-3">
          {/* Ganti dengan Logo SVG Anda */}
          <div className="text-blue-400">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 22h20L12 2zm0 4.5l6.5 13h-13L12 6.5z" />
            </svg>
          </div>
          <span className="text-white text-xl font-semibold tracking-wider">
            AURORA <br /> <span className="text-sm font-normal">INVEST</span>
          </span>
        </div>
      </div>

      {/* Kanan: Form Login */}
      <div className="flex-1 flex flex-col justify-between relative p-6 lg:p-12">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-[400px]">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Selamat datang kembali!
              </h1>
              <p className="text-sm text-gray-500">
                Silakan masuk ke akun Anda untuk melanjutkan.
              </p>
            </div>

            {/* Tombol Google */}
            <button
              onClick={handleGoogleLogin}
              type="button"
              className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-md py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors mb-6 shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>

            {/* Divider Atau */}
            <div className="relative flex items-center mb-6">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">Atau</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            {/* Form Input */}
            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email / Nomor HP
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#0B1A30] focus:border-[#0B1A30] text-sm text-gray-900"
                  placeholder="Masukkan email Anda"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kata Sandi
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#0B1A30] focus:border-[#0B1A30] text-sm text-gray-900 pr-10"
                    placeholder="Masukkan kata sandi"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <div className="flex justify-end mt-2">
                  <a href="#" className="text-sm text-[#0B1A30] hover:underline font-medium">
                    Lupa Kata Sandi?
                  </a>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#182A4E] text-white py-2.5 rounded-md text-sm font-medium hover:bg-[#0B1A30] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0B1A30]"
              >
                {loading ? "Memproses..." : "Masuk"}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-600">
              Belum punya akun?{" "}
              <a href="/register" className="text-[#0B1A30] font-medium hover:underline">
                Daftar
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="w-full flex flex-col md:flex-row justify-between items-center text-xs text-gray-500 pt-6 border-t border-gray-100">
          <p>© 2024 Aurora Invest. Semua Hak Dilindungi.</p>
          <div className="flex gap-4 mt-2 md:mt-0">
            <a href="#" className="hover:text-gray-700 hover:underline">Syarat & Ketentuan</a>
            <span>|</span>
            <a href="#" className="hover:text-gray-700 hover:underline">Kebijakan Privasi</a>
          </div>
        </div>
      </div>
    </div>
  );
}