import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const TELEGRAM_TOKEN = '8769600539:AAEDhHK-QjFQzbRwiAnGg2mi1_iaw3h2-r4';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.callback_query) {
      return NextResponse.json({ status: 'ignored' });
    }

    const { data, id: callbackQueryId, message } = body.callback_query;
    const { chat, message_id: messageId, text: originalText } = message;

    const [action, transactionId] = data.split('_');
    const statusBaru = action === 'approve' ? 'APPROVED' : 'REJECTED';
    const emojiStatus = action === 'approve' ? '✅' : '❌';

    // 1. Ambil data deposit sekaligus untuk mendapatkan user_id dan amount
    const { data: deposit, error: depError } = await supabase
      .from('deposits')
      .update({ status: statusBaru })
      .eq('id', transactionId)
      .select('amount, user_id')
      .single();

    if (depError) throw depError;

    // 2. JIKA APPROVED, TAMBAHKAN SALDO KE wallet_balance
    if (statusBaru === 'APPROVED' && deposit) {
      // Ambil saldo saat ini
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', deposit.user_id)
        .single();

      // Hitung saldo baru (jika null, mulai dari 0)
      const saldoLama = profile?.wallet_balance || 0;
      const saldoBaru = saldoLama + Number(deposit.amount);

      // Update ke tabel profiles
      await supabase
        .from('profiles')
        .update({ wallet_balance: saldoBaru })
        .eq('id', deposit.user_id);
    }

    // 3. Respon ke Telegram (Stop loading)
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: `Transaksi ${statusBaru === 'APPROVED' ? 'Disetujui' : 'Ditolak'}!`,
      }),
    });

    // 4. Edit pesan Telegram
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat.id,
        message_id: messageId,
        text: `${originalText}\n\n${emojiStatus} *PROSES SELESAI:* Telah di-${statusBaru}.`,
        parse_mode: 'Markdown',
      }),
    });

    return NextResponse.json({ status: 'success' });
  } catch (err: any) {
    console.error('Webhook Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}