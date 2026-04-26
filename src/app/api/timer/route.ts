import { NextResponse } from "next/server";
import { checkConsecutiveEmptyDays } from "@/lib/calendar-checks";
import { sendAlertService } from "@/lib/alert-service";
import { getTimerStatesDb, setTimerStateDb } from "@/lib/db";
import { getCurrentUserFromRequest } from "@/lib/auth";

interface TimerInstance {
  intervalId: NodeJS.Timeout;
  name: string;
  userId: string;
}

const timers = new Map<string, TimerInstance>();

interface LogEntry {
  id: string;
  taskId: string;
  status: 'success' | 'failed';
  timestamp: string;
  userId: string;
  output?: string;
  error?: string;
  timerId?: string;
}

const logs: LogEntry[] = [];

async function timerTick(userId: string, timerId: string) {
  const timestamp = new Date().toISOString();
  console.log(`[TIMER] ${timestamp} - Timer tick (${timerId})`);
  
  try {
    const result = await checkConsecutiveEmptyDays(userId);
    
    if (result.hasConsecutiveEmptyDays) {
      console.log('[TIMER] Found consecutive empty days:', result.emptyDays);
      await sendAlertService({
        type: "CONSECUTIVE_EMPTY_DAYS",
        days: result.emptyDays,
        message: `Alert: No data found for ${result.emptyDays.join(" and ")}`,
      });
    }
    
    logs.push({
      id: `${Date.now()}`,
      taskId: "timer-task",
      status: "success",
      timestamp,
      userId,
      timerId,
      output: result.hasConsecutiveEmptyDays 
        ? `Alert sent for days: ${result.emptyDays.join(", ")}`
        : "No consecutive empty days",
    });
  } catch (err) {
    console.error('[TIMER] Error:', err);
    logs.push({
      id: `${Date.now()}`,
      taskId: "timer-task",
      status: "failed",
      timestamp,
      userId,
      timerId,
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
  
  if (logs.length > 100) logs.shift();
}

function generateId(): string {
  return `timer-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

async function startTimer(userId: string, name: string = '') {
  const id = generateId();
  const startedAt = new Date().toISOString();
  
  console.log(`[TIMER] Starting timer: ${id} at ${startedAt}`);
  
  await timerTick(userId, id);
  const intervalId = setInterval(() => timerTick(userId, id), 60000);
  
  timers.set(`${userId}:${id}`, { intervalId, name, userId });
  
  console.log('[TIMER] Saving to DB:', { id, startedAt });
  await setTimerStateDb(userId, id, true, startedAt, name);
  console.log('[TIMER] Saved to DB');
  
  console.log(`[TIMER] Timer started: ${id} (${name || 'unnamed'})`);
  return id;
}

async function stopTimer(userId: string, id: string) {
  const key = `${userId}:${id}`;
  const timer = timers.get(key);
  if (timer) {
    clearInterval(timer.intervalId);
    timers.delete(key);
    try {
      await setTimerStateDb(userId, id, false, null, '');
    } catch (err) {
      console.error('[TIMER] Failed to save timer state:', err);
    }
    console.log(`[TIMER] Timer stopped: ${id}`);
    return true;
  }
  return false;
}

async function syncTimerStates(userId: string) {
  try {
    const states = await getTimerStatesDb(userId);
    for (const state of states) {
      const key = `${userId}:${state.id}`;
      if (state.running && state.startedAt && !timers.has(key)) {
        const startedAt = new Date(state.startedAt);
        const now = new Date();
        const elapsedMinutes = Math.floor((now.getTime() - startedAt.getTime()) / 60000);
        console.log(`[TIMER] Database shows timer ${state.id} was started ${elapsedMinutes} minutes ago`);
        await timerTick(userId, state.id);
        const intervalId = setInterval(() => timerTick(userId, state.id), 60000);
        timers.set(key, { intervalId, name: state.name, userId });
        console.log(`[TIMER] Timer resumed: ${state.id}`);
      }
    }
  } catch (err) {
    console.error('[TIMER] Error syncing timer states:', err);
  }
}

export async function GET(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await syncTimerStates(user.id);
  
  const activeTimers = Array.from(timers.entries())
    .map(([id, timer]) => {
      const [ownerUserId, timerId] = id.split(':');
      return {
        ownerUserId,
        id: timerId,
        name: timer.name,
      };
    })
    .filter((t) => t.ownerUserId === user.id)
    .map(({ id, name }) => ({ id, name }));
  
  return NextResponse.json({ 
    timers: activeTimers,
    logs: logs.filter((log) => log.userId === user.id).slice(0, 50).reverse(),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const name = body.name || '';
  
  const id = await startTimer(user.id, name);
  return NextResponse.json({ success: true, id, name });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ error: 'Missing timer id' }, { status: 400 });
  }
  
  const stopped = await stopTimer(user.id, id);
  return NextResponse.json({ success: stopped, id });
}
