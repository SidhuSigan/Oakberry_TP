import jsPDF from 'jspdf';
import { Schedule, Worker, Shift } from '@/types';
import { formatDate, DAYS_OF_WEEK_SHORT, calculateDuration } from '@/utils/dateUtils';
import { getWeatherEmoji } from './weatherService';

export function generateSchedulePDF(
  schedule: Schedule,
  workers: Worker[]
): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  const contentWidth = pageWidth - (margin * 2);

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Oakberry Team Schedule', pageWidth / 2, 20, { align: 'center' });

  // Week dates
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const weekStart = formatDate(schedule.weekStartDate, 'MMM d');
  const weekEnd = formatDate(
    new Date(schedule.weekStartDate.getTime() + 6 * 24 * 60 * 60 * 1000),
    'MMM d, yyyy'
  );
  doc.text(`Week: ${weekStart} - ${weekEnd}`, pageWidth / 2, 30, { align: 'center' });

  // Generate schedule by day
  let yPosition = 45;
  const dates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(schedule.weekStartDate);
    date.setDate(date.getDate() + i);
    return date;
  });

  dates.forEach((date, index) => {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    // Day header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const dayName = DAYS_OF_WEEK_SHORT[date.getDay()];
    const dateStr = formatDate(date, 'MMM d');

    // Add weather emoji if available
    const weather = schedule.weather?.find(w =>
      formatDate(w.date) === formatDate(date)
    );
    const weatherEmoji = weather ? getWeatherEmoji(weather) : '';

    doc.text(`${dayName}, ${dateStr} ${weatherEmoji}`, margin, yPosition);
    yPosition += 8;

    // Get shifts for this day
    const dayShifts = schedule.shifts
      .filter(shift => formatDate(shift.date) === formatDate(date))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    // Draw shifts
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    if (dayShifts.length === 0) {
      doc.text('No shifts scheduled', margin + 5, yPosition);
      yPosition += 6;
    } else {
      dayShifts.forEach(shift => {
        const worker = workers.find(w => w.id === shift.workerId);
        const workerName = worker ? worker.name : 'Unassigned';
        const shiftType = shift.type === 'opening' ? '(Open)' :
                         shift.type === 'closing' ? '(Close)' : '';

        const shiftText = `${shift.startTime} - ${shift.endTime} : ${workerName} ${shiftType}`;

        // Highlight unassigned shifts
        if (!worker) {
          doc.setTextColor(255, 0, 0); // Red
        }

        doc.text(shiftText, margin + 5, yPosition);

        // Reset color
        doc.setTextColor(0, 0, 0);

        yPosition += 6;
      });
    }

    yPosition += 4; // Extra space between days
  });

  // Add summary section
  if (yPosition > 220) {
    doc.addPage();
    yPosition = 20;
  } else {
    yPosition += 10;
  }

  // Worker summary
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Worker Hours Summary', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Calculate hours per worker
  const workerHours = new Map<string, number>();
  schedule.shifts.forEach(shift => {
    if (shift.workerId) {
      const hours = calculateDuration(shift.startTime, shift.endTime);
      workerHours.set(
        shift.workerId,
        (workerHours.get(shift.workerId) || 0) + hours
      );
    }
  });

  // Sort workers by name
  const sortedWorkers = workers
    .filter(w => workerHours.has(w.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  sortedWorkers.forEach(worker => {
    const hours = workerHours.get(worker.id) || 0;
    const targetHours = (worker.workPercentage / 100) * 42;
    const percentage = Math.round((hours / 42) * 100);

    let status = '';
    if (percentage > worker.workPercentage + 5) {
      status = ' (Over target)';
      doc.setTextColor(255, 0, 0); // Red
    } else if (percentage < worker.workPercentage - 5) {
      status = ' (Under target)';
      doc.setTextColor(255, 165, 0); // Orange
    } else {
      doc.setTextColor(0, 128, 0); // Green
    }

    doc.text(
      `${worker.name}: ${hours.toFixed(1)}h (${percentage}% / Target: ${worker.workPercentage}%)${status}`,
      margin + 5,
      yPosition
    );

    doc.setTextColor(0, 0, 0); // Reset color
    yPosition += 6;
  });

  // Add contact information
  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  } else {
    yPosition += 10;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Contact Information', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  sortedWorkers.forEach(worker => {
    doc.text(`${worker.name}: ${worker.phone}`, margin + 5, yPosition);
    yPosition += 6;
  });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(
    `Generated on ${formatDate(new Date(), 'MMM d, yyyy HH:mm')}`,
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: 'center' }
  );

  // Return as blob
  return doc.output('blob');
}

export function downloadSchedulePDF(
  schedule: Schedule,
  workers: Worker[]
): void {
  const blob = generateSchedulePDF(schedule, workers);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const weekStart = formatDate(schedule.weekStartDate, 'yyyy-MM-dd');
  link.href = url;
  link.download = `oakberry-schedule-${weekStart}.pdf`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  setTimeout(() => URL.revokeObjectURL(url), 100);
}