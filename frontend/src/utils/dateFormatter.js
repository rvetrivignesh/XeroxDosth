/**
 * Date formatting utility to standardize DD/MM/YYYY formatting across the application.
 */

export const formatDateDDMMYYYY = (dateVal, includeTime = false) => {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const dateStr = `${day}/${month}/${year}`;

    if (!includeTime) return dateStr;

    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${dateStr}, ${timeStr}`;
};

export const formatDateTime = (dateVal) => formatDateDDMMYYYY(dateVal, true);

export default {
    formatDateDDMMYYYY,
    formatDateTime
};
