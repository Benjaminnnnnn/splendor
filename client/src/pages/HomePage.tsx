import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Container,
  Grid,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Divider,
  Card,
  CardContent,
  CardActions,
  Chip,
} from '@mui/material';
import { Add as AddIcon, People as PeopleIcon, Lock as LockIcon, Public as PublicIcon } from '@mui/icons-material';
import { gameService } from '../services/gameService';
import { useAuth } from '../contexts/AuthContext';
import { Game } from '../../../shared/types/game';
import { ChatPanel } from '../components/ChatPanel';

const HomePage: React.FC = () => {
  const [playerName, setPlayerName] = useState('');
  const [lobbyName, setLobbyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [modalAction, setModalAction] = useState<'create' | 'invite'>('create');
  const [inviteCode, setInviteCode] = useState('');
  const [isPrivateGame, setIsPrivateGame] = useState(false);
  const [availableGames, setAvailableGames] = useState<Game[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  // Fetch available games
  useEffect(() => {
    fetchAvailableGames();
    // Refresh every 10 seconds
    const interval = setInterval(fetchAvailableGames, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchAvailableGames = async () => {
    try {
      setLoadingGames(true);
      const games = await gameService.listGames();
      console.log('All games fetched:', games);
      // Filter for games in lobby state (not started or completed)
      const waitingGames = games.filter(game => 
        game.state === 'waiting_for_players' &&
        game.players.length < 4 // Not full
      );
      console.log('Filtered waiting games:', waitingGames);
      setAvailableGames(waitingGames);
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setLoadingGames(false);
    }
  };

  const handleCreateGame = async () => {
    // For authenticated users, use their username; for guests, use the entered name
    const nameToUse = isAuthenticated && user ? user.username : playerName;

    if (!nameToUse.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!lobbyName.trim()) {
      setError('Please enter a lobby name');
      return;
    }

    setLoading(true);
    try {
      const userId = isAuthenticated && user ? user.id : undefined;
      console.log('[HomePage] Creating game with:', { nameToUse, userId, isAuthenticated, user });
      const result = await gameService.createGame(nameToUse, isPrivateGame, lobbyName, userId);
      console.log('[HomePage] Game created, result:', result);
      // Store the player ID for this session
      localStorage.setItem('currentPlayerId', result.playerId);
      setShowNameModal(false);
      setPlayerName('');
      setLobbyName('');
      setIsPrivateGame(false);
      navigate(`/lobby/${result.game.id}`);
    } catch (error: any) {
      console.error('Error creating game:', error);
      setError(error.response?.data?.message || 'Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinByInviteCode = async () => {
  const nameToUse = isAuthenticated && user ? user.username : playerName;

    if (!nameToUse.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!inviteCode.trim()) {
      setError('Please enter an invite code');
      return;
    }

    setLoading(true);
    try {
      const userId = isAuthenticated && user ? user.id : undefined;
      const result = await gameService.joinGameByInviteCode(inviteCode, nameToUse, userId);
      // Store the player ID for this session
      localStorage.setItem('currentPlayerId', result.playerId);
      setShowInviteModal(false);
      setPlayerName('');
      setInviteCode('');
      navigate(`/lobby/${result.game.id}`);
    } catch (error: any) {
      console.error('Error joining game by invite code:', error);
      setError(error.response?.data?.message || 'Failed to join game with invite code');
    } finally {
      setLoading(false);
    }
  };

  const openCreateGameModal = () => {
    // Guests: show name input modal
    console.log('[HomePage] Opening create game modal:', { isAuthenticated, user });
    setModalAction('create');
    setShowNameModal(true);
    setError(null);
  };

  const openInviteCodeModal = () => {
    // Guests: show name modal first, then invite modal
    setModalAction('invite');
    setShowNameModal(true);
    setError(null);
  };

  const handleJoinGame = async (gameId: string) => {
    // For authenticated users, use their username; for guests, prompt for name
    if (!isAuthenticated) {
      // Store the game ID temporarily and open name modal
      localStorage.setItem('pendingGameId', gameId);
      setModalAction('invite');
      setShowNameModal(true);
      setError(null);
      return;
    }

    // For authenticated users, join directly
    const nameToUse = user!.username;
    const userId = user!.id;
    setLoading(true);
    try {
      const result = await gameService.joinGame(gameId, nameToUse, userId);
      localStorage.setItem('currentPlayerId', result.playerId);
      navigate(`/lobby/${result.game.id}`);
      fetchAvailableGames(); // Refresh the list
    } catch (error: any) {
      console.error('Error joining game:', error);
      setError(error.response?.data?.message || 'Failed to join game');
    } finally {
      setLoading(false);
    }
  };

  const handleModalSubmit = () => {
    if (modalAction === 'create') {
      handleCreateGame();
    } else if (modalAction === 'invite') {
      // Check if there's a pending game ID (joining from lobby list)
      const pendingGameId = localStorage.getItem('pendingGameId');
      if (pendingGameId) {
        // Join the game with the entered name
        handleJoinGameAsGuest(pendingGameId);
      } else {
        // For guests with invite code, first collect name then show invite modal
        setShowNameModal(false);
        setShowInviteModal(true);
      }
    }
  };

  const handleJoinGameAsGuest = async (gameId: string) => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    try {
      const result = await gameService.joinGame(gameId, playerName);
      localStorage.setItem('currentPlayerId', result.playerId);
      localStorage.removeItem('pendingGameId');
      setShowNameModal(false);
      setPlayerName('');
      navigate(`/lobby/${result.game.id}`);
      fetchAvailableGames(); // Refresh the list
    } catch (error: any) {
      console.error('Error joining game:', error);
      setError(error.response?.data?.message || 'Failed to join game');
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setShowNameModal(false);
    setPlayerName('');
    setLobbyName('');
    localStorage.removeItem('pendingGameId');
    setError(null);
  };

  const handleInviteModalClose = () => {
    setShowInviteModal(false);
    setInviteCode('');
    setPlayerName('');
    setError(null);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'transparent',
        py: 4,
        px: 2
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ mt: 3, mb: 3 }}>
          {/* Game Description */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 3,
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 2,
              textAlign: 'center'
            }}
          >
            <Typography
              variant="h3"
              sx={{
                color: 'white',
                fontFamily: '"Cinzel", serif',
                mb: 2,
                fontWeight: 600
              }}
            >
              Welcome to Splendor
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: 'rgba(255, 255, 255, 0.9)',
                maxWidth: '800px',
                margin: '0 auto',
                lineHeight: 1.8,
                fontSize: '1.1rem'
              }}
            >
              As a wealthy Renaissance merchant, compete to build the most prestigious jewelry empire. 
              Collect gems, purchase development cards, and attract noble patrons. The first player to 
              reach 15 prestige points claims victory and eternal glory!
            </Typography>
          </Paper>

          {/* Action Buttons */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 3,
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 2
            }}
          >
            <Grid container spacing={2} justifyContent="center">
              <Grid item xs={12} sm={6}>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  onClick={openCreateGameModal}
                  disabled={loading}
                  startIcon={<AddIcon />}
                  data-testid="create-game-button"
                  sx={{
                    height: 56,
                    background: 'linear-gradient(135deg, #DAA520 0%, #FFD700 100%)',
                    color: '#000',
                    fontWeight: 600,
                    '&:hover': {
                      background: 'linear-gradient(135deg, #B8860B 0%, #DAA520 100%)',
                    },
                    '&:disabled': {
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'rgba(255, 255, 255, 0.3)',
                    }
                  }}
                >
                  Create New Game
                </Button>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Button
                  fullWidth
                  variant="outlined"
                  size="large"
                  onClick={openInviteCodeModal}
                  data-testid="join-invite-code-button"
                  disabled={loading}
                  sx={{
                    height: 56,
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    color: 'white',
                    fontWeight: 600,
                    '&:hover': {
                      borderColor: '#FFD700',
                      backgroundColor: 'rgba(255, 215, 0, 0.1)',
                    },
                  }}
                >
                  Join by Invite Code
                </Button>
              </Grid>
              {/* Leaderboard is accessible from the header now */}
            </Grid>
          </Paper>

          {/* Error Alert */}
          {error && (
            <Alert
              severity="error"
              sx={{ mb: 3 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          {/* Available Games List */}
          {availableGames.length > 0 && (
            <Paper
              elevation={0}
              sx={{
                p: 3,
                mb: 3,
                background: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 2
              }}
            >
              <Typography
                variant="h5"
                sx={{
                  color: 'white',
                  mb: 2,
                  fontFamily: '"Cinzel", serif',
                  fontWeight: 600,
                }}
              >
                🎮 Available Games
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  mb: 2,
                }}
              >
                Join an existing game or create your own above
              </Typography>
              <Grid container spacing={2}>
                {availableGames.map((game) => (
                  <Grid item xs={12} sm={6} md={4} key={game.id}>
                    <Card
                      sx={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        '&:hover': {
                          border: '1px solid rgba(255, 215, 0, 0.5)',
                          transform: 'translateY(-4px)',
                          transition: 'all 0.3s ease',
                        },
                      }}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          {game.isPrivate ? (
                            <LockIcon sx={{ color: '#FFD700', fontSize: 20 }} />
                          ) : (
                            <PublicIcon sx={{ color: '#4CAF50', fontSize: 20 }} />
                          )}
                          <Typography variant="h6" sx={{ color: 'white', fontSize: '1rem', fontWeight: 600 }}>
                            {game.name}
                          </Typography>
                        </Box>
                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', display: 'block', mb: 1 }}>
                          Game ID: {game.id}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                          <PeopleIcon sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 18 }} />
                          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                            {game.players.length} / 4 players
                          </Typography>
                        </Box>
                        {game.players.length > 0 && (
                          <Box sx={{ mb: 1 }}>
                            {game.players.map((player, idx) => (
                              <Chip
                                key={idx}
                                label={player.name}
                                size="small"
                                sx={{
                                  mr: 0.5,
                                  mb: 0.5,
                                  backgroundColor: 'rgba(255, 215, 0, 0.2)',
                                  color: '#FFD700',
                                  fontSize: '0.75rem',
                                }}
                              />
                            ))}
                          </Box>
                        )}
                      </CardContent>
                      <CardActions>
                        <Button
                          fullWidth
                          variant="contained"
                          size="small"
                          onClick={() => handleJoinGame(game.id)}
                          disabled={loading || loadingGames}
                          sx={{
                            background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                            color: 'white',
                            fontWeight: 600,
                            '&:hover': {
                              background: 'linear-gradient(135deg, #45a049 0%, #3d8b40 100%)',
                            },
                          }}
                        >
                          Join Game
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              {loadingGames && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <CircularProgress size={24} sx={{ color: '#FFD700' }} />
                </Box>
              )}
            </Paper>
          )}

          {/* Features Showcase removed */}
        </Box>
      </Container>

      {/* Name Input Modal */}
      <Dialog
        open={showNameModal}
        onClose={handleModalClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: 2
          }
        }}
      >
        <DialogTitle sx={{ color: 'white', fontFamily: '"Cinzel", serif' }}>
          {modalAction === 'create' ? 'Create New Game' : 'Join Game'}
        </DialogTitle>
        <DialogContent>
          <Typography
            variant="body1"
            sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 2 }}
          >
            {modalAction === 'create'
              ? (isAuthenticated
                  ? 'Choose your game settings:'
                  : 'Enter your name as a guest to create a new game:'
                )
              : 'Enter your name as a guest to join this game:'
            }
          </Typography>
          {!isAuthenticated && (
            <TextField
              autoFocus
              fullWidth
              label="Guest Name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && playerName.trim()) {
                  handleModalSubmit();
                }
              }}
              sx={{
                mt: 1,
                mb: modalAction === 'create' ? 2 : 0,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#FFD700',
                  },
                  '& input': {
                    color: 'white',
                    '&::placeholder': {
                      color: 'rgba(255, 255, 255, 0.5)',
                    }
                  }
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&.Mui-focused': {
                    color: '#FFD700',
                  },
                  '&.MuiInputLabel-shrink': {
                    color: 'rgba(255, 255, 255, 0.9)',
                  },
                },
              }}
              placeholder="Enter your guest name"
            />
          )}
          {modalAction === 'create' && (
            <>
              {!isAuthenticated && (
                <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.2)' }} />
              )}
              <Box sx={{ mt: 2, mb: 2 }}>
                <TextField
                  fullWidth
                  required
                  label="Lobby Name"
                  value={lobbyName}
                  onChange={(e) => setLobbyName(e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.5)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#FFD700',
                      },
                      '& input': {
                        color: 'white',
                        '&::placeholder': {
                          color: 'rgba(255, 255, 255, 0.5)',
                        }
                      }
                    },
                    '& .MuiInputLabel-root': {
                      color: 'rgba(255, 255, 255, 0.7)',
                      '&.Mui-focused': {
                        color: '#FFD700',
                      },
                      '&.MuiInputLabel-shrink': {
                        color: 'rgba(255, 255, 255, 0.9)',
                      },
                    },
                  }}
                  placeholder="e.g., Epic Game Night"
                />
              </Box>
              <Box sx={{ mt: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={isPrivateGame}
                      onChange={(e) => setIsPrivateGame(e.target.checked)}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#FFD700',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#DAA520',
                        },
                      }}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" sx={{ color: 'white' }}>
                        Private Game
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                        {isPrivateGame 
                          ? 'Only players with the invite code can join'
                          : 'Anyone can discover and join this game'
                        }
                      </Typography>
                    </Box>
                  }
                  sx={{ alignItems: 'flex-start', mt: 1 }}
                />
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button
            onClick={handleModalClose}
            sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleModalSubmit}
            disabled={
              (!isAuthenticated && !playerName.trim()) || 
              (modalAction === 'create' && !lobbyName.trim()) || 
              loading
            }
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #DAA520 0%, #FFD700 100%)',
              color: '#000',
              fontWeight: 600,
              '&:hover': {
                background: 'linear-gradient(135deg, #B8860B 0%, #DAA520 100%)',
              },
              '&:disabled': {
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'rgba(255, 255, 255, 0.3)',
              }
            }}
          >
            {loading ? <CircularProgress size={20} /> : modalAction === 'create' ? 'Create Game' : 'Join Game'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Invite Code Modal */}
      <Dialog
        open={showInviteModal}
        onClose={handleInviteModalClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: 2
          }
        }}
      >
        <DialogTitle sx={{ color: 'white', fontFamily: '"Cinzel", serif' }}>
          Join Private Game
        </DialogTitle>
        <DialogContent>
          <Typography
            variant="body1"
            sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 2 }}
          >
            Enter the invite code for the private game you want to join:
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Invite Code"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && inviteCode.trim()) {
                handleJoinByInviteCode();
              }
            }}
            sx={{
              mt: 1,
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                '& fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#FFD700',
                },
                '& input': {
                  color: 'white',
                  '&::placeholder': {
                    color: 'rgba(255, 255, 255, 0.5)',
                  }
                }
              },
              '& .MuiInputLabel-root': {
                color: 'rgba(255, 255, 255, 0.7)',
                '&.Mui-focused': {
                  color: '#FFD700',
                },
                '&.MuiInputLabel-shrink': {
                  color: 'rgba(255, 255, 255, 0.9)',
                },
              },
            }}
            placeholder="Enter invite code"
          />
          {!isAuthenticated && (
            <TextField
              fullWidth
              label="Your Name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              sx={{
                mt: 2,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#FFD700',
                  },
                  '& input': {
                    color: 'white',
                    '&::placeholder': {
                      color: 'rgba(255, 255, 255, 0.5)',
                    }
                  }
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&.Mui-focused': {
                    color: '#FFD700',
                  },
                  '&.MuiInputLabel-shrink': {
                    color: 'rgba(255, 255, 255, 0.9)',
                  },
                },
              }}
              placeholder="Enter your name"
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button
            onClick={handleInviteModalClose}
            sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleJoinByInviteCode}
            disabled={!inviteCode.trim() || (!isAuthenticated && !playerName.trim()) || loading}
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #DAA520 0%, #FFD700 100%)',
              color: '#000',
              fontWeight: 600,
              '&:hover': {
                background: 'linear-gradient(135deg, #B8860B 0%, #DAA520 100%)',
              },
              '&:disabled': {
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'rgba(255, 255, 255, 0.3)',
              }
            }}
          >
            {loading ? <CircularProgress size={20} /> : 'Join Game'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add ChatPanel for DMs and friend requests */}
      {isAuthenticated && <ChatPanel />}
    </Box>
  );
};

export default HomePage;
