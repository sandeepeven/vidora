import { avatarPalette } from '../theme';

const pad = (n: number) => String(n).padStart(2, '0');

export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h ? `${h}:${pad(m)}:${pad(r)}` : `${m}:${pad(r)}`;
}

export function compactNumber(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return (n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, '') + 'K';
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
}

export function formatViews(n: number): string {
  return `${compactNumber(n)} ${n === 1 ? 'view' : 'views'}`;
}

const UNITS: [number, string][] = [
  [31_536_000, 'year'],
  [2_592_000, 'month'],
  [604_800, 'week'],
  [86_400, 'day'],
  [3_600, 'hour'],
  [60, 'minute'],
];

export function timeAgo(ms: number): string {
  const diff = Math.max(0, Date.now() - ms) / 1000;
  for (const [secs, name] of UNITS) {
    const v = Math.floor(diff / secs);
    if (v >= 1) return `${v} ${name}${v > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

export function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return avatarPalette[Math.abs(h) % avatarPalette.length];
}

export function handleFor(name: string): string {
  return '@' + name.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
