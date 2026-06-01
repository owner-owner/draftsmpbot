import mineflayer from 'mineflayer';
import express from 'express';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const app = express();
app.get('/', (_req, res) => {
  res.send('بوت zero7even شغال 24 ساعة!');
});
app.listen(PORT, () => {
  console.log(`الموقع جاهز للربط مع UptimeRobot على بورت ${PORT}`);
});

const BOT_CONFIG = {
  host: 'zero7even.net',
  port: 25565,
  username: 'AZSRGDTS34245',
};

const RECONNECT_DELAY_MS = 5000;

let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

function scheduleReconnect(reason: string) {
  if (reconnectTimeout) return;
  console.log(`[Reconnect] سيتم إعادة الاتصال خلال ${RECONNECT_DELAY_MS / 1000} ثواني... السبب: ${reason}`);
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
  console.log('[Bot] جاري الاتصال بالسيرفر...');

  const bot = mineflayer.createBot(BOT_CONFIG);

  bot.on('spawn', () => {
    console.log('[Bot] ✓ البوت دخل سيرفر zero7even بنجاح! (spawn)');
  });

  // Log every chat message so we can see server responses (captcha prompts, auth messages, etc.)
  bot.on('message', (jsonMsg) => {
    const text = jsonMsg.toString();
    console.log(`[Chat] ${text}`);
  });

  // Log title/subtitle packets (some servers show captcha or auth prompts as titles)
  bot._client.on('title', (packet: Record<string, unknown>) => {
    console.log('[Title packet]', JSON.stringify(packet));
  });

  const afkInterval = setInterval(() => {
    if (bot.entity) {
      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 100);
    }
  }, 60000);

  bot.on('kicked', (reason) => {
    clearInterval(afkInterval);
    const readable = extractText(reason);
    console.log(`[Kicked] النص: "${readable}"`);
    console.log('[Kicked] Raw:', JSON.stringify(reason, null, 2));
    scheduleReconnect(`kicked: ${readable}`);
  });

  bot.on('end', (reason) => {
    clearInterval(afkInterval);
    console.log(`[End] سبب انتهاء الاتصال: "${reason}"`);
    scheduleReconnect(`end: ${reason}`);
  });

  bot.on('error', (err) => {
    console.log(`[Error] نوع الخطأ: ${err.name}, الرسالة: ${err.message}`);
    console.log('[Error] Stack:', err.stack);
  });
}

startBot();
