import { Schedule, Worker } from '@/types';
import { formatDate } from '@/utils/dateUtils';
import { generateSchedulePDF } from './pdfService';

export async function shareViaWhatsApp(
  schedule: Schedule,
  workers: Worker[]
): Promise<boolean> {
  try {
    const blob = generateSchedulePDF(schedule, workers);
    const weekStart = formatDate(schedule.weekStartDate, 'MMM d');
    const weekEnd = formatDate(
      new Date(schedule.weekStartDate.getTime() + 6 * 24 * 60 * 60 * 1000),
      'MMM d'
    );

    const message = `Oakberry Team Schedule\nWeek: ${weekStart} - ${weekEnd}\n\nPlease check the attached PDF for your shifts this week.`;

    // Check if Web Share API is available and supports files
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], 'schedule.pdf')] })) {
      const file = new File([blob], `oakberry-schedule-${formatDate(schedule.weekStartDate, 'yyyy-MM-dd')}.pdf`, {
        type: 'application/pdf'
      });

      try {
        await navigator.share({
          title: 'Oakberry Team Schedule',
          text: message,
          files: [file]
        });
        return true;
      } catch (err) {
        // User cancelled or error occurred
        console.error('Share failed:', err);
        return false;
      }
    } else {
      // Fallback: Download PDF and open WhatsApp with text
      downloadAndShare(blob, schedule, message);
      return true;
    }
  } catch (error) {
    console.error('Failed to share schedule:', error);
    return false;
  }
}

function downloadAndShare(
  blob: Blob,
  schedule: Schedule,
  message: string
): void {
  // First, download the PDF
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const weekStart = formatDate(schedule.weekStartDate, 'yyyy-MM-dd');

  link.href = url;
  link.download = `oakberry-schedule-${weekStart}.pdf`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Then open WhatsApp with the message
  setTimeout(() => {
    const encodedMessage = encodeURIComponent(message + '\n\n(Please attach the downloaded PDF)');
    const whatsappUrl = `whatsapp://send?text=${encodedMessage}`;

    // Try to open WhatsApp
    window.location.href = whatsappUrl;

    // Clean up
    URL.revokeObjectURL(url);
  }, 1000); // Give time for download to start
}

export function canShare(): boolean {
  // Check if we're on a mobile device or have Web Share API
  return Boolean(navigator.share) || isMobileDevice();
}

function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

export async function shareText(text: string): Promise<boolean> {
  if (navigator.share) {
    try {
      await navigator.share({
        text: text
      });
      return true;
    } catch (err) {
      console.error('Share failed:', err);
      return false;
    }
  } else {
    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(text);
      alert('Schedule information copied to clipboard!');
      return true;
    } catch (err) {
      console.error('Copy failed:', err);
      return false;
    }
  }
}

export function generateShareMessage(
  schedule: Schedule,
  workers: Worker[]
): string {
  const weekStart = formatDate(schedule.weekStartDate, 'MMM d');
  const weekEnd = formatDate(
    new Date(schedule.weekStartDate.getTime() + 6 * 24 * 60 * 60 * 1000),
    'MMM d'
  );

  let message = `📅 Oakberry Schedule\n${weekStart} - ${weekEnd}\n\n`;

  // Group shifts by day
  const shiftsByDay = new Map<string, typeof schedule.shifts>();

  for (let i = 0; i < 7; i++) {
    const date = new Date(schedule.weekStartDate);
    date.setDate(date.getDate() + i);
    const dateKey = formatDate(date, 'yyyy-MM-dd');

    const dayShifts = schedule.shifts.filter(shift =>
      formatDate(shift.date, 'yyyy-MM-dd') === dateKey
    );

    if (dayShifts.length > 0) {
      shiftsByDay.set(dateKey, dayShifts);
    }
  }

  // Format each day
  shiftsByDay.forEach((shifts, dateKey) => {
    const date = new Date(dateKey);
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];

    message += `${dayName} ${formatDate(date, 'MMM d')}:\n`;

    const sortedShifts = shifts.sort((a, b) => a.startTime.localeCompare(b.startTime));

    sortedShifts.forEach(shift => {
      const worker = workers.find(w => w.id === shift.workerId);
      const workerName = worker ? worker.name : '❗ UNASSIGNED';
      const shiftType = shift.type === 'opening' ? '(Open)' :
                       shift.type === 'closing' ? '(Close)' : '';

      message += `  ${shift.startTime}-${shift.endTime} ${workerName} ${shiftType}\n`;
    });

    message += '\n';
  });

  return message.trim();
}