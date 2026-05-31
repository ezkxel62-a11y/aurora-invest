import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Pastikan TOKEN ini tetap aman
const TELEGRAM_TOKEN = '8769600539:AAEDhHK-QjFQzbRwiAnGg2mi1_iaw3h2-r4';

// Inisialisasi Supabase dengan Service Role Key untuk bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Abaikan jika bukan interaksi klik tombol
    if (!body.callback_query) {
      return NextResponse.json({ status: 'ignored' });
    }

    const { data, id: callbackQueryId, message } = body.callback_query;
    const { chat, message_id: messageId, text: originalText } = message;

    // Split data 'approve_UUID' atau 'reject_UUID'
    const [action, transactionId] = data.split('_');
    const statusBaru = action === 'approve' ? 'APPROVED' : 'REJECTED';
    const emojiStatus = action === 'approve' ? '✅' : '❌';

    // 1. Update status di database Supabase
    const { error } = await supabase
      .from('deposits')
      .update({ status: statusBaru })
      .eq('id', transactionId);

    if (error) throw error;

    // 2. Beri respon ke Telegram agar loading berhenti
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: `Transaksi berhasil di-${statusBaru}!`,
      }),
    });

    // 3. Edit pesan asli di Telegram (menghilangkan tombol & menambah status)
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat.id,
        message_id: messageId,
        text: `${originalText}\n\n${emojiStatus} *PROSES SELESAI:* Telah di-${statusBaru} oleh Admin.`,
        parse_mode: 'Markdown',
      }),
    });

    return NextResponse.json({ status: 'success' });
  } catch (err: any) {
    console.error('Webhook Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}