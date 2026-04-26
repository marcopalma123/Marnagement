import { getWorkDaysDb } from "./db";

export async function checkConsecutiveEmptyDays() {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const formatDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = formatDate(today);
  const yesterdayStr = formatDate(yesterday);

  const records = await getWorkDaysDb();

  const datesWithData = new Set(records.map((r) => r.date));

  const todayEmpty = !datesWithData.has(todayStr);
  const yesterdayEmpty = !datesWithData.has(yesterdayStr);

  const hasConsecutiveEmptyDays = todayEmpty && yesterdayEmpty;

  return {
    hasConsecutiveEmptyDays,
    emptyDays: hasConsecutiveEmptyDays ? [yesterdayStr, todayStr] : [],
  };
}