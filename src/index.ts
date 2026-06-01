import mineflayer from 'mineflayer';
import express from 'express';

// إجبار السيرفر على استخدام بورت ريندر المتوافق لمنع الكراش
const PORT = process.env.PORT || '10000';

const app = express();
app.get('/', (_req, res) => {
  res.status(200).send('البوت شغال ومتجه للفارم في السيرفر الجديد!');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Express] الموقع مستقر ويستمع على بورت ${PORT}`);
});

// إعدادات السيرفر الجديد
const BOT_CONFIG = {
  host: 'draftsmp.net', // 👈 حط آيبي السيرفر الجديد هنا
  port: 25565,
  username: 'atqwerty', // 👈 حط اسم حسابك هنا
};

const RECONNECT_DELAY_MS = 5000; // إعادة اتصال آمنة كل 30 ثانية
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

function scheduleReconnect(reason: string) {
  if (reconnectTimeout) return;
  console.log(`[Reconnect] سيتم إعادة الاتصال خلال ${RECONNECT_DELAY_MS / 1000} ثانية... السبب: ${reason}`);
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    startBot();
  }, RECONNECT_DELAY_MS);
}

function extractText(obj: unknown): string {
  if (typeof obj === 'string') return obj;
  if (typeof obj === 'object' && obj !== null) {
    const o = obj as Record<string, unknown>;
    if (o.value !== undefined) return extractText(o.value);
    if (Array.isArray(o)) return (o as unknown[]).map(extractText).join('');
    const parts: string[] = [];
    if (o.text) parts.push(extractText(o.text));
    if (o.extra) parts.push(extractText(o.extra));
    return parts.join('');
  }
  if (Array.isArray(obj)) return (obj as unknown[]).map(extractText).join('');
  return String(obj);
}

function startBot() {
  console.log('[Bot] جاري الاتصال بالسيرفر الجديد...');
  const bot = mineflayer.createBot(BOT_CONFIG);

  bot.on('message', (jsonMsg) => {
    const text = jsonMsg.toString();
    console.log(`[Chat] ${text}`);

    // 1. رصد رسالة الحماية وتسجيل الدخول
    if (text.includes('login') || text.includes('/login') || text.includes('تسجيل الدخول') || text.includes('Please, login')) {
      console.log('[Bot] 🔑 تم رصد رسالة الحماية! جاري تسجيل الدخول...');
      bot.chat('/login AZERTY65'); 
    }

    // 2. الخدعة: رصد نجاح الدخول والذهاب للفارم فوراً لتفادي النقل التلقائي للسبون
    if (text.includes('Successfully logged in') || text.includes('تم تسجيل الدخول بنجاح') || text.includes('logged in')) {
      console.log('[Bot] 🏃 تم تسجيل الدخول! انتظر ثانيتين للانتقال التلقائي إلى الفارم...');
      
      setTimeout(() => {
        // ⚠️ غيّر الأمر بالأسفل (/home farm) للأمر الشغال في سيرفرك الجديد مثل /warp أو /back
        bot.chat('/afk'); 
        console.log('[Bot] ⚡ تم إرسال أمر الانتقال للفارم بنجاح.');
      }, 2000);
    }
  });

  // تفعيل التشييف التلقائي فور الرسبنة في العالم لحمايتك
  bot.on('spawn', () => {
    console.log('[Bot] ✓ البوت رسبن بنجاح! جاري تفعيل وضع الـ Shift (Sneak)...');
    bot.setControlState('sneak', true); 
  });

  bot.on('kicked', (reason) => {
    const readable = extractText(reason);
    console.log(`[Kicked] النص: "${readable}"`);
    scheduleReconnect(`kicked: ${readable}`);
  });

  bot.on('end', (reason) => {
    console.log(`[End] سبب انتهاء الاتصال: "${reason}"`);
    scheduleReconnect(`end: ${reason}`);
  });

  bot.on('error', (err) => {
    console.log(`[Error] نوع الخطأ: ${err.name}, الرسالة: ${err.message}`);
  });
}

startBot();
