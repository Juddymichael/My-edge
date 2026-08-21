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
    // 1. Fond principal
    // Light: #f8f6fe | Dark: #0B0F14 (Noir bleuté très profond)
    appBg: isLight 
      ? 'bg-[#f8f6fe] text-slate-900' 
      : 'bg-[#0B0F14] text-[#E8EDF2]',
    
    // 2. Cards / panneaux
    // Light: bg-white border-purple-200/90 | Dark: #121820 (Gris anthracite) border-[#252E38]
    cardBg: isLight 
      ? 'bg-white border-purple-200/90 shadow-lg shadow-purple-500/5' 
      : 'bg-[#121820] border-[#252E38] shadow-lg shadow-black/40',
    
    // 3. Cards secondaires
    // Light: bg-purple-50/60 | Dark: #171E27 (Gris sombre)
    cardSecondaryBg: isLight 
      ? 'bg-purple-50/60 border-purple-200/70' 
      : 'bg-[#171E27] border-[#252E38]',
    
    cardHover: isLight 
      ? 'hover:border-purple-300 hover:shadow-purple-500/10' 
      : 'hover:border-[#3A4654] hover:shadow-xl',
    
    innerBg: isLight 
      ? 'bg-purple-50/50 border-purple-200/60' 
      : 'bg-[#0E131A] border-[#252E38]',
    
    // 4. Typographie
    // Texte principal: Light text-purple-950 | Dark: #E8EDF2 (Blanc cassé)
    textPrimary: isLight ? 'text-purple-950 font-black' : 'text-[#E8EDF2] font-black',
    // Texte secondaire: Light text-slate-600 | Dark: #8B96A3 (Gris froid)
    textSecondary: isLight ? 'text-slate-600 font-medium' : 'text-[#8B96A3] font-medium',
    textMuted: isLight ? 'text-slate-500' : 'text-[#6B7684]',
    label: isLight ? 'text-purple-700 font-bold text-[11px] uppercase tracking-wider' : 'text-[#8B96A3] font-bold text-[11px] uppercase tracking-wider',
    sectionTitle: isLight ? 'text-purple-950 font-black text-base tracking-tight' : 'text-[#E8EDF2] font-black text-base tracking-tight',

    // 5. Orange uniquement pour les éléments importants (#f75605)
    accentColorHex: isLight ? variant.primaryHex : '#f75605',
    accentHoverHex: isLight ? '#5b21b6' : '#ff6f26',
    accentText: isLight ? 'text-purple-700' : 'text-[#f75605]',
    accentIcon: isLight ? 'text-violet-600' : 'text-[#f75605]',
    
    // Boutons principaux
    btnPrimary: isLight 
      ? 'bg-gradient-to-r from-violet-600 via-purple-700 to-indigo-800 hover:from-violet-700 hover:via-purple-800 hover:to-indigo-900 text-white font-bold shadow-md shadow-purple-500/25 active:scale-95 transition-all'
      : 'bg-[#f75605] hover:bg-[#ff6f26] text-white font-black shadow-md shadow-[#f75605]/25 active:scale-95 transition-all',

    // Dynamic CTA (Orange)
    btnCtaAmber: isLight
      ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-500 hover:via-orange-600 hover:to-amber-600 text-white font-black shadow-md shadow-orange-500/30 border border-amber-200/40 active:scale-95 transition-all'
      : 'bg-gradient-to-r from-[#f75605] to-[#ff6f26] hover:from-[#ff6f26] hover:to-[#f75605] text-white font-black shadow-md shadow-[#f75605]/30 border border-[#f75605]/30 active:scale-95 transition-all',
    
    badgeAmber: isLight
      ? 'bg-amber-100/90 text-orange-800 border border-amber-300 font-bold shadow-xs'
      : 'bg-[#f75605]/15 text-[#f75605] border border-[#f75605]/30 font-bold',

    // Sélection active (Sidebar / Tabs)
    activeNavItem: isLight
      ? 'bg-purple-100 text-purple-900 font-bold border border-purple-300 shadow-xs'
      : 'bg-[#f75605]/15 text-[#f75605] font-black border border-[#f75605]/30 shadow-xs',
    
    // Active Tab Pill
    activeTabPill: isLight
      ? 'bg-gradient-to-r from-violet-600 via-purple-700 to-indigo-800 text-white font-bold shadow-md shadow-purple-500/25'
      : 'bg-[#f75605] text-white font-black shadow-md shadow-[#f75605]/30',

    // Accent Badge
    badgeAccent: isLight 
      ? 'bg-purple-100/90 text-purple-800 border border-purple-200/90 font-bold' 
      : 'bg-[#f75605]/15 text-[#f75605] border border-[#f75605]/30 font-bold',

    // Neutral Badge
    badgeNeutral: isLight
      ? 'bg-slate-100 text-slate-700 border border-slate-200 font-semibold'
      : 'bg-[#171E27] text-[#8B96A3] border border-[#252E38] font-semibold',

    // 6. Vert profit: #3FB88A (Vert sobre)
    winText: isLight ? 'text-emerald-600 font-bold' : 'text-[#3FB88A] font-bold',
    winBadge: isLight 
      ? 'bg-emerald-100/90 text-emerald-700 border border-emerald-200/80 font-bold' 
      : 'bg-[#3FB88A]/15 text-[#3FB88A] border border-[#3FB88A]/30 font-bold',
    winIconBg: isLight ? 'bg-emerald-100/80 text-emerald-700' : 'bg-[#3FB88A]/20 text-[#3FB88A]',
    
    // 7. Rouge perte: #D96C6C (Rouge discret)
    lossText: isLight ? 'text-rose-600 font-bold' : 'text-[#D96C6C] font-bold',
    lossBadge: isLight 
      ? 'bg-rose-50 text-rose-700 border border-rose-200 font-bold' 
      : 'bg-[#D96C6C]/15 text-[#D96C6C] border border-[#D96C6C]/30 font-bold',
    lossIconBg: isLight ? 'bg-rose-100/80 text-rose-700' : 'bg-[#D96C6C]/20 text-[#D96C6C]',

    alertText: isLight ? 'text-[#f75605] font-bold' : 'text-[#f75605] font-bold',
    alertBadge: isLight 
      ? 'bg-orange-50 text-[#f75605] border border-orange-200 font-bold' 
      : 'bg-[#f75605]/15 text-[#f75605] border border-[#f75605]/30 font-bold',

    // 8. Form inputs
    inputBg: isLight
      ? 'bg-white border-purple-200 text-slate-900 focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20'
      : 'bg-[#0E131A] border-[#252E38] text-[#E8EDF2] focus:border-[#f75605] focus:ring-2 focus:ring-[#f75605]/20',

    // 9. Table styles
    tableHeaderBg: isLight ? 'bg-purple-50/70 border-purple-200/80 text-purple-950 font-bold' : 'bg-[#0E131A] border-[#252E38] text-[#8B96A3] font-bold',
    tableRowHover: isLight ? 'hover:bg-purple-50/50' : 'hover:bg-[#171E27]/80',
    tableBorder: isLight ? 'border-purple-200/80' : 'border-[#252E38]',
    divideBorder: isLight ? 'divide-purple-200/70' : 'divide-[#252E38]',

    // Modal overlay
    modalOverlay: isLight ? 'bg-purple-950/40 backdrop-blur-md' : 'bg-black/75 backdrop-blur-md',
  };
}

export function getThemeConfig(settings: UserAppSettings) {
  const isLight = settings.theme === 'light';
  const variantKey = settings.violetVariant || 'smoothie-berry';
  const variant = VIOLET_VARIANTS[variantKey] || VIOLET_VARIANTS['smoothie-berry'];

  return {
    id: isLight ? 'light-violet' : 'dark-anthracite-orange',
    name: isLight ? `Thème Clair (${variant.name})` : 'Thème Sombre (Anthracite & Orange #f75605)',
    primaryHex: isLight ? variant.primaryHex : '#f75605',
    accentHex: isLight ? variant.primaryHex : '#ff6f26',
    chartStrokeHex: isLight ? variant.primaryHex : '#f75605',
  };
}
