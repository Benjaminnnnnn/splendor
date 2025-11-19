import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  Star as StarIcon,
  VideogameAsset as GameIcon,
} from '@mui/icons-material';
import { userServiceClient } from '../services/userServiceClient';
import { User, UserStats } from '../../../shared/types/user';

interface LeaderboardEntry {
  user: User;
  stats: UserStats;
}

const LeaderboardPage: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await userServiceClient.getLeaderboard(20); // Top 20 players
      setLeaderboard(data);
    } catch (err: any) {
      console.error('Error fetching leaderboard:', err);
      setError(err.response?.data?.error || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const getRankColor = (rank: number): string => {
    if (rank === 1) return '#FFD700'; // Gold
    if (rank === 2) return '#C0C0C0'; // Silver
    if (rank === 3) return '#CD7F32'; // Bronze
    return 'rgba(255, 255, 255, 0.7)';
  };

  const getRankIcon = (rank: number) => {
    if (rank <= 3) {
      return <TrophyIcon sx={{ color: getRankColor(rank), fontSize: 32 }} />;
    }
    return null;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        {/* Header */}
        <Paper
          elevation={0}
          sx={{
            p: 4,
            mb: 4,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: 2,
            textAlign: 'center',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
            <TrophyIcon sx={{ fontSize: 48, color: '#FFD700', mr: 2 }} />
            <Typography
              variant="h3"
              sx={{
                color: 'white',
                fontFamily: '"Cinzel", serif',
                fontWeight: 600,
              }}
            >
              Leaderboard
            </Typography>
          </Box>
          <Typography
            variant="body1"
            sx={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '1.1rem',
            }}
          >
            Top players ranked by victories and prestige
          </Typography>
        </Paper>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Leaderboard Table */}
        {leaderboard.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 6,
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 2,
              textAlign: 'center',
            }}
          >
            <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              No players on the leaderboard yet. Be the first!
            </Typography>
          </Paper>
        ) : (
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 2,
            }}
          >
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: 'white', fontWeight: 600, fontSize: '1rem' }}>
                    Rank
                  </TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600, fontSize: '1rem' }}>
                    Player
                  </TableCell>
                  <TableCell align="center" sx={{ color: 'white', fontWeight: 600, fontSize: '1rem' }}>
                    Games Won
                  </TableCell>
                  <TableCell align="center" sx={{ color: 'white', fontWeight: 600, fontSize: '1rem' }}>
                    Games Played
                  </TableCell>
                  <TableCell align="center" sx={{ color: 'white', fontWeight: 600, fontSize: '1rem' }}>
                    Win Rate
                  </TableCell>
                  <TableCell align="center" sx={{ color: 'white', fontWeight: 600, fontSize: '1rem' }}>
                    Total Prestige
                  </TableCell>
                  <TableCell align="center" sx={{ color: 'white', fontWeight: 600, fontSize: '1rem' }}>
                    High Score
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leaderboard.map((entry, index) => {
                  const rank = index + 1;
                  const winRate = entry.stats.games_played > 0
                    ? ((entry.stats.games_won / entry.stats.games_played) * 100).toFixed(1)
                    : '0.0';

                  return (
                    <TableRow
                      key={entry.user.id}
                      sx={{
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        },
                        backgroundColor: rank <= 3 ? 'rgba(255, 215, 0, 0.05)' : 'transparent',
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getRankIcon(rank)}
                          <Typography
                            variant="h6"
                            sx={{
                              color: getRankColor(rank),
                              fontWeight: 600,
                              minWidth: 30,
                            }}
                          >
                            #{rank}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar
                            sx={{
                              bgcolor: getRankColor(rank),
                              color: '#000',
                              fontWeight: 600,
                            }}
                          >
                            {entry.user.username.charAt(0).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography
                              variant="body1"
                              sx={{
                                color: 'white',
                                fontWeight: 500,
                              }}
                            >
                              {entry.user.username}
                            </Typography>
                            {entry.stats.favorite_gem_type && (
                              <Typography
                                variant="caption"
                                sx={{
                                  color: 'rgba(255, 255, 255, 0.5)',
                                }}
                              >
                                Favors: {entry.stats.favorite_gem_type}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          icon={<TrophyIcon />}
                          label={entry.stats.games_won}
                          sx={{
                            background: 'linear-gradient(135deg, #DAA520 0%, #FFD700 100%)',
                            color: '#000',
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          icon={<GameIcon />}
                          label={entry.stats.games_played}
                          sx={{
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            color: 'white',
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography
                          variant="body1"
                          sx={{
                            color: parseFloat(winRate) >= 50 ? '#4caf50' : 'rgba(255, 255, 255, 0.7)',
                            fontWeight: 500,
                          }}
                        >
                          {winRate}%
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                          <StarIcon sx={{ color: '#FFD700', fontSize: 18 }} />
                          <Typography
                            variant="body1"
                            sx={{
                              color: 'white',
                              fontWeight: 500,
                            }}
                          >
                            {entry.stats.total_prestige_points}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Typography
                          variant="body1"
                          sx={{
                            color: '#FFD700',
                            fontWeight: 600,
                          }}
                        >
                          {entry.stats.highest_prestige_score}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Stats Summary */}
        {leaderboard.length > 0 && (
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mt: 4,
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 2,
              textAlign: 'center',
            }}
          >
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              Showing top {leaderboard.length} players • Updated in real-time
            </Typography>
          </Paper>
        )}
      </Container>
    </Box>
  );
};

export default LeaderboardPage;
