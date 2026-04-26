import { NextResponse } from "next/server";
import { sendTelegramNotification } from "@/lib/telegram";
import { getCurrentUserFromRequest } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await getCurrentUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    await sendTelegramNotification(message);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error }, { status: 500 });
  }
}
