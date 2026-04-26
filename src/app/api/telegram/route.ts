import { NextResponse } from "next/server";
import { pollTelegram } from "@/lib/telegram-polling";
import { NextRequest } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

let lastMessages: ReturnType<typeof pollTelegram> extends Promise<infer T> ? T : never = [];

async function checkForNewMessages() {
  const newMessages = await pollTelegram();
  if (newMessages.length > 0) {
    lastMessages = newMessages;
  }
  return lastMessages;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const messages = await checkForNewMessages();
    return NextResponse.json({ messages });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}
