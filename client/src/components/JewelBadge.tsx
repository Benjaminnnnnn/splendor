import { GemType } from '../../../shared/types/game';

// JewelBadge.tsx – square jewel with facets; color driven by `gem`
const COLORS: Record<GemType, string> = {
  [GemType.DIAMOND]: "#e9eef5",
  [GemType.SAPPHIRE]: "#2563eb",
  [GemType.EMERALD]: "#059669",
  [GemType.RUBY]: "#dc2626",
  [GemType.ONYX]: "#111827",
  [GemType.GOLD]: "#d4a72c"
};

interface JewelBadgeProps {
  gem: GemType;
}

export default function JewelBadge({ gem }: JewelBadgeProps) {
  const c = COLORS[gem];
  const gradientId = `gradient-${gem}`; // Unique ID for each gem type

  return (
    <svg width="40" height="40" viewBox="0 0 40 40" role="img" aria-label={`${gem} bonus`}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".5"/>
          <stop offset=".4" stopColor={c}/>
          <stop offset="1" stopColor="#000" stopOpacity=".2"/>
        </linearGradient>
        <filter id={`shadow-${gem}`} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.3"/>
        </filter>
      </defs>
      <rect x="2" y="2" width="36" height="36" rx="8"
            fill={`url(#${gradientId})`}
            stroke="#ffffff"
            strokeWidth="2"
            filter={`url(#shadow-${gem})`}/>
      {/* Enhanced facets */}
      <polygon points="20,5 35,20 20,35 5,20" fill="#fff" opacity=".2"/>
      <polygon points="20,5 35,20 20,20" fill="#000" opacity=".15"/>
      <polygon points="5,20 20,5 20,20" fill="#fff" opacity=".1"/>
      <circle cx="14" cy="12" r="6" fill="#fff" opacity=".4"/> {/* specular highlight */}
    </svg>
  );
}
