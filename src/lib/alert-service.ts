import { sendTelegramNotification } from "./telegram";

type AlertPayload = {
  type: string;
  days: string[];
  message: string;
};

export async function sendAlertService(payload: AlertPayload) {
  const formattedDays = payload.days.map((day, i) => `${i + 1}. ${day}`).join("\n");
  const message = `<b>⚠️ Calendar Alert</b>\n\n${payload.message}\n\n<b>Consecutive Empty Days:</b>\n${formattedDays}`;
  await sendTelegramNotification(message);
}