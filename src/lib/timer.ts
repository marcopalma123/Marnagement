const logs: Array<{
  id: string;
  taskId: string;
  status: 'success';
  timestamp: string;
  output?: string;
}> = [];

let intervalId: NodeJS.Timeout | null = null;

export function startTimer() {
  if (intervalId) return;
  
  intervalId = setInterval(() => {
    const timestamp = new Date().toISOString();
    console.log(`[TIMER] ${timestamp} - Timer tick`);
    
    logs.push({
      id: `${Date.now()}`,
      taskId: 'timer-task',
      status: 'success',
      timestamp,
      output: `Timer ran at ${timestamp}`,
    });
    
    if (logs.length > 100) logs.shift();
  }, 60000);
  
  console.log('[TIMER] Timer started - will run every minute');
}

export function stopTimer() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[TIMER] Timer stopped');
  }
}

export function getLogs() {
  return logs;
}