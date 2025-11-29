import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  AccountBalanceWallet,
  SportsEsports,
  TrendingUp,
  History,
  EmojiEvents,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { bettingServiceClient } from '../services/bettingServiceClient';
import { gameService } from '../services/gameService';
import { Game, GameState } from '../../../shared/types/game';
import { Bet, BetStatus, GameBettingStats } from '../../../shared/types/betting';

interface GameWithStats extends Game {
  bettingStats?: GameBettingStats;
}

const BettingPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [balance, setBalance] = useState<number>(1000);
  const [games, setGames] = useState<GameWithStats[]>([]);
  const [bettingHistory, setBettingHistory] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Betting dialog state
  const [betDialogOpen, setBetDialogOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameWithStats | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [betAmount, setBetAmount] = useState<string>('');
  const [placingBet, setPlacingBet] = useState(false);

  // Fetch data on mount and set up auto-refresh
  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/auth?mode=login');
      return;
    }

    fetchAllData();
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      fetchAllData();
    }, 5000);

    return () => clearInterval(interval);
  }, [isAuthenticated, user, navigate]);

  const fetchAllData = async () => {
    if (!user) return;

    try {
      // Fetch balance
      const userBalance = await bettingServiceClient.getUserBalance(user.id);
      setBalance(userBalance);

      // Fetch all games
      const allGames = await gameService.listGames();
      
      // Filter for in-progress games only
      const inProgressGames = allGames.filter(
        game => game.state === GameState.IN_PROGRESS
      );

      // Fetch betting stats for each game
      const gamesWithStats = await Promise.all(
        inProgressGames.map(async (game) => {
          try {
            const stats = await bettingServiceClient.getGameBettingStats(game.id);
            return { ...game, bettingStats: stats };
          } catch (err) {
            return { ...game, bettingStats: undefined };
          }
        })
      );

      setGames(gamesWithStats);

      // Fetch betting history
      const history = await bettingServiceClient.getUserBettingHistory(user.id, 10);
      setBettingHistory(history.bets);

      setError(null);
    } catch (err) {
      console.error('Error fetching betting data:', err);
      setError('Failed to load betting data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBetDialog = (game: GameWithStats) => {
    setSelectedGame(game);
    setSelectedPlayerId('');
    setBetAmount('');
    setBetDialogOpen(true);
    setError(null);
    setSuccess(null);
  };

  const handleCloseBetDialog = () => {
    setBetDialogOpen(false);
    setSelectedGame(null);
    setSelectedPlayerId('');
    setBetAmount('');
  };

  const handlePlaceBet = async () => {
    if (!user || !selectedGame || !selectedPlayerId || !betAmount) {
      setError('Please fill in all fields');
      return;
    }

    const amount = parseInt(betAmount);
    if (isNaN(amount) || amount < 10 || amount > 1000) {
      setError('Bet amount must be between 10 and 1000');
      return;
    }

    if (amount > balance) {
      setError('Insufficient balance');
      return;
    }

    setPlacingBet(true);
    setError(null);

    try {
      const response = await bettingServiceClient.placeBet(user.id, {
        gameId: selectedGame.id,
        playerId: selectedPlayerId,
        amount
      });

      setBalance(response.newBalance);
      setSuccess(`Bet placed successfully! New balance: ${response.newBalance}`);
      handleCloseBetDialog();
      
      // Refresh data
      await fetchAllData();
    } catch (err: any) {
      setError(err.message || 'Failed to place bet');
    } finally {
      setPlacingBet(false);
    }
  };

  const getOddsForPlayer = (game: GameWithStats, playerId: string): number => {
    // If no betting stats at all, default odds is 2.0
    if (!game.bettingStats) return 2.0;
    
    // If there are no bets in the game yet, default odds is 2.0
    if (game.bettingStats.totalBets === 0) return 2.0;
    
    // If bets exist but not on this specific player, odds is 3.0
    const playerBet = game.bettingStats.playerBets.find(pb => pb.playerId === playerId);
    return playerBet ? playerBet.odds : 3.0;
  };

  const getBetStatusColor = (status: BetStatus): string => {
    switch (status) {
      case BetStatus.WON:
        return '#4CAF50';
      case BetStatus.LOST:
        return '#f44336';
      case BetStatus.PENDING:
        return '#FF9800';
      case BetStatus.CANCELLED:
        return '#9E9E9E';
      default:
        return '#9E9E9E';
    }
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleString();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress sx={{ color: '#FFD700' }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        py: 4,
        px: 2
      }}
    >
      <Container maxWidth="xl">
        {/* Header */}
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
            variant="h3"
            sx={{
              color: 'white',
              fontFamily: '"Cinzel", serif',
              fontWeight: 600,
              mb: 1
            }}
          >
            🎰 Betting Hub
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: 'rgba(255, 255, 255, 0.7)'
            }}
          >
            Place bets on ongoing games and track your betting history
          </Typography>
        </Paper>

        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {/* Balance Card */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            background: 'linear-gradient(135deg, #DAA520 0%, #FFD700 100%)',
            borderRadius: 2
          }}
        >
          <Box display="flex" alignItems="center" gap={2}>
            <AccountBalanceWallet sx={{ fontSize: 48, color: '#000' }} />
            <Box>
              <Typography variant="h6" sx={{ color: '#000', fontWeight: 600 }}>
                Your Balance
              </Typography>
              <Typography variant="h3" sx={{ color: '#000', fontWeight: 700 }}>
                {balance} 💰
              </Typography>
            </Box>
          </Box>
        </Paper>

        <Grid container spacing={3}>
          {/* Available Games */}
          <Grid item xs={12} lg={8}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                background: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 2
              }}
            >
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <SportsEsports sx={{ color: '#FFD700' }} />
                <Typography variant="h5" sx={{ color: 'white', fontWeight: 600 }}>
                  Active Games
                </Typography>
              </Box>

              {games.length === 0 ? (
                <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center', py: 4 }}>
                  No active games available for betting at the moment.
                </Typography>
              ) : (
                <Grid container spacing={2}>
                  {games.map((game) => (
                    <Grid item xs={12} md={6} key={game.id}>
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
                          <Typography variant="h6" sx={{ color: 'white', mb: 1 }}>
                            {game.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', display: 'block', mb: 2 }}>
                            Game ID: {game.id}
                          </Typography>

                          <Divider sx={{ my: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

                          <Typography variant="subtitle2" sx={{ color: 'rgba(255, 255, 255, 0.9)', mb: 1 }}>
                            Players:
                          </Typography>
                          {game.players.map((player) => (
                            <Box
                              key={player.id}
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                mb: 0.5,
                                p: 1,
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                borderRadius: 1
                              }}
                            >
                              <Box>
                                <Typography variant="body2" sx={{ color: 'white' }}>
                                  {player.name}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                                  {player.prestige} prestige
                                </Typography>
                              </Box>
                              <Chip
                                label={`${getOddsForPlayer(game, player.id).toFixed(2)}x`}
                                size="small"
                                sx={{
                                  backgroundColor: 'rgba(255, 215, 0, 0.2)',
                                  color: '#FFD700',
                                  fontWeight: 600
                                }}
                              />
                            </Box>
                          ))}

                          {game.bettingStats && (
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                                Total Pool: {game.bettingStats.totalAmount} | Bets: {game.bettingStats.totalBets}
                              </Typography>
                            </Box>
                          )}

                          <Button
                            fullWidth
                            variant="contained"
                            onClick={() => handleOpenBetDialog(game)}
                            sx={{
                              mt: 2,
                              background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                              color: 'white',
                              fontWeight: 600,
                              '&:hover': {
                                background: 'linear-gradient(135deg, #45a049 0%, #3d8b40 100%)',
                              },
                            }}
                          >
                            Place Bet
                          </Button>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Paper>
          </Grid>

          {/* Betting History */}
          <Grid item xs={12} lg={4}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                background: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 2
              }}
            >
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <History sx={{ color: '#FFD700' }} />
                <Typography variant="h5" sx={{ color: 'white', fontWeight: 600 }}>
                  Recent Bets
                </Typography>
              </Box>

              {bettingHistory.length === 0 ? (
                <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center', py: 4 }}>
                  No betting history yet. Place your first bet!
                </Typography>
              ) : (
                <Box>
                  {bettingHistory.map((bet) => (
                    <Card
                      key={bet.id}
                      sx={{
                        mb: 2,
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Chip
                            label={bet.status}
                            size="small"
                            sx={{
                              backgroundColor: getBetStatusColor(bet.status),
                              color: 'white',
                              fontWeight: 600
                            }}
                          />
                          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                            {formatDate(bet.created_at)}
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: 'white', mb: 0.5 }}>
                          Amount: {bet.amount} @ {bet.odds.toFixed(2)}x
                        </Typography>
                        {bet.payout && (
                          <Typography variant="body2" sx={{ color: '#4CAF50', fontWeight: 600 }}>
                            Payout: {bet.payout} 💰
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* Bet Placement Dialog */}
      <Dialog
        open={betDialogOpen}
        onClose={handleCloseBetDialog}
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
          <Box display="flex" alignItems="center" gap={1}>
            <TrendingUp sx={{ color: '#FFD700' }} />
            Place Your Bet
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedGame && (
            <>
              <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 2 }}>
                Game: <strong>{selectedGame.name}</strong>
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 3 }}>
                Your Balance: {balance} 💰
              </Typography>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Select Player</InputLabel>
                <Select
                  value={selectedPlayerId}
                  onChange={(e) => setSelectedPlayerId(e.target.value)}
                  sx={{
                    color: 'white',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#FFD700',
                    },
                  }}
                >
                  {selectedGame.players.map((player) => (
                    <MenuItem key={player.id} value={player.id}>
                      {player.name} - {player.prestige} prestige (Odds: {getOddsForPlayer(selectedGame, player.id).toFixed(2)}x)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Bet Amount (10-1000)"
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                inputProps={{ min: 10, max: 1000 }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
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
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255, 255, 255, 0.7)',
                    '&.Mui-focused': {
                      color: '#FFD700',
                    },
                  },
                }}
              />

              {selectedPlayerId && betAmount && (
                <Box
                  sx={{
                    mt: 2,
                    p: 2,
                    backgroundColor: 'rgba(255, 215, 0, 0.1)',
                    borderRadius: 1,
                    border: '1px solid rgba(255, 215, 0, 0.3)'
                  }}
                >
                  <Typography variant="body2" sx={{ color: 'white' }}>
                    Potential Payout: <strong>{Math.round(parseInt(betAmount) * getOddsForPlayer(selectedGame, selectedPlayerId))} 💰</strong>
                  </Typography>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button
            onClick={handleCloseBetDialog}
            sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePlaceBet}
            disabled={!selectedPlayerId || !betAmount || placingBet}
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
            {placingBet ? <CircularProgress size={20} /> : 'Place Bet'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BettingPage;
