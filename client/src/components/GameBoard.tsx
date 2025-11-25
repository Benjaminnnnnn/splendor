import React, { useState } from "react";
import {
  Typography,
  Box,
  Button,
  Tooltip,
  Paper,
  CircularProgress,
} from "@mui/material";
import { ExitToApp, Psychology } from "@mui/icons-material";
import {
  GameBoard as GameBoardType,
  Card,
  GameState,
} from "../../../shared/types/game";
import { borderRadius, colors } from "../theme";
import GameCard from "./GameCard";
import NobleComponent from "./NobleComponent";
import TokenBank from "./TokenBank";
import GameActions from "./GameActions";
import CardActionDialog from "./CardActionDialog";

interface GameBoardProps {
  board: GameBoardType;
  onCardAction: (action: string, payload: any) => void;
  selectedTokens: any;
  onTokenSelectionChange: (tokens: any) => void;
  // New props for Action Dock
  gameState: GameState;
  isCurrentPlayerTurn: boolean;
  onEndGame: () => void;
  aiRecommendation?: string;
  isLoadingRecommendation?: boolean;
}

const GameBoard: React.FC<GameBoardProps> = ({
  board,
  onCardAction,
  selectedTokens,
  onTokenSelectionChange,
  gameState,
  isCurrentPlayerTurn,
  onEndGame,
  aiRecommendation,
  isLoadingRecommendation = false,
}) => {
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);

  // Parse AI recommendation JSON
  const parseRecommendation = (rec: string | undefined) => {
    if (!rec) return null;
    try {
      // Strip markdown code blocks if present
      let cleanedRec = rec.trim();
      if (cleanedRec.startsWith("```json")) {
        cleanedRec = cleanedRec
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "");
      } else if (cleanedRec.startsWith("```")) {
        cleanedRec = cleanedRec.replace(/```\n?/g, "");
      }
      return JSON.parse(cleanedRec.trim());
    } catch (e) {
      console.error("Failed to parse AI recommendation:", e);
      return { reasoning: rec }; // Fallback to plain text
    }
  };

  // Format action text for display
  const formatAction = (action: string | undefined) => {
    if (!action) return "Recommendation";
    const actionMap: { [key: string]: string } = {
      take_tokens: "Take Tokens",
      purchase_card: "Purchase Card",
      reserve_card: "Reserve Card",
      purchase_reserved_card: "Purchase Reserved Card",
      wait: "Wait",
    };
    return actionMap[action] || action.replace(/_/g, " ");
  };

  // Format token details nicely
  const formatTokens = (tokens: { [key: string]: number }) => {
    return Object.entries(tokens)
      .filter(([_, count]) => count > 0)
      .map(([gem, count]) => `${count} ${gem}`)
      .join(", ");
  };

  const recommendation = parseRecommendation(aiRecommendation);

  // Use DevCard dimensions (160x220)
  const cardSize = { width: 160, height: 220 };

  const handleCardSelect = (card: Card) => {
    setSelectedCard(card);
    setCardDialogOpen(true);
  };

  const handleCardDialogClose = () => {
    setCardDialogOpen(false);
    setSelectedCard(null);
  };

  const handlePurchaseCard = (cardId: string) => {
    onCardAction("purchase-card", { cardId });
  };

  const handleReserveCard = (cardId: string) => {
    onCardAction("reserve-card", { cardId });
  };

  const getTierColors = (tier: number) => {
    switch (tier) {
      case 3: // Blue for Tier III
        return {
          background: "linear-gradient(135deg, #1976d2 0%, #0d47a1 100%)",
          border: "#0d47a1",
          text: "#ffffff",
          pattern: "rgba(255, 255, 255, 0.1)",
        };
      case 2: // Gold/Yellow for Tier II
        return {
          background: "linear-gradient(135deg, #ffd700 0%, #ff8f00 100%)",
          border: "#e65100",
          text: "#4a2c2a",
          pattern: "rgba(0, 0, 0, 0.1)",
        };
      case 1: // Green for Tier I
        return {
          background: "linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)",
          border: "#1b5e20",
          text: "#ffffff",
          pattern: "rgba(255, 255, 255, 0.1)",
        };
      default:
        return {
          background: `linear-gradient(135deg, ${colors.background.parchment} 0%, ${colors.background.card} 100%)`,
          border: colors.divider,
          text: colors.text.secondary,
          pattern: colors.divider,
        };
    }
  };

  const DeckPlaceholder: React.FC<{ count: number; tier: number }> = ({
    count,
    tier,
  }) => {
    const tierColors = getTierColors(tier);

    return (
      <Box
        sx={{
          width: cardSize.width,
          height: cardSize.height,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: tierColors.background,
          border: `2px solid ${tierColors.border}`,
          borderRadius: `${borderRadius.xl}px`,
          position: "relative",
          boxShadow: `
            0 4px 8px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.3)
          `,
          "&::before": {
            content: '""',
            position: "absolute",
            top: "20%",
            left: "15%",
            right: "15%",
            bottom: "20%",
            background: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 8px,
              ${tierColors.pattern} 8px,
              ${tierColors.pattern} 10px
            )`,
            opacity: 0.3,
            borderRadius: `${borderRadius.md}px`,
          },
        }}
      >
        <Typography
          variant="h2"
          sx={{
            fontFamily: '"Cinzel", serif',
            fontWeight: "bold",
            mb: 1,
            color: tierColors.text,
            fontSize: "2rem",
            textShadow: "0 1px 2px rgba(0, 0, 0, 0.3)",
            zIndex: 2,
          }}
        >
          {count}
        </Typography>
        <Typography
          variant="body1"
          align="center"
          sx={{
            color: tierColors.text,
            fontWeight: 600,
            fontSize: "0.85rem",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            zIndex: 2,
            mb: 2,
          }}
        >
          Cards
          <br />
          Remaining
        </Typography>

        {/* Tier label at bottom */}
        <Typography
          variant="caption"
          sx={{
            position: "absolute",
            bottom: 12,
            left: "50%",
            transform: "translateX(-50%)",
            fontFamily: '"Cinzel", serif',
            fontWeight: 600,
            fontSize: "0.75rem",
            color: tierColors.text,
            textTransform: "uppercase",
            letterSpacing: 1,
            fontVariant: "small-caps",
            textShadow: "0 1px 2px rgba(0, 0, 0, 0.3)",
            zIndex: 2,
          }}
        >
          Tier {tier === 1 ? "I" : tier === 2 ? "II" : "III"}
        </Typography>

        {/* Decorative corner elements */}
        {[0, 1, 2, 3].map((corner) => (
          <Box
            key={corner}
            sx={{
              position: "absolute",
              width: 12,
              height: 12,
              ...(corner === 0 && { top: 8, left: 8 }),
              ...(corner === 1 && { top: 8, right: 8 }),
              ...(corner === 2 && { bottom: 8, left: 8 }),
              ...(corner === 3 && { bottom: 8, right: 8 }),
              "&::before": {
                content: '""',
                position: "absolute",
                width: "100%",
                height: "2px",
                bgcolor: tierColors.border,
                ...(corner < 2 ? { top: 0 } : { bottom: 0 }),
              },
              "&::after": {
                content: '""',
                position: "absolute",
                width: "2px",
                height: "100%",
                bgcolor: tierColors.border,
                ...(corner % 2 === 0 ? { left: 0 } : { right: 0 }),
              },
            }}
          />
        ))}
      </Box>
    );
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "row", gap: 1.5 }}>
      {/* Action Dock - Left Side */}
      <Box
        sx={{
          width: "240px",
          flexShrink: 0,
          position: "sticky",
          top: 0,
          alignSelf: "flex-start",
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        {/* Token Bank */}
        <TokenBank
          tokens={board.tokens}
          selectedTokens={selectedTokens}
          onTokenSelectionChange={onTokenSelectionChange}
        />

        {/* AI Advisor */}
        <Paper
          sx={{
            background:
              "linear-gradient(135deg, rgba(138, 43, 226, 0.15) 0%, rgba(75, 0, 130, 0.15) 100%)",
            border: "1px solid rgba(138, 43, 226, 0.3)",
            borderRadius: `${borderRadius.md}px`,
            p: 1.5,
            minHeight: "150px",
            maxHeight: "300px",
            overflow: "auto",
            "&::-webkit-scrollbar": {
              width: "6px",
            },
            "&::-webkit-scrollbar-thumb": {
              background: "rgba(138, 43, 226, 0.5)",
              borderRadius: "3px",
            },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
            <Psychology sx={{ fontSize: "1rem", color: "#9370DB" }} />
            <Typography
              variant="subtitle2"
              sx={{
                color: "#9370DB",
                fontWeight: 600,
                fontSize: "0.75rem",
              }}
            >
              AI Advisor
            </Typography>
          </Box>
          {isLoadingRecommendation ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={16} sx={{ color: "#9370DB" }} />
              <Typography
                variant="body2"
                sx={{
                  color: "rgba(255, 255, 255, 0.7)",
                  fontSize: "0.7rem",
                  fontStyle: "italic",
                }}
              >
                Analyzing game state...
              </Typography>
            </Box>
          ) : (
            <Box>
              {recommendation ? (
                <>
                  {/* Action Badge */}
                  <Box
                    sx={{
                      display: "inline-block",
                      bgcolor: "rgba(255, 215, 0, 0.15)",
                      border: "1px solid rgba(255, 215, 0, 0.4)",
                      borderRadius: "4px",
                      px: 1,
                      py: 0.5,
                      mb: 1,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#FFD700",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                      }}
                    >
                      {formatAction(recommendation.action)}
                    </Typography>
                  </Box>

                  {/* Reasoning */}
                  <Typography
                    variant="body2"
                    sx={{
                      color: "rgba(255, 255, 255, 0.95)",
                      fontSize: "0.72rem",
                      lineHeight: 1.5,
                      mb: 1,
                    }}
                  >
                    {recommendation.reasoning}
                  </Typography>

                  {/* Details Section */}
                  {recommendation.details &&
                    Object.keys(recommendation.details).length > 0 && (
                      <Box
                        sx={{
                          bgcolor: "rgba(255, 255, 255, 0.05)",
                          borderRadius: "4px",
                          p: 0.75,
                          mt: 0.75,
                        }}
                      >
                        {recommendation.details.tokens && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: "rgba(255, 255, 255, 0.85)",
                              fontSize: "0.65rem",
                              display: "block",
                            }}
                          >
                            Tokens:{" "}
                            {formatTokens(recommendation.details.tokens)}
                          </Typography>
                        )}
                        {recommendation.details.cardId && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: "rgba(255, 255, 255, 0.85)",
                              fontSize: "0.65rem",
                              display: "block",
                            }}
                          >
                            Card: {recommendation.details.cardId}
                          </Typography>
                        )}
                        {recommendation.details.payment && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: "rgba(255, 255, 255, 0.85)",
                              fontSize: "0.65rem",
                              display: "block",
                            }}
                          >
                            Payment:{" "}
                            {formatTokens(recommendation.details.payment)}
                          </Typography>
                        )}
                        {recommendation.confidence && (
                          <Typography
                            variant="caption"
                            sx={{
                              color:
                                recommendation.confidence === "high"
                                  ? "#90EE90"
                                  : recommendation.confidence === "medium"
                                  ? "#FFD700"
                                  : "#FFA07A",
                              fontSize: "0.6rem",
                              display: "block",
                              mt: 0.5,
                              fontWeight: 600,
                              textTransform: "uppercase",
                            }}
                          >
                            {recommendation.confidence} confidence
                          </Typography>
                        )}
                      </Box>
                    )}
                </>
              ) : (
                <Typography
                  variant="body2"
                  sx={{
                    color: "rgba(255, 255, 255, 0.7)",
                    fontSize: "0.7rem",
                    fontStyle: "italic",
                  }}
                >
                  Wait for your turn to get AI suggestions...
                </Typography>
              )}
            </Box>
          )}
        </Paper>

        {/* Game Actions */}
        <GameActions
          selectedTokens={selectedTokens}
          onAction={onCardAction}
          isCurrentPlayerTurn={isCurrentPlayerTurn}
        />

        {/* End Game Button */}
        {gameState !== GameState.FINISHED && (
          <Box>
            <Tooltip title="End this game for all players">
              <Button
                variant="outlined"
                startIcon={<ExitToApp />}
                onClick={onEndGame}
                fullWidth
                size="small"
                sx={{
                  borderColor: "rgba(255, 255, 255, 0.3)",
                  color: "white",
                  fontSize: "0.7rem",
                  "&:hover": {
                    borderColor: "#ff4444",
                    backgroundColor: "rgba(255, 68, 68, 0.1)",
                  },
                }}
              >
                End Game
              </Button>
            </Tooltip>
          </Box>
        )}
      </Box>

      {/* Main Game Content - Right Side */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {/* Nobles Section */}
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            justifyContent: "center",
            px: 0.5,
          }}
        >
          {board.nobles.map((noble) => (
            <NobleComponent key={noble.id} noble={noble} />
          ))}
        </Box>

        {/* Development Cards Section */}
        <Box>
          {[3, 2, 1].map((tier) => (
            <Box key={tier} sx={{ mb: 1.5 }}>
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  justifyContent: "center",
                  px: 0.5,
                }}
              >
                {board.availableCards[
                  `tier${tier}` as keyof typeof board.availableCards
                ].map((card) => (
                  <GameCard
                    key={card.id}
                    card={card}
                    onCardSelect={handleCardSelect}
                  />
                ))}
                <DeckPlaceholder
                  count={
                    board.cardDecks[
                      `tier${tier}` as keyof typeof board.cardDecks
                    ]
                  }
                  tier={tier}
                />
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Card Action Dialog */}
      <CardActionDialog
        open={cardDialogOpen}
        card={selectedCard}
        onClose={handleCardDialogClose}
        onPurchase={handlePurchaseCard}
        onReserve={handleReserveCard}
      />
    </Box>
  );
};

export default GameBoard;
