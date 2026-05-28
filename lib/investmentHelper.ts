import { supabase } from "./supabase";

export async function syncExpiredInvestments(userId: string) {
  try {
    const now = new Date().toISOString();
    
    // 1. Ambil seluruh paket aktif yang masa berlakunya sudah habis
    const { data: expiredList, error: fetchError } = await supabase
      .from("investments")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .lte("expires_at", now);

    if (fetchError) throw fetchError;

    // Jika tidak ada paket yang kedaluwarsa, hentikan proses dengan aman
    if (!expiredList || expiredList.length === 0) {
      return;
    }

    // 2. Ambil saldo akun terupdate
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("wallet_balance")
      .eq("id", userId)
      .single();

    if (profileError) throw profileError;
    
    let currentBalance = Number(profile?.wallet_balance || 0);

    // 3. Gabungkan Modal Pokok + Total Keuntungan ke saldo utama
    for (const inv of expiredList) {
      currentBalance += Number(inv.amount) + Number(inv.total_profit);

      // Tandai investasi telah selesai dicairkan
      const { error: updateInvError } = await supabase
        .from("investments")
        .update({ status: "completed" })
        .eq("id", inv.id);
        
      if (updateInvError) throw updateInvError;
    }

    // 4. Update saldo akhir dompet profile user
    const { error: updateProfileError } = await supabase
      .from("profiles")
      .update({ wallet_balance: currentBalance })
      .eq("id", userId);

    if (updateProfileError) throw updateProfileError;

  } catch (err: any) {
    // PERBAIKAN UTAMA: Memaksa cetakan string murni dan melacak properti alternatif jika ada objek bersarang
    console.error("--- AUTO-CLAIM ENGINE CRASH LOG ---");
    console.error("Pesan Error Murni:", String(err));
    console.error("Detail Pesan:", err?.message || "Tidak ada pesan tekstual");
    console.error("Kode Error DB:", err?.code || "N/A");
    console.error("Detail Objek Error:", JSON.stringify(err, Object.getOwnPropertyNames(err)));
    console.error("-----------------------------------");
  }
}