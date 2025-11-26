import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText
} from '@mui/material';
import { ContentCopy, Share, ExitToApp, PersonRemove } from '@mui/icons-material';
import { Game, GameState } from '../../../shared/types/game';
import { UserStats } from '../../../shared/types/user';
import { gameService } from '../services/gameService';
import { userServiceClient } from '../services/userServiceClient';
import { socketService } from '../services/socketService';
import { ChatPanel } from '../components/ChatPanel';

const LobbyPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  const [endGameDialogOpen, setEndGameDialogOpen] = useState(false);
  const [isEndingGame, setIsEndingGame] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [playerStats, setPlayerStats] = useState<Map<string, UserStats>>(new Map());
  const [playerRanks, setPlayerRanks] = useState<Map<string, number>>(new Map());

  // Get current player ID on mount
  useEffect(() => {
    const playerId = localStorage.getItem('currentPlayerId');
    setCurrentPlayerId(playerId);
  }, []);

  // Initialize socket connection for chat
  useEffect(() => {
    if (!currentPlayerId || !game) return;

    // Connect socket
    socketService.connect();

    // Register for chat
    const currentPlayerName = game.players.find(p => p.id === currentPlayerId)?.name;
    if (currentPlayerName) {
      socketService.registerForChat(currentPlayerId, currentPlayerName);
    }

    // Cleanup on unmount
    return () => {
      // Don't disconnect here as it might be used in other pages
      // socketService.disconnect();
    };
  }, [currentPlayerId, game]);
  // Check if current player is the host
  const isHost = game?.players[0]?.id === currentPlayerId;

  // Fetch user stats and leaderboard ranks for all players with userId
  useEffect(() => {
    if (!game) return;

    const fetchPlayerStatsAndRanks = async () => {
      const statsMap = new Map<string, UserStats>();
      const ranksMap = new Map<string, number>();
      
      for (const player of game.players) {
        if (player.userId) {
          try {
            const stats = await userServiceClient.getUserStats(player.userId);
            statsMap.set(player.userId, stats);
            
            const rank = await userServiceClient.getUserLeaderboardRank(player.userId);
            if (rank !== null) {
              ranksMap.set(player.userId, rank);
            }
          } catch (error) {
            console.error(`Error fetching stats for user ${player.userId}:`, error);
          }
        }
      }
      
      setPlayerStats(statsMap);
      setPlayerRanks(ranksMap);
    };

    fetchPlayerStatsAndRanks();
  }, [game?.players]);

  useEffect(() => {
    if (!gameId) return;

    const fetchGame = async () => {
      try {
        const gameData = await gameService.getGame(gameId);
        setGame(gameData);
        
        // Check if the current player is still in the game
        if (currentPlayerId) {
          const isPlayerInGame = gameData.players.some(p => p.id === currentPlayerId);
          if (!isPlayerInGame) {
            // Player has been kicked or removed, redirect to home
            console.log('Player no longer in game, redirecting to home');
            navigate('/');
            return;
          }
        }

        // If game has started, redirect all players to the game page
        if (gameData.state === 'in_progress') {
          console.log('Game has started, redirecting to game page');
          navigate(`/game/${gameId}`);
          return;
        }
      } catch (error) {
        console.error('Error fetching game:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchGame();

    // Poll for game updates every 2 seconds
    const interval = setInterval(fetchGame, 2000);

    return () => clearInterval(interval);
  }, [gameId, navigate, currentPlayerId]);

  const copyInviteLink = async () => {
    if (!gameId) return;
    
    const inviteLink = `${window.location.origin}/invite/${gameId}`;
    
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopySuccess(true);
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = inviteLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
    }
  };

  const handleCopySnackbarClose = () => {
    setCopySuccess(false);
  };

  const handleEndGame = async () => {
    if (!gameId) {
      return;
    }
    
    // Get current player ID from localStorage
    let currentPlayerId = localStorage.getItem('currentPlayerId');
    
    // If no currentPlayerId in localStorage, use the first player as fallback
    if (!currentPlayerId && game?.players && game.players.length > 0) {
      currentPlayerId = game.players[0].id;
    }
    
    if (!currentPlayerId) {
      console.error('No current player ID found');
      return;
    }
    
    setIsEndingGame(true);
    try {
      await gameService.endGame(gameId, currentPlayerId);
      navigate('/');
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

  const handleLeaveGame = async () => {
    if (!gameId || !currentPlayerId) {
      return;
    }
    
    try {
      await gameService.leaveGame(gameId, currentPlayerId);
      navigate('/');
    } catch (error) {
      console.error('Error leaving game:', error);
    }
  };

  const handleKickPlayer = async (playerIdToKick: string) => {
    if (!gameId || !currentPlayerId) {
      return;
    }
    
    try {
      await gameService.kickPlayer(gameId, currentPlayerId, playerIdToKick);
      // The game state will be updated automatically by the polling mechanism
    } catch (error) {
      console.error('Error kicking player:', error);
    }
  };

  // Calculate rank based on games won
  const getRank = (gamesWon: number): string => {
    if (gamesWon >= 100) return 'Legend';
    if (gamesWon >= 50) return 'Master';
    if (gamesWon >= 25) return 'Expert';
    if (gamesWon >= 10) return 'Advanced';
    if (gamesWon >= 5) return 'Intermediate';
    if (gamesWon >= 1) return 'Novice';
    return 'Beginner';
  };

  const getRankColor = (gamesWon: number): string => {
    if (gamesWon >= 100) return '#FF69B4'; // Legend - Hot Pink
    if (gamesWon >= 50) return '#FFD700';  // Master - Gold
    if (gamesWon >= 25) return '#9370DB';  // Expert - Purple
    if (gamesWon >= 10) return '#4169E1';  // Advanced - Royal Blue
    if (gamesWon >= 5) return '#32CD32';   // Intermediate - Lime Green
    if (gamesWon >= 1) return '#87CEEB';   // Novice - Sky Blue
    return '#FFFFFF';                       // Beginner - White
  };

  const handleStartGame = async () => {
    if (!gameId || !isHost) {
      return;
    }

    setIsStartingGame(true);
    try {
      await gameService.startGame(gameId);
      // Navigate to the game page after successfully starting
      navigate(`/game/${gameId}`);
    } catch (error) {
      console.error('Error starting game:', error);
      setIsStartingGame(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <Typography variant="h6">Loading...</Typography>
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
        background: 'transparent', // Use the body background
        py: 4,
        px: 2
      }}
    >
      {/* Chat Panel */}
      <ChatPanel 
        gameId={undefined} // No gameId in lobby - will disable group chat
        currentPlayerId={currentPlayerId || undefined}
        currentPlayerName={game.players.find(p => p.id === currentPlayerId)?.name || undefined}
        onlineUsers={game.players.map(p => ({ id: p.id, username: p.name }))}
      />

      <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4 }}>
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4,
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 2
          }}
        >
          <Typography 
            variant="h4" 
            gutterBottom
            sx={{
              color: 'white',
              fontFamily: '"Cinzel", serif',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)'
            }}
          >
            Game Lobby
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Typography 
                variant="h6" 
                sx={{ color: 'white' }}
              >
                Game ID:
              </Typography>
              <Chip 
                label={game.id} 
                variant="outlined" 
                sx={{
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  color: 'white',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }}
              />
              <Tooltip title="Copy invite link">
                <IconButton 
                  onClick={copyInviteLink}
                  sx={{ 
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    }
                  }}
                >
                  <ContentCopy />
                </IconButton>
              </Tooltip>
            </Box>
            
            <Button
              variant="outlined"
              startIcon={<Share />}
              onClick={copyInviteLink}
              sx={{
                borderColor: 'rgba(255, 255, 255, 0.3)',
                color: 'white',
                mb: 2,
                '&:hover': {
                  borderColor: '#FFD700',
                  backgroundColor: 'rgba(255, 215, 0, 0.1)',
                }
              }}
            >
              Copy Invite Link
            </Button>
            
            <Typography 
              variant="body1" 
              sx={{ color: 'rgba(255, 255, 255, 0.8)' }}
            >
              Share this link with other players to let them join instantly
            </Typography>
          </Box>

          <Typography 
            variant="h6" 
            gutterBottom
            sx={{ color: 'white' }}
          >
            Players ({game.players.length}/4)
          </Typography>

          <Paper 
            variant="outlined" 
            sx={{ 
              mb: 3,
              background: 'rgba(0, 0, 0, 0.2)',
              borderColor: 'rgba(255, 255, 255, 0.1)'
            }}
          >
            <List>
              {game.players.map((player, index) => {
                const stats = player.userId ? playerStats.get(player.userId) : null;
                const leaderboardRank = player.userId ? playerRanks.get(player.userId) : null;
                const isGuest = !player.userId;
                const rank = stats ? getRank(stats.games_won) : null;
                const rankColor = stats ? getRankColor(stats.games_won) : '#FFFFFF';
                
                return (
                  <ListItem 
                    key={player.id}
                    secondaryAction={
                      isHost && index !== 0 && game.state === GameState.WAITING_FOR_PLAYERS ? (
                        <Tooltip title="Kick player">
                          <IconButton
                            edge="end"
                            onClick={() => handleKickPlayer(player.id)}
                            sx={{
                              color: 'rgba(255, 100, 100, 0.8)',
                              '&:hover': {
                                color: '#ff4444',
                                backgroundColor: 'rgba(255, 68, 68, 0.1)',
                              }
                            }}
                          >
                            <PersonRemove />
                          </IconButton>
                        </Tooltip>
                      ) : null
                    }
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography sx={{ color: 'white' }}>
                            {player.name}
                          </Typography>
                          {isGuest ? (
                            <Chip 
                              label="Guest" 
                              size="small" 
                              sx={{ 
                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                color: 'rgba(255, 255, 255, 0.8)',
                                fontSize: '0.7rem',
                                height: '20px'
                              }}
                            />
                          ) : (
                            <>
                              {rank && (
                                <Chip 
                                  label={rank} 
                                  size="small" 
                                  sx={{ 
                                    backgroundColor: rankColor,
                                    color: '#000',
                                    fontWeight: 'bold',
                                    fontSize: '0.7rem',
                                    height: '20px'
                                  }}
                                />
                              )}
                              {leaderboardRank && (
                                <Chip 
                                  label={`Ranked #${leaderboardRank}`} 
                                  size="small" 
                                  sx={{ 
                                    backgroundColor: 'rgba(135, 206, 250, 0.3)',
                                    color: '#87CEEB',
                                    fontSize: '0.7rem',
                                    height: '20px',
                                    fontWeight: 'bold'
                                  }}
                                />
                              )}
                              {stats && (
                                <Chip 
                                  label={`${stats.total_prestige_points} Prestige`} 
                                  size="small" 
                                  sx={{ 
                                    backgroundColor: 'rgba(255, 215, 0, 0.3)',
                                    color: '#FFD700',
                                    fontSize: '0.7rem',
                                    height: '20px'
                                  }}
                                />
                              )}
                            </>
                          )}
                        </Box>
                      }
                      secondary={index === 0 ? 'Host' : 'Player'}
                      sx={{
                        '& .MuiListItemText-secondary': {
                          color: 'rgba(255, 255, 255, 0.6)'
                        }
                      }}
                    />
                  </ListItem>
                );
              })}
            </List>
          </Paper>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography 
              variant="body1" 
              sx={{ color: 'rgba(255, 255, 255, 0.8)' }}
            >
              {game.players.length < 2
                ? 'Waiting for at least 2 players to start...'
                : isHost
                  ? 'Ready to start! Click "Start Game" when ready.'
                  : 'Waiting for host to start the game...'
              }
            </Typography>

            <Box sx={{ display: 'flex', gap: 2 }}>
              {isHost ? (
                <Button
                  variant="outlined"
                  startIcon={<ExitToApp />}
                  onClick={openEndGameDialog}
                  sx={{
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    color: 'white',
                    '&:hover': {
                      borderColor: '#ff4444',
                      backgroundColor: 'rgba(255, 68, 68, 0.1)',
                    }
                  }}
                >
                  End Game
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  startIcon={<ExitToApp />}
                  onClick={handleLeaveGame}
                  sx={{
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    color: 'white',
                    '&:hover': {
                      borderColor: '#ff4444',
                      backgroundColor: 'rgba(255, 68, 68, 0.1)',
                    }
                  }}
                >
                  Leave Game
                </Button>
              )}

              {isHost && game.players.length >= 2 && game.state === GameState.WAITING_FOR_PLAYERS && (
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleStartGame}
                  disabled={isStartingGame}
                  sx={{
                    background: 'linear-gradient(135deg, #DAA520 0%, #FFD700 100%)',
                    color: '#000',
                    fontWeight: 600,
                    '&:hover': {
                      background: 'linear-gradient(135deg, #B8860B 0%, #DAA520 100%)',
                    },
                    '&:disabled': {
                      background: 'rgba(218, 165, 32, 0.5)',
                      color: 'rgba(0, 0, 0, 0.5)',
                    }
                  }}
                >
                  {isStartingGame ? 'Starting...' : 'Start Game'}
                </Button>
              )}
            </Box>
          </Box>
        </Paper>
      </Box>
      
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
      
      {/* Copy success snackbar */}
      <Snackbar
        open={copySuccess}
        autoHideDuration={3000}
        onClose={handleCopySnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCopySnackbarClose} 
          severity="success" 
          sx={{ width: '100%' }}
        >
          Invite link copied to clipboard!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LobbyPage;
