/**
 * Utility functions for Hadkar Meals date formatting
 * Standard format: DD/MM/YYYY (e.g. 04/09/2026)
 */

export function formatDateDDMMYYYY(dateInput?: string | Date | number | null): string {
  if (!dateInput) return '—';
  try {
    if (typeof dateInput === 'string') {
      const trimmed = dateInput.trim();
      // Handle simple YYYY-MM
      if (/^\d{4}-\d{2}$/.test(trimmed)) {
        const [yyyy, mm] = trimmed.split('-');
        return `${mm}/${yyyy}`;
      }
      // Handle YYYY-MM-DD or YYYY-MM-DDTHH:mm...
      if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
        const [yyyy, mm, dd] = trimmed.split('T')[0].split('-');
        return `${dd}/${mm}/${yyyy}`;
      }
    }

    const d = typeof dateInput === 'string' || typeof dateInput === 'number'
      ? new Date(dateInput)
      : dateInput;

    if (isNaN(d.getTime())) {
      return String(dateInput);
    }

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
  } catch {
    return String(dateInput);
  }
}

export function formatDateTimeDDMMYYYY(dateInput?: string | Date | number | null): string {
  if (!dateInput) return '—';
  try {
    const d = typeof dateInput === 'string' || typeof dateInput === 'number'
      ? new Date(dateInput)
      : dateInput;

    if (isNaN(d.getTime())) {
      return formatDateDDMMYYYY(dateInput);
    }

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${mins}`;
  } catch {
    return formatDateDDMMYYYY(dateInput);
  }
}

export function formatMonthYearDDMMYYYY(monthYearInput?: string | null): string {
  if (!monthYearInput) return '—';
  // If input is YYYY-MM like 2026-09 -> returns 09/2026
  if (/^\d{4}-\d{2}$/.test(monthYearInput.trim())) {
    const [yyyy, mm] = monthYearInput.trim().split('-');
    return `${mm}/${yyyy}`;
  }
  return formatDateDDMMYYYY(monthYearInput);
}

