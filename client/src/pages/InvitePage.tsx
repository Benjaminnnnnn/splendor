import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress
} from '@mui/material';
import { gameService } from '../services/gameService';
import { Game } from '../../../shared/types/game';

const InvitePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  // Auth removed: always treat visitor as guest
  const isAuthenticated = false;
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [game, setGame] = useState<Game | null>(null);
  const [gameLoading, setGameLoading] = useState(true);

  useEffect(() => {
    if (!gameId) {
      navigate('/');
      return;
    }

    const fetchGame = async () => {
      console.log('[InvitePage] Fetching game:', gameId);
      console.log('[InvitePage] API URL:', import.meta.env.VITE_API_URL);
      try {
        console.log('[InvitePage] About to call gameService.getGame()');
        const gameData = await gameService.getGame(gameId);
        console.log('[InvitePage] Game data received:', gameData);
        setGame(gameData);

        // Check if game is full
        if (gameData.players.length >= 4) {
          setError('This game is already full (4 players maximum).');
          return;
        }

      } catch (error) {
        console.error('[InvitePage] Error fetching game:', error);
        setError('Game not found or no longer available.');
      } finally {
        console.log('[InvitePage] Setting gameLoading to false');
        setGameLoading(false);
      }
    };

    fetchGame();
  }, [gameId, navigate]);

  const handleJoinGame = async () => {
    const nameToUse = playerName.trim();

    if (!nameToUse || !gameId) return;

    setLoading(true);
    setError('');

    try {
      const result = await gameService.joinGame(gameId, nameToUse);
      // Store the player ID for this session
      localStorage.setItem('currentPlayerId', result.playerId);
      navigate(`/lobby/${gameId}`);
    } catch (error: any) {
      console.error('Error joining game:', error);
      setError(error.message || 'Failed to join game. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    const nameToUse = playerName.trim();
    if (event.key === 'Enter' && nameToUse && !loading) {
      handleJoinGame();
    }
  };

  if (gameLoading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <CircularProgress sx={{ color: '#FFD700' }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'transparent',
        py: 4,
        px: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Box sx={{ maxWidth: 500, width: '100%' }}>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: 2,
            textAlign: 'center'
          }}
        >
          <Typography
            variant="h4"
            gutterBottom
            sx={{
              color: 'white',
              fontFamily: '"Cinzel", serif',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
              mb: 3
            }}
          >
            Join Game
          </Typography>

          {game && (
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="h6"
                sx={{ color: 'white', mb: 1 }}
              >
                {game.players[0]?.name}'s Game
              </Typography>
              <Typography
                variant="body1"
                sx={{ color: 'rgba(255, 255, 255, 0.8)' }}
              >
                Players: {game.players.length}/4
              </Typography>
            </Box>
          )}

          {error && (
            <Alert
              severity="error"
              sx={{ mb: 3 }}
            >
              {error}
            </Alert>
          )}

          {!error && !isAuthenticated && (
            <>
              <Typography
                variant="body1"
                sx={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  mb: 3
                }}
              >
                Enter your name to join this Splendor game
              </Typography>

              <TextField
                fullWidth
                label="Your Name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
                sx={{
                  mb: 3,
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
                variant="outlined"
                placeholder="Enter your name here"
                autoFocus
              />

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/')}
                  disabled={loading}
                  sx={{
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    color: 'white',
                    '&:hover': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    }
                  }}
                >
                  Cancel
                </Button>

                <Button
                  variant="contained"
                  onClick={handleJoinGame}
                  disabled={!playerName.trim() || loading}
                  sx={{
                    background: 'linear-gradient(135deg, #DAA520 0%, #FFD700 100%)',
                    color: '#000',
                    fontWeight: 600,
                    minWidth: 120,
                    '&:hover': {
                      background: 'linear-gradient(135deg, #B8860B 0%, #DAA520 100%)',
                    },
                    '&:disabled': {
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'rgba(255, 255, 255, 0.3)',
                    }
                  }}
                >
                  {loading ? <CircularProgress size={24} sx={{ color: '#000' }} /> : 'Join Game'}
                </Button>
              </Box>
            </>
          )}

          {!error && isAuthenticated && loading && (
            <Box sx={{ textAlign: 'center' }}>
              <CircularProgress sx={{ color: '#FFD700', mb: 2 }} />
                  <Typography
                    variant="body1"
                    sx={{
                      color: 'rgba(255, 255, 255, 0.9)'
                    }}
                  >
                    Joining game...
                  </Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default InvitePage;
