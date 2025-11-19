// CostPip.tsx – beveled white circle with colored ring and centered number
import { Box } from "@mui/material";
import { GemType } from '../../../shared/types/game';

const RING: Record<GemType, string> = {
  [GemType.DIAMOND]: "#cfd8e3",
  [GemType.SAPPHIRE]: "#2563eb",
  [GemType.EMERALD]: "#059669",
  [GemType.RUBY]: "#dc2626",
  [GemType.ONYX]: "#111827",
  [GemType.GOLD]: "#d4a72c"
};

export default function CostPip({gem, n}:{gem:GemType; n:number}) {
  const ringColor = RING[gem];

  return (
    <Box sx={{
      width:36, height:36, borderRadius:"50%", position:"relative",
      background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8), ${ringColor} 60%, #000 100%)`,
      border: "2px solid rgba(255,255,255,0.9)",
      boxShadow: "0 3px 8px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      {/* Inner gem highlight */}
      <Box sx={{
        position:"absolute",
        top: "15%",
        left: "20%",
        width: "25%",
        height: "25%",
        borderRadius: "50%",
        background: "rgba(255,255,255,0.7)",
        filter: "blur(1px)"
      }}/>

      {/* Number */}
      <Box sx={{
        fontWeight: 900,
        fontSize: 16,
        color: gem === GemType.ONYX ? "#fff" : "#000",
        textShadow: gem === GemType.ONYX ? "0 1px 2px rgba(0,0,0,0.8)" : "0 1px 0 rgba(255,255,255,.8)",
        zIndex: 1
      }}>
        {n}
      </Box>
    </Box>
  );
}
