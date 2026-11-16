/**
 * Data Formatters for Academic & UI Presentation
 */

export const formatScore = (score?: number | null): string => {
  if (score === null || score === undefined || Number.isNaN(score)) {
    return '--';
  }
  return score.toFixed(1);
};

export const formatCgpa = (cgpa?: number | null): string => {
  if (cgpa === null || cgpa === undefined || Number.isNaN(cgpa)) {
    return '--';
  }
  return cgpa.toFixed(2);
};

export const formatPercentage = (rate?: number | null): string => {
  if (rate === null || rate === undefined || Number.isNaN(rate)) {
    return '0%';
  }
  return `${Math.round(rate)}%`;
};

export const formatCurrencyVND = (amount?: number | null): string => {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return '0 ₫';
  }
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

export const formatDayOfWeek = (day?: string | null): string => {
  if (!day) return '';
  const d = day.trim().toUpperCase();
  switch (d) {
    case 'MON':
    case 'MONDAY':
      return 'Thứ 2';
    case 'TUE':
    case 'TUESDAY':
      return 'Thứ 3';
    case 'WED':
    case 'WEDNESDAY':
      return 'Thứ 4';
    case 'THU':
    case 'THURSDAY':
      return 'Thứ 5';
    case 'FRI':
    case 'FRIDAY':
      return 'Thứ 6';
    case 'SAT':
    case 'SATURDAY':
      return 'Thứ 7';
    case 'SUN':
    case 'SUNDAY':
      return 'Chủ nhật';
    default:
      return day;
  }
};

export const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return '--';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
};

export const formatTime = (timeStr?: string | null): string => {
  if (!timeStr) return '--:--';
  // Cut seconds if present: e.g. "13:00:00" -> "13:00"
  if (timeStr.length >= 5) {
    return timeStr.substring(0, 5);
  }
  return timeStr;
};
