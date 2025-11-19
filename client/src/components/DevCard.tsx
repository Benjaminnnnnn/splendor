// DevCard.tsx (shell; pass props for art, value, costs, bonusGem)
import { Box, Paper, Typography } from "@mui/material";
import JewelBadge from "./JewelBadge";
import CostPip from "./CostPip";
import { GemType } from "../../../shared/types/game";

export default function DevCard({
  value,                     // prestige number (1/2/3/5)
  artUrl,                    // card artwork
  costs,                     // [{gem:'ruby', n:2}, ...]
  bonusGem                   // 'ruby'|'emerald'|'sapphire'|'onyx'|'diamond'
}: {
  value:number;
  artUrl:string;
  costs:{gem:GemType; n:number}[];
  bonusGem:GemType;
}) {
  return (
    <Paper elevation={6} sx={{
      position:"relative",
      width: 160, height: 220, borderRadius: 2,
      overflow:"hidden",
      background: "#fff",
      border: "2px solid #cbd5e1",
      boxShadow: "0 8px 20px rgba(0,0,0,.15), 0 3px 8px rgba(0,0,0,.1)",
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      cursor: "pointer",
      "&:hover": {
        transform: "translateY(-4px) scale(1.02)",
        boxShadow: "0 15px 30px rgba(0,0,0,.2), 0 6px 12px rgba(0,0,0,.15)",
        borderColor: "#94a3b8"
      },
      "&:before": { // laminated inner border
        content:'""', position:"absolute", inset:3, borderRadius: 1,
        boxShadow:"inset 0 0 0 1px rgba(255,255,255,.8), inset 0 1px 0 rgba(255,255,255,.9)"
      }
    }}>
      {/* artwork area - full card */}
      <Box sx={{
        position:"absolute", left:0, top:0, right:0, bottom:0,
        backgroundImage:`url(${artUrl})`,
        backgroundSize:"cover",
        backgroundPosition:"center",
        filter:"saturate(1.1) contrast(1.1)"
      }} />

      {/* translucent frosted header overlay */}
      <Box sx={{
        position:"absolute", left:0, top:0, right:0, height:"25%",
        background: "rgba(248, 250, 252, 0.2)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid rgba(203, 213, 225, 0.3)"
      }}>
        {/* numeral - only show if value >= 1 */}
        {value >= 1 && (
          <Typography sx={{
            position:"absolute", top:8, left:8, zIndex:2,
            fontFamily:"Cinzel, serif", fontWeight:900, fontSize:28,
            color:"#ffffffff",
            textShadow:"0 1px 2px rgba(0, 0, 0, 0.8)"
          }}>{value}</Typography>
        )}

        {/* bonus jewel */}
        <Box sx={{
          position:"absolute", top:6, right:10, zIndex:2,
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,.2))"
        }}>
          <JewelBadge gem={bonusGem} />
        </Box>
      </Box>

      {/* cost column */}
      <Box sx={{
        position:"absolute",
        left:6,
        bottom:8,
        display:"flex",
        flexDirection: "column",
        gap: 0.4,
        alignItems: "flex-start",
        zIndex: 2
      }}>
        {costs.map(c => <CostPip key={c.gem} gem={c.gem} n={c.n} />)}
      </Box>
    </Paper>
  );
}
