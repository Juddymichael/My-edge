import { UserAppSettings, VioletThemeVariant } from '../types';

export interface ThemeConfig {
  id: string;
  name: string;
  primaryHex: string;
  accentHex: string;
  chartStrokeHex: string;
}

export const VIOLET_VARIANTS: Record<VioletThemeVariant, { name: string; subtitle: string; gradientClass: string; primaryHex: string; lightBg: string; borderClass: string; textClass: string }> = {
  'smoothie-berry': {
    name: 'Violet Trading Pro',
    subtitle: 'Gradient violet profond & indigo',
    gradientClass: 'from-violet-600 via-purple-700 to-indigo-800',
    primaryHex: '#6d28d9',
    lightBg: 'bg-purple-50/80',
    borderClass: 'border-purple-200/90',
    textClass: 'text-purple-700',
  },
  'smoothie-lavender': {
    name: 'Lavande Douce',
    subtitle: 'Brume lavande lumineuse',
    gradientClass: 'from-indigo-500 via-purple-500 to-violet-500',
    primaryHex: '#8B5CF6',
    lightBg: 'bg-indigo-50/80',
    borderClass: 'border-indigo-200',
    textClass: 'text-indigo-600',
  },
  'smoothie-electric': {
    name: 'Violet Électrique',
    subtitle: 'Violet vibrant studio',
    gradientClass: 'from-violet-600 via-purple-600 to-fuchsia-600',
    primaryHex: '#7C3AED',
    lightBg: 'bg-violet-50/80',
    borderClass: 'border-violet-200',
    textClass: 'text-violet-600',
  },
  'smoothie-royal': {
    name: 'Pourpre Royal',
    subtitle: 'Pourpre profond & texturé',
    gradientClass: 'from-purple-700 via-violet-800 to-indigo-900',
    primaryHex: '#4c1d95',
    lightBg: 'bg-purple-50/90',
    borderClass: 'border-purple-300',
    textClass: 'text-purple-900',
  },
  'smoothie-tropical': {
    name: 'Violet Tropical',
    subtitle: 'Raisin électrique éclatant',
    gradientClass: 'from-fuchsia-500 via-purple-600 to-violet-700',
    primaryHex: '#9333EA',
    lightBg: 'bg-fuchsia-50/80',
    borderClass: 'border-fuchsia-200',
    textClass: 'text-fuchsia-600',
  },
};

