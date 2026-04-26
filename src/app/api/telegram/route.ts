import { NextResponse } from "next/server";
import { pollTelegram } from "@/lib/telegram-polling";

export const dynamic = "force-dynamic";

let lastMessages: ReturnType<typeof pollTelegram> extends Promise<infer T> ? T : never = [];

async function checkForNewMessages() {
  const newMessages = await pollTelegram();
  if (newMessages.length > 0) {
    lastMessages = newMessages;
  }
  return lastMessages;
}

export async function GET() {
  try {
    const messages = await checkForNewMessages();
    return NextResponse.json({ messages });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}