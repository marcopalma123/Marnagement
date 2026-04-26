let offset = 0;

export interface TelegramMessage {
  messageId: number;
  text: string;
  chatId: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  timestamp: string;
}

export async function pollTelegram(): Promise<TelegramMessage[]> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return [];

  const messages: TelegramMessage[] = [];

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=30`
    );
    const data = await res.json();

    if (!data.ok || !data.result) return [];

    for (const update of data.result) {
      offset = update.update_id + 1;

      const msg = update.message;
      if (!msg?.text) continue;

      messages.push({
        messageId: msg.message_id,
        text: msg.text,
        chatId: msg.chat.id,
        firstName: msg.chat.first_name,
        lastName: msg.chat.last_name,
        username: msg.chat.username,
        timestamp: new Date(msg.date * 1000).toISOString(),
      });
    }
  } catch (err) {
    console.error('Telegram polling error:', err);
  }

  return messages;
}