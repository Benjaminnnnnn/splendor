import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Button,
  Paper
} from '@mui/material';
import { Game, GameState } from '../../../shared/types/game';
import { gameService } from '../services/gameService';
import { aiService } from '../services/aiService';
import { socketService } from '../services/socketService';
import { userServiceClient } from '../services/userServiceClient';
import GameBoard from '../components/GameBoard';
import PlayerArea from '../components/PlayerArea';
import { BettingPanel } from '../components/BettingPanel';
import { GameBettingStats, Bet } from '../../../shared/types/betting';
import { ChatPanel } from '../components/ChatPanel';
import { colors, borderRadius } from '../theme';

const GamePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<string | null>(null);
  const [selectedTokens, setSelectedTokens] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [showGameOverDialog, setShowGameOverDialog] = useState(false);
  const [endGameDialogOpen, setEndGameDialogOpen] = useState(false);
  const [isEndingGame, setIsEndingGame] = useState(false);
  const [gameTerminatedDialog, setGameTerminatedDialog] = useState(false);
  const achievementsEvaluatedRef = useRef(false);
  const [aiRecommendation, setAiRecommendation] = useState<string>('');
  const [isLoadingRecommendation, setIsLoadingRecommendation] = useState(false);
  
  // Betting state
  const [userBalance, setUserBalance] = useState(1000);
  const [bettingStats, setBettingStats] = useState<GameBettingStats | undefined>();
  const [userBet, setUserBet] = useState<Bet | undefined>();

  useEffect(() => {
    if (!gameId) return;

    const initializeGame = async () => {
      try {
        const gameData = await gameService.getGame(gameId);
        setGame(gameData);

        // Get the current player ID from localStorage
        const storedPlayerId = localStorage.getItem('currentPlayerId');
        const playerId = storedPlayerId || gameData.players[0]?.id || 'demo-player';

        if (!storedPlayerId) {
          console.error('No player ID found in localStorage, using fallback');
        }

        setCurrentPlayer(playerId);

        // Initialize socket connection
        socketService.connect();
        socketService.joinGame(gameId, playerId);

        // Listen for game updates
        socketService.onGameStateUpdate((updatedGame: Game) => {
          setGame(updatedGame);

          // Check if game was terminated
          if (updatedGame.state === GameState.FINISHED && updatedGame.endReason === 'terminated') {
            if (updatedGame.endedBy !== currentPlayer) {
              // Show dialog for players who didn't end the game
              setGameTerminatedDialog(true);
            } else {
              // Navigate to home for the player who ended the game
              navigate('/');
            }
          }
        });

        // Fetch initial betting stats and balance
        const balanceResponse = await fetch(`http://localhost:3001/api/bets/user/${playerId}/balance`);
        if (balanceResponse.ok) {
          const balanceData = await balanceResponse.json();
          setUserBalance(balanceData.balance);
        }

        const statsResponse = await fetch(`http://localhost:3001/api/bets/game/${gameId}/stats`);
        if (statsResponse.ok) {
          const stats = await statsResponse.json();
          setBettingStats(stats);
        }

      } catch (error) {
        console.error('Error initializing game:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeGame();

    return () => {
      socketService.disconnect();
    };
  }, [gameId]);

  // Auto-refresh betting stats every 3 seconds for real-time odds updates in betting panel
  useEffect(() => {
    if (!gameId || !currentPlayer) return;

    // Fetch immediately on mount
    fetchBettingStats();

    // Then set up interval for continuous updates
    const bettingStatsInterval = setInterval(() => {
      fetchBettingStats();
    }, 3000);

    return () => {
      clearInterval(bettingStatsInterval);
    };
  }, [gameId, currentPlayer]);

  // Check for game completion
  useEffect(() => {
    if (game && game.state === GameState.FINISHED && !showGameOverDialog) {
      setShowGameOverDialog(true);
    }
  }, [game, showGameOverDialog]);

  // Evaluate achievements for any logged-in players once the game finishes.
  useEffect(() => {
    if (!game || game.state !== GameState.FINISHED || achievementsEvaluatedRef.current) return;

    const userIds = Array.from(
      new Set(
        game.players
          .map((p) => p.userId)
          .filter((id): id is string => Boolean(id))
      )
    );

    if (userIds.length === 0) return;
    achievementsEvaluatedRef.current = true;

    const evaluateAll = async () => {
      try {
        await Promise.allSettled(userIds.map((id) => userServiceClient.evaluateUserAchievements(id)));
      } catch (error) {
        console.error('Failed to evaluate achievements after game end', error);
      }
    };

    evaluateAll();
  }, [game]);
  // Fetch AI recommendation when it's the current player's turn
  useEffect(() => {
    const fetchRecommendation = async () => {
      if (!game || !currentPlayer || !gameId) return;
      
      // Only fetch if it's the player's turn and game is in progress
      const isPlayerTurn = game.players[game.currentPlayerIndex]?.id === currentPlayer;
      if (!isPlayerTurn || game.state !== GameState.IN_PROGRESS) {
        setAiRecommendation('');
        return;
      }

      try {
        setIsLoadingRecommendation(true);
        const recommendation = await aiService.getRecommendation(gameId, currentPlayer);
        setAiRecommendation(recommendation);
      } catch (error) {
        console.error('Error fetching AI recommendation:', error);
        setAiRecommendation('Unable to get AI recommendation at this time.');
      } finally {
        setIsLoadingRecommendation(false);
      }
    };

    fetchRecommendation();
  }, [game?.currentPlayerIndex, game?.state, currentPlayer, gameId]);

  const handleGameAction = async (action: string, payload: any) => {
    if (!game || !gameId || !currentPlayer) return;

    // Prevent actions if game is finished
    if (game.state === GameState.FINISHED) {
      return;
    }

    try {
      // Add playerId to all payloads
      const payloadWithPlayer = {
        ...payload,
        playerId: currentPlayer
      };
      socketService.sendGameAction(gameId, action, payloadWithPlayer);

      // Clear selected tokens after taking them
      if (action === 'take-tokens') {
        setSelectedTokens({});
      }
    } catch (error) {
      console.error('Error sending game action:', error);
    }
  };

  const handlePurchaseReservedCard = async (cardId: string) => {
    await handleGameAction('purchase-reserved-card', { cardId });
  };

  const handleCloseGameOverDialog = () => {
    setShowGameOverDialog(false);
    navigate('/'); // Navigate to home page
  };

  const handleEndGame = async () => {
    if (!gameId || !currentPlayer) return;

    setIsEndingGame(true);
    try {
      // Use socket system to ensure all players get notified
      socketService.sendGameAction(gameId, 'end-game', { playerId: currentPlayer });
      // Navigation will happen when socket update comes back
    } catch (error) {
      console.error('Error ending game:', error);
    } finally {
      setIsEndingGame(false);
      setEndGameDialogOpen(false);
    }
  };

  const openEndGameDialog = () => {
    setEndGameDialogOpen(true);
  };

  const closeEndGameDialog = () => {
    setEndGameDialogOpen(false);
  };

  const handleGameTerminatedClose = () => {
    setGameTerminatedDialog(false);
    navigate('/');
  };

  const fetchBettingStats = async () => {
    if (!gameId) return;

    try {
      console.log('[GamePage] Fetching betting stats for game:', gameId);
      const statsResponse = await fetch(`http://localhost:3001/api/bets/game/${gameId}/stats`);
      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        console.log('[GamePage] Betting stats updated:', stats);
        setBettingStats(stats);
      }
    } catch (error) {
      console.error('Error fetching betting stats:', error);
    }
  };

  const handlePlaceBet = async (playerId: string, amount: number): Promise<void> => {
    if (!gameId || !currentPlayer) {
      throw new Error('Game or player not found');
    }

    try {
      const response = await fetch('http://localhost:3001/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentPlayer,
          gameId,
          playerId,
          amount
        })
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to place bet');
        } else {
          const text = await response.text();
          throw new Error(`Server error: ${response.status} - ${text}`);
        }
      }

      const data = await response.json();
      setUserBalance(data.newBalance);
      setUserBet(data.bet);
      
      // Fetch updated betting stats to refresh odds
      await fetchBettingStats();
    } catch (error) {
      console.error('Error placing bet:', error);
      throw error;
    }
  };

  const isPlayerWinner = (playerId: string): boolean => {
    return game?.winner?.id === playerId;
  };

  const getGameOverMessage = (): string => {
    if (!game?.winner) return 'Game Over';
    if (isPlayerWinner(currentPlayer || '')) {
      return 'Congratulations! You Won!';
    } else {
      return `Game Over - ${game.winner.name} Wins!`;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <Typography variant="h6">Loading game...</Typography>
      </Box>
    );
  }

  if (!game) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <Typography variant="h6">Game not found</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        display: 'grid',
        gridTemplateColumns: '1fr 280px', // Game board and player sidebar
        gap: 2,
        p: 1.5,
        '@media (max-width: 1200px)': {
          gridTemplateColumns: '1fr',
          gap: 2,
        }
      }}
    >

            {/* Chat Panel */}
      <ChatPanel 
        gameId={gameId}
        currentPlayerId={currentPlayer || undefined}
        currentPlayerName={game.players.find(p => p.id === currentPlayer)?.name || undefined}
        onlineUsers={game.players.map(p => ({ id: p.id, username: p.name }))}
      />


      {/* Main Game Area */}
      <Box sx={{ minWidth: 0 }}>
        <GameBoard
          board={game.board}
          onCardAction={game.state === GameState.FINISHED ? () => {} : handleGameAction}
          selectedTokens={selectedTokens}
          onTokenSelectionChange={game.state === GameState.FINISHED ? () => {} : setSelectedTokens}
          gameState={game.state}
          isCurrentPlayerTurn={
            Boolean(currentPlayer && game.players[game.currentPlayerIndex]?.id === currentPlayer && game.state !== GameState.FINISHED)
          }
          onEndGame={openEndGameDialog}
          aiRecommendation={aiRecommendation}
          isLoadingRecommendation={isLoadingRecommendation}
        />
      </Box>

      {/* Sticky Player Sidebar */}
      <Box
        sx={{
          position: 'sticky',
          top: 12, // Reduced from 16
          height: 'fit-content',
          background: 'rgba(0, 0, 0, 0.6)', // Increased opacity for better contrast
          borderRadius: 2,
          border: '1px solid rgba(255, 255, 255, 0.2)', // Increased border opacity
          p: 1.5, // Reduced from 2
          backdropFilter: 'blur(8px)', // Added blur for better visual separation
          '@media (max-width: 1200px)': {
            position: 'static',
            order: -1,
          }
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: 'white',
            mb: 1.5, // Reduced from 2
            fontSize: '1rem', // Reduced from 1.1rem
            textAlign: 'center',
          }}
        >
          Players
        </Typography>

        {/* All Players */}
        {game.players.map((player, index) => (
          <Box key={player.id} sx={{ mb: 1.5 }}> {/* Reduced from 2 */}
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                color: player.id === currentPlayer ? 'gold' : 'white',
                mb: 0.75, // Reduced from 1
                fontSize: '0.9rem', // Reduced from 0.95rem
              }}
            >
              {player.id === currentPlayer ? 'You: ' : ''}{player.name}
              {game.currentPlayerIndex === index ? ' (Current Turn)' : ''}
            </Typography>

            <PlayerArea
              player={player}
              isCurrentPlayer={game.currentPlayerIndex === index}
              onPurchaseReservedCard={player.id === currentPlayer ? handlePurchaseReservedCard : undefined}
            />
          </Box>
        ))}

        {/* Betting Panel */}
        {game && currentPlayer && (
          <Box sx={{ mt: 2 }}>
            <BettingPanel
              gameId={gameId || ''}
              userId={currentPlayer}
              players={game.players.map(p => ({
                id: p.id,
                name: p.name,
                prestige: p.prestige,
                cards: p.cards.length,
                nobles: p.nobles.length
              }))}
              userBalance={userBalance}
              onPlaceBet={handlePlaceBet}
              bettingStats={bettingStats}
              userBet={userBet}
              gameState={
                game.state === GameState.WAITING_FOR_PLAYERS ? 'waiting' :
                game.state === GameState.IN_PROGRESS ? 'in_progress' :
                'finished'
              }
            />
          </Box>
        )}
      </Box>

      {/* Game Over Dialog */}
      {game && showGameOverDialog && (
        <Dialog
          open={showGameOverDialog}
          onClose={handleCloseGameOverDialog}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              background: `linear-gradient(135deg, ${colors.background.parchment} 0%, ${colors.background.card} 100%)`,
              border: `2px solid ${colors.divider}`,
              borderRadius: `${borderRadius.xl}px`,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }
          }}
        >
          <DialogTitle
            sx={{
              fontFamily: '"Cinzel", serif',
              fontWeight: 700,
              color: colors.text.primary,
              textAlign: 'center',
              fontSize: '2rem',
              pb: 2
            }}
          >
            {getGameOverMessage()}
          </DialogTitle>

          <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, pb: 4 }}>
            {/* Winner's Info */}
            {game.winner && (
              <Paper
                elevation={3}
                sx={{
                  p: 3,
                  background: isPlayerWinner(currentPlayer || '')
                    ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)'
                    : 'linear-gradient(135deg, #C0C0C0 0%, #808080 100%)',
                  borderRadius: `${borderRadius.lg}px`,
                  textAlign: 'center',
                  width: '100%'
                }}
              >
                <Typography
                  variant="h4"
                  sx={{
                    fontFamily: '"Cinzel", serif',
                    fontWeight: 700,
                    color: '#000',
                    mb: 1
                  }}
                >
                  {game.winner.name}
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    color: '#000',
                    fontWeight: 600
                  }}
                >
                  {game.winner.prestige} Prestige Points
                </Typography>
              </Paper>
            )}

            {/* Final Standings */}
            <Box sx={{ width: '100%' }}>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: '"Cinzel", serif',
                  fontWeight: 600,
                  color: colors.text.primary,
                  textAlign: 'center',
                  mb: 2
                }}
              >
                Final Standings
              </Typography>

              {game.players
                .sort((a, b) => b.prestige - a.prestige)
                .map((player, index) => (
                  <Box
                    key={player.id}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      p: 2,
                      mb: 1,
                      backgroundColor: player.id === currentPlayer
                        ? 'rgba(255, 215, 0, 0.1)'
                        : 'rgba(255, 255, 255, 0.05)',
                      borderRadius: `${borderRadius.md}px`,
                      border: `1px solid ${colors.divider}`
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          color: colors.text.primary,
                          minWidth: '24px'
                        }}
                      >
                        #{index + 1}
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: player.id === currentPlayer ? 700 : 500, // Make "You" bold for emphasis
                          color: player.id === currentPlayer ? '#2C1810' : colors.text.primary // Use dark brown instead of gold
                        }}
                      >
                        {player.id === currentPlayer ? 'You' : player.name}
                      </Typography>
                    </Box>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        color: colors.text.primary
                      }}
                    >
                      {player.prestige} pts
                    </Typography>
                  </Box>
                ))}
            </Box>

            <Button
              onClick={handleCloseGameOverDialog}
              variant="contained"
              sx={{
                fontFamily: '"Cinzel", serif',
                fontWeight: 600,
                backgroundColor: colors.primary.main,
                '&:hover': {
                  backgroundColor: colors.primary.dark
                },
                px: 4,
                py: 1.5
              }}
            >
              Leave Game
            </Button>
          </DialogContent>
        </Dialog>
      )}

      {/* End Game Confirmation Dialog */}
      <Dialog
        open={endGameDialogOpen}
        onClose={closeEndGameDialog}
        PaperProps={{
          sx: {
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'white'
          }
        }}
      >
        <DialogTitle sx={{ color: 'white' }}>
          End Game
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            Are you sure you want to end this game? This action cannot be undone and will disconnect all players.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={closeEndGameDialog}
            sx={{ color: 'rgba(255, 255, 255, 0.8)' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleEndGame}
            disabled={isEndingGame}
            sx={{
              color: '#ff4444',
              '&:hover': {
                backgroundColor: 'rgba(255, 68, 68, 0.1)'
              }
            }}
          >
            {isEndingGame ? 'Ending...' : 'End Game'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Game Terminated Dialog */}
      <Dialog
        open={gameTerminatedDialog}
        onClose={handleGameTerminatedClose}
        PaperProps={{
          sx: {
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'white'
          }
        }}
      >
        <DialogTitle sx={{ color: 'white' }}>
          Game Ended
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            This game has been ended by another player. You will be returned to the main page.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleGameTerminatedClose}
            sx={{
              color: '#FFD700',
              '&:hover': {
                backgroundColor: 'rgba(255, 215, 0, 0.1)'
              }
            }}
          >
            Return to Home
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GamePage;