export function getThemeClasses(settings: UserAppSettings) {
  const isLight = settings.theme === 'light';
  const variantKey = settings.violetVariant || 'smoothie-berry';
  const variant = VIOLET_VARIANTS[variantKey] || VIOLET_VARIANTS['smoothie-berry'];

  return {
    isLight,
    appBg: isLight
      ? 'bg-[#f8f7fc] text-slate-900'
      : 'bg-[#0B0F14] text-[#E8EDF2]',

    cardBg: isLight
      ? 'bg-white border-purple-200/80 shadow-lg shadow-purple-500/5'
      : 'bg-[#121820] border-[#252E38] shadow-lg shadow-black/40',

    cardSecondaryBg: isLight
      ? 'bg-purple-50/50 border-purple-200/70'
      : 'bg-[#171E27] border-[#252E38]',

    cardHover: isLight
      ? 'hover:border-purple-300 hover:shadow-purple-500/10'
      : 'hover:border-[#3A4654] hover:shadow-xl',

    innerBg: isLight
      ? 'bg-purple-50/40 border-purple-200/60'
      : 'bg-[#0E131A] border-[#252E38]',

    textPrimary: isLight ? 'text-purple-950 font-black' : 'text-[#E8EDF2] font-black',
    textSecondary: isLight ? 'text-slate-600 font-medium' : 'text-[#8B96A3] font-medium',
    textMuted: isLight ? 'text-slate-500' : 'text-[#6B7684]',
    label: isLight ? 'text-purple-700 font-bold text-[11px] uppercase tracking-wider' : 'text-[#8B96A3] font-bold text-[11px] uppercase tracking-wider',
    sectionTitle: isLight ? 'text-purple-950 font-black text-base tracking-tight' : 'text-[#E8EDF2] font-black text-base tracking-tight',

    // Accent is deliberately restrained: violet in light mode, softer orange in dark mode.
    accentColorHex: isLight ? variant.primaryHex : '#F97316',
    accentHoverHex: isLight ? '#5b21b6' : '#FB923C',
    accentText: isLight ? 'text-purple-700' : 'text-[#F97316]',
    accentIcon: isLight ? 'text-violet-600' : 'text-[#F97316]',

    btnPrimary: isLight
      ? 'bg-gradient-to-r from-violet-600 via-purple-700 to-indigo-800 hover:from-violet-700 hover:via-purple-800 hover:to-indigo-900 text-white font-bold shadow-md shadow-purple-500/20 active:scale-[0.985] transition-all'
      : 'bg-[#F97316] hover:bg-[#FB923C] text-white font-bold shadow-md shadow-[#F97316]/20 active:scale-[0.985] transition-all',

    btnCtaAmber: isLight
      ? 'bg-gradient-to-r from-violet-600 via-purple-700 to-indigo-800 hover:from-violet-700 hover:via-purple-800 hover:to-indigo-900 text-white font-bold shadow-md shadow-purple-500/20 border border-purple-200/40 active:scale-[0.985] transition-all'
      : 'bg-gradient-to-r from-[#F97316] to-[#FB923C] hover:from-[#FB923C] hover:to-[#F97316] text-white font-bold shadow-md shadow-[#F97316]/20 border border-[#F97316]/25 active:scale-[0.985] transition-all',

    badgeAmber: isLight
      ? 'bg-purple-50 text-purple-800 border border-purple-200 font-bold'
      : 'bg-[#F97316]/10 text-[#F97316] border border-[#F97316]/25 font-bold',

    activeNavItem: isLight
      ? 'bg-purple-100/80 text-purple-900 font-bold border border-purple-300 shadow-xs'
      : 'bg-[#F97316]/10 text-[#F97316] font-bold border border-[#F97316]/25 shadow-xs',

    activeTabPill: isLight
      ? 'bg-gradient-to-r from-violet-600 via-purple-700 to-indigo-800 text-white font-bold shadow-md shadow-purple-500/20'
      : 'bg-[#F97316] text-white font-bold shadow-md shadow-[#F97316]/20',

    badgeAccent: isLight
      ? 'bg-purple-50 text-purple-800 border border-purple-200 font-bold'
      : 'bg-[#F97316]/10 text-[#F97316] border border-[#F97316]/25 font-bold',

    badgeNeutral: isLight
      ? 'bg-slate-100 text-slate-700 border border-slate-200 font-semibold'
      : 'bg-[#171E27] text-[#8B96A3] border border-[#252E38] font-semibold',

    // Performance colors stay deliberately muted. Use them as small indicators, not backgrounds.
    winText: isLight ? 'text-emerald-600 font-bold' : 'text-[#72B99A] font-bold',
    winBadge: isLight
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70 font-bold'
      : 'bg-[#72B99A]/10 text-[#72B99A] border border-[#72B99A]/20 font-bold',
    winIconBg: isLight ? 'bg-emerald-50 text-emerald-700' : 'bg-[#72B99A]/10 text-[#72B99A]',

    // Losses are neutral-first: no aggressive red text. Orange is reserved for emphasis/alerts.
    lossText: isLight ? 'text-slate-700 font-semibold' : 'text-[#C7CDD4] font-semibold',
    lossBadge: isLight
      ? 'bg-slate-100 text-slate-700 border border-slate-200 font-semibold'
      : 'bg-[#171E27] text-[#C7CDD4] border border-[#3A4654] font-semibold',
    lossIconBg: isLight ? 'bg-slate-100 text-slate-600' : 'bg-[#171E27] text-[#C7CDD4]',

    alertText: isLight ? 'text-orange-700 font-bold' : 'text-[#F97316] font-bold',
    alertBadge: isLight
      ? 'bg-orange-50 text-orange-700 border border-orange-200 font-bold'
      : 'bg-[#F97316]/10 text-[#F97316] border border-[#F97316]/25 font-bold',

    inputBg: isLight
      ? 'bg-white border-purple-200 text-slate-900 focus:border-purple-600 focus:ring-2 focus:ring-purple-500/15'
      : 'bg-[#0E131A] border-[#252E38] text-[#E8EDF2] focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/15',

    tableHeaderBg: isLight ? 'bg-purple-50/60 border-purple-200/80 text-purple-950 font-bold' : 'bg-[#0E131A] border-[#252E38] text-[#8B96A3] font-bold',
    tableRowHover: isLight ? 'hover:bg-purple-50/40' : 'hover:bg-[#171E27]/80',
    tableBorder: isLight ? 'border-purple-200/80' : 'border-[#252E38]',
    divideBorder: isLight ? 'divide-purple-200/70' : 'divide-[#252E38]',

    modalOverlay: isLight ? 'bg-purple-950/35 backdrop-blur-md' : 'bg-black/75 backdrop-blur-md',
  };
}

export function getThemeConfig(settings: UserAppSettings) {
  const isLight = settings.theme === 'light';
  const variantKey = settings.violetVariant || 'smoothie-berry';
  const variant = VIOLET_VARIANTS[variantKey] || VIOLET_VARIANTS['smoothie-berry'];

  return {
    id: isLight ? 'light-violet' : 'dark-anthracite-orange',
    name: isLight ? `Thème Clair (${variant.name})` : 'Thème Sombre (Anthracite & Orange)',
    primaryHex: isLight ? variant.primaryHex : '#F97316',
    accentHex: isLight ? variant.primaryHex : '#FB923C',
    chartStrokeHex: isLight ? variant.primaryHex : '#F97316',
  };
}
