import { alpha, darken, lighten } from '@mui/material/styles';

function fallback(color) {
  return color || '#7c4dff';
}

export function buildNoteSurface(note, mode = 'light') {
  const accent = fallback(note?.accentColor);
  const dark = mode === 'dark';

  switch (note?.style) {
    case 'solid':
      return {
        background: `linear-gradient(180deg, ${lighten(accent, dark ? 0.08 : 0.18)} 0%, ${darken(accent, dark ? 0.28 : 0.08)} 100%)`,
        widgetBackground: accent,
        color: '#ffffff',
        border: '1px solid rgba(255,255,255,0.18)',
        shadow: dark ? '0 18px 42px rgba(0,0,0,0.34)' : '0 18px 40px rgba(15,23,42,0.16)',
        subtle: alpha('#ffffff', 0.72),
        headerBackground: 'linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.08) 100%)',
        headerBorder: alpha('#ffffff', 0.12)
      };
    case 'paper':
      return {
        background: dark
          ? 'linear-gradient(180deg, rgba(71,64,53,0.96), rgba(56,48,38,0.98))'
          : 'linear-gradient(180deg, rgba(236,229,214,0.98), rgba(225,214,196,0.98))',
        widgetBackground: dark ? '#4a4033' : '#e6dcc8',
        color: dark ? '#f1ebde' : '#40372b',
        border: `1px solid ${alpha(accent, dark ? 0.12 : 0.14)}`,
        shadow: dark ? '0 14px 24px rgba(0,0,0,0.30)' : '0 12px 20px rgba(85,68,44,0.10)',
        subtle: dark ? alpha('#e8dcc8', 0.70) : alpha('#6f5c45', 0.62),
        headerBackground: dark
          ? `linear-gradient(180deg, ${alpha('#f6e7ce', 0.10)} 0%, rgba(56,48,38,0) 100%)`
          : `linear-gradient(180deg, ${alpha('#ffffff', 0.28)} 0%, rgba(255,255,255,0) 100%)`,
        headerBorder: dark ? alpha('#eadfcf', 0.08) : alpha('#8a7454', 0.14)
      };
    case 'minimal':
      return {
        background: dark ? 'rgba(15,23,42,0.94)' : 'rgba(255,255,255,0.98)',
        widgetBackground: '#0f172a',
        color: dark ? '#f8fafc' : '#0f172a',
        border: `1px solid ${alpha(dark ? '#cbd5e1' : '#94a3b8', dark ? 0.14 : 0.22)}`,
        shadow: dark ? '0 14px 34px rgba(0,0,0,0.26)' : '0 14px 30px rgba(15,23,42,0.08)',
        subtle: dark ? alpha('#cbd5e1', 0.72) : alpha('#475569', 0.78),
        headerBackground: dark
          ? `linear-gradient(180deg, ${alpha(accent, 0.14)} 0%, rgba(15,23,42,0) 100%)`
          : `linear-gradient(180deg, ${alpha(accent, 0.08)} 0%, rgba(255,255,255,0) 100%)`,
        headerBorder: dark ? alpha('#e2e8f0', 0.08) : alpha('#94a3b8', 0.14)
      };
    case 'glass':
    default:
      return {
        background: dark
          ? 'linear-gradient(180deg, rgba(15,23,42,0.72), rgba(15,23,42,0.48))'
          : 'linear-gradient(180deg, rgba(255,255,255,0.70), rgba(255,255,255,0.48))',
        widgetBackground: '#355765',
        color: dark ? '#f8fafc' : '#0f172a',
        border: `1px solid ${alpha(dark ? '#e2e8f0' : '#ffffff', dark ? 0.16 : 0.42)}`,
        shadow: dark ? '0 18px 40px rgba(0,0,0,0.34)' : '0 18px 36px rgba(15,23,42,0.12)',
        subtle: dark ? alpha('#cbd5e1', 0.76) : alpha('#475569', 0.76),
        headerBackground: dark
          ? `linear-gradient(180deg, ${alpha(accent, 0.14)} 0%, rgba(15,23,42,0) 100%)`
          : `linear-gradient(180deg, ${alpha(accent, 0.10)} 0%, rgba(255,255,255,0) 100%)`,
        headerBorder: dark ? alpha('#e2e8f0', 0.08) : alpha('#ffffff', 0.28),
        backdropFilter: 'none'
      };
  }
}

export const NOTE_VARIANTS = [
  { value: 'glass', label: '玻璃标签' },
  { value: 'solid', label: '彩色标签' },
  { value: 'paper', label: '纸张标签' },
  { value: 'minimal', label: '极简标签' }
];

export const ACCENT_PRESETS = ['#7c4dff', '#4caf50', '#ff7043', '#26c6da', '#f06292', '#ffd54f', '#8b5cf6', '#0ea5e9'];

export const FONT_OPTIONS = [
  'Inter',
  'Roboto',
  'Segoe UI',
  'Arial',
  'Helvetica Neue',
  'Microsoft YaHei',
  'PingFang SC',
  'Noto Sans SC',
  'Source Han Sans SC',
  'HarmonyOS Sans SC',
  'SimHei',
  'SimSun',
  'KaiTi',
  'Georgia',
  'Times New Roman',
  'JetBrains Mono',
  'Fira Code',
  'Consolas'
];
export const FONT_SIZE_OPTIONS = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];
