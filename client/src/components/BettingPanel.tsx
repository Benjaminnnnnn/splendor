import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Stack,
  Divider,
} from '@mui/material';
import { GameBettingStats, Bet } from '../../../shared/types/betting';

interface BettingPanelProps {
  gameId: string;
  userId: string;
  players: Array<{
    id: string;
    name: string;
    prestige: number;
    cards: number;
    nobles: number;
  }>;
  userBalance: number;
  onPlaceBet: (playerId: string, amount: number) => Promise<void>;
  bettingStats?: GameBettingStats;
  userBet?: Bet;
  gameState: 'waiting' | 'in_progress' | 'finished';
}

export const BettingPanel: React.FC<BettingPanelProps> = ({
  gameId,
  userId,
  players,
  userBalance,
  onPlaceBet,
  bettingStats,
  userBet,
  gameState,
}) => {
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [betAmount, setBetAmount] = useState<number>(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const minBet = 10;
  const maxBet = Math.min(1000, userBalance);

  const handlePlaceBet = async () => {
    if (!selectedPlayer) {
      setError('Please select a player');
      return;
    }

    if (betAmount < minBet || betAmount > maxBet) {
      setError(`Bet amount must be between ${minBet} and ${maxBet}`);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await onPlaceBet(selectedPlayer, betAmount);
      setSuccess(`Bet placed successfully! ${betAmount} coins on ${players.find(p => p.id === selectedPlayer)?.name}`);
      setSelectedPlayer('');
      setBetAmount(50);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place bet');
    } finally {
      setLoading(false);
    }
  };

  const getPlayerOdds = (playerId: string): number => {
    if (!bettingStats) return 2.0;
    
    const playerBet = bettingStats.playerBets.find(b => b.playerId === playerId);
    
    // If no one has bet on this player yet, return 3.0 (underdog odds)
    // But only if there are bets on other players
    if (!playerBet && bettingStats.totalBets > 0) {
      return 3.0;
    }
    
    return playerBet?.odds || 2.0;
  };

  const getPlayerBetCount = (playerId: string): number => {
    if (!bettingStats) return 0;
    const playerBet = bettingStats.playerBets.find(b => b.playerId === playerId);
    return playerBet?.totalBets || 0;
  };

  const canPlaceBet = gameState === 'in_progress' && userBalance >= minBet;

  return (
    <Card sx={{ width: '100%', background: 'rgba(0, 0, 0, 0.6)', borderRadius: 2, border: '1px solid rgba(255, 255, 255, 0.2)' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'white', textAlign: 'center', fontSize: '1rem' }}>
          🎰 Betting Panel
        </Typography>
        
        <Typography variant="body2" sx={{ color: 'gold', textAlign: 'center', mb: 2, fontWeight: 600 }}>
          Balance: {userBalance} coins
        </Typography>

        {gameState === 'waiting' && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Betting will open when the game starts
          </Alert>
        )}

        {gameState === 'finished' && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Game finished! Bets have been settled.
          </Alert>
        )}

        {userBet && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Active bet: {userBet.amount} coins on {players.find(p => p.id === userBet.player_id)?.name}
            {userBet.status === 'won' && ` - Won ${userBet.payout} coins! 🎉`}
            {userBet.status === 'lost' && ` - Better luck next time!`}
            {userBet.status === 'pending' && ` (Odds: ${userBet.odds.toFixed(2)}x, Potential: ${Math.round(userBet.amount * userBet.odds)} coins)`}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.2)' }} />

        <Typography variant="subtitle2" gutterBottom sx={{ color: 'white', fontWeight: 600, mb: 0.5 }}>
          Player Statistics
        </Typography>
        
        {canPlaceBet && !selectedPlayer && (
          <Typography variant="caption" sx={{ color: '#FFD700', display: 'block', mb: 1 }}>
            👆 Click a player to place your bet
          </Typography>
        )}

        <Stack spacing={1} sx={{ mb: 2 }}>
          {players.map((player) => {
            const isSelected = selectedPlayer === player.id;
            return (
              <Box
                key={player.id}
                sx={{
                  p: 1.5,
                  cursor: canPlaceBet ? 'pointer' : 'default',
                  border: isSelected ? '2px solid #1976d2' : '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: 1,
                  backgroundColor: isSelected ? 'rgba(25, 118, 210, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                  '&:hover': canPlaceBet ? { backgroundColor: 'rgba(255, 255, 255, 0.1)' } : {},
                }}
                onClick={() => canPlaceBet && setSelectedPlayer(player.id)}
              >
                <Typography variant="body2" sx={{ color: 'white', fontWeight: 600, mb: 0.5 }}>
                  {player.name}
                </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', display: 'block' }}>
                Prestige: {player.prestige} | Cards: {player.cards} | Nobles: {player.nobles}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                <Typography variant="caption" sx={{ color: '#90EE90' }}>
                  Odds: {getPlayerOdds(player.id).toFixed(2)}x
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  {getPlayerBetCount(player.id)} bets
                </Typography>
              </Box>
            </Box>
            );
          })}
        </Stack>

        {canPlaceBet && (
          <>
            <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.2)' }} />

            <Typography variant="subtitle2" gutterBottom sx={{ color: 'white', fontWeight: 600 }}>
              Place Your Bet
              {selectedPlayer && (
                <Typography component="span" sx={{ color: '#90EE90', ml: 1, fontSize: '0.75rem' }}>
                  (Betting on: {players.find(p => p.id === selectedPlayer)?.name})
                </Typography>
              )}
            </Typography>

            <TextField
              type="number"
              label="Bet Amount"
              value={betAmount}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value)) {
                  setBetAmount(Math.max(minBet, Math.min(maxBet, value)));
                }
              }}
              fullWidth
              size="small"
              sx={{ 
                mb: 2,
                '& .MuiInputLabel-root': { color: 'rgba(244, 242, 242, 1)' },
                '& .MuiOutlinedInput-root': { 
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                },
                '& .MuiOutlinedInput-input': {
                  color: 'white !important',
                  WebkitTextFillColor: 'white !important',
                  '&:disabled': {
                    color: 'rgba(255, 255, 255, 0.5) !important',
                    WebkitTextFillColor: 'rgba(255, 255, 255, 0.5) !important',
                  }
                }
              }}
              disabled={loading || !selectedPlayer}
              InputProps={{
                inputProps: { min: minBet, max: maxBet }
              }}
              helperText={`Min: ${minBet}, Max: ${maxBet}`}
              FormHelperTextProps={{ sx: { color: 'rgba(255, 255, 255, 1)' } }}
            />

            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={handlePlaceBet}
              disabled={loading || !selectedPlayer || betAmount < minBet || betAmount > maxBet}
              startIcon={loading && <CircularProgress size={20} />}
              sx={{ mb: 1 }}
            >
              {loading ? 'Placing Bet...' : 'Place Bet'}
            </Button>

            {selectedPlayer && (
              <Typography variant="caption" display="block" textAlign="center" sx={{ color: '#90EE90' }}>
                Potential payout: {Math.round(betAmount * getPlayerOdds(selectedPlayer))} coins
              </Typography>
            )}
          </>
        )}

        {bettingStats && bettingStats.totalBets > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="caption" color="text.secondary" display="block" textAlign="center">
              Total bets: {bettingStats.totalBets} | Total wagered: {bettingStats.totalAmount} coins
            </Typography>
          </>
        )}
      </CardContent>
    </Card>
  );
};
