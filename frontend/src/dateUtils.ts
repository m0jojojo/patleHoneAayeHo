const SHORT_MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

// "YYYY-MM-DD" in the device's local timezone (not UTC) - matches what the calendar picker shows
// and what the backend's ?date= param expects.
export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayDateString(): string {
  return formatDateString(new Date());
}

// e.g. "9 Jul" - a short, friendly label for a non-today date.
export function formatDateForDisplay(dateString: string): string {
  const [, month, day] = dateString.split('-').map(Number);
  return `${day} ${SHORT_MONTH_NAMES[month - 1]}`;
}
