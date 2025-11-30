import { AccessTime, DirectionsRun, Groups, Insights, Leaderboard as LeaderboardIcon, MilitaryTech, Star, Style, EmojiEvents as TrophyIcon, WorkspacePremium } from '@mui/icons-material';
import { Alert, Box, Button, Card, CardContent, Chip, Container, Grid, LinearProgress, Paper, Skeleton, Stack, Tab, Tabs, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { motion, useReducedMotion } from 'framer-motion';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AchievementCode, achievementsCatalog } from '../../../shared/data/achievement';
import { useAuth } from '../contexts/AuthContext';
import { UserProfile, userServiceClient } from '../services/userServiceClient';

type BadgeState = 'unlocked' | 'locked';

interface BadgeViewModel {
  code: AchievementCode | string;
  name: string;
  description: string;
  category: string;
  unlockedAt?: number;
  progressValue?: number;
  state: BadgeState;
  sortOrder?: number;
}

const badgeArtFilenames: Record<string, string> = {
  first_game: 'first-game.png',
  first_win: 'first-win.png',
  marathon_20: 'marathon-20.png',
  marathon_50: 'marathon-50.png',
  card_collector: 'card-collector.png',
  card_mogul: 'card-mogul.png',
  winner_10: 'winner-10.png',
  prestige_hunter: 'prestige-hunder.png', // asset filename typo
  prestige_hoarder: 'prestige-hoarder.png',
  speedrunner: 'speedrunner.png',
  swift_victory: 'swift-victory.png',
  noble_courtier: 'noble-courtier.png',
  noble_diplomat: 'noble-diplomat.png',
  gem_specialist: 'gem-specialist.png',
  consistent_winner: 'consistent-winner.png',
};

const MotionBox = motion(Box);
const MotionCard = motion(Card);

const badgeContainerVariants = (prefersReducedMotion: boolean) => ({
  hidden: {},
  show: {
    transition: {
      staggerChildren: prefersReducedMotion ? 0 : 0.08,
    },
  },
});

const badgeItemVariants = (prefersReducedMotion: boolean) => ({
  hidden: {
    opacity: 0,
    scale: prefersReducedMotion ? 1 : 0.94,
    y: prefersReducedMotion ? 0 : 16,
  },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 140,
      damping: 14,
    },
  },
});

const formatWinRate = (wins: number, played: number) => {
  if (!played) return '0.0%';
  return `${((wins / played) * 100).toFixed(1)}%`;
};

const formatSeconds = (seconds?: number | null) => {
  if (!seconds || seconds <= 0) return '—';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const prefersReducedMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<'stats' | 'achievements'>('stats');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [unlockedFirst, setUnlockedFirst] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const loadProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await userServiceClient.getUserProfile(user.id);
        setProfile(data);
      } catch (err: any) {
        console.error('Failed to load profile', err);
        setError(err?.response?.data?.error || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [user?.id]);

  const badges: BadgeViewModel[] = useMemo(() => {
    if (!profile) return [];
    const unlocked = profile.achievements.unlocked.map((ach) => ({
      ...ach,
      state: 'unlocked' as BadgeState,
    }));
    const locked = profile.achievements.locked.map((ach) => ({
      ...ach,
      state: 'locked' as BadgeState,
    }));
    return [...unlocked, ...locked];
  }, [profile]);

  const filteredBadges = useMemo(() => {
    let sorted = [...badges];
    if (unlockedFirst) {
      sorted = sorted.sort((a, b) => {
        if (a.state !== b.state) return a.state === 'unlocked' ? -1 : 1;
        return (b.unlockedAt || 0) - (a.unlockedAt || 0);
      });
    } else {
      sorted = sorted.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    }

    if (categoryFilter !== 'all') {
      return sorted.filter((b) => b.category === categoryFilter);
    }
    return sorted;
  }, [badges, categoryFilter, unlockedFirst]);

  const heroBackground = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)';

  const categoryOptions = ['all', ...new Set(achievementsCatalog.map((a) => a.category))];

  const renderStatCard = (
    label: string,
    value: string | number,
    icon: JSX.Element,
    testId: string,
    helper?: string
  ) => (
    <Card
      elevation={0}
      sx={{
        background: 'linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 12px 28px rgba(0,0,0,0.35)',
        color: '#f5f5f5',
      }}
      data-testid={testId}
    >
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              {label}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#fff' }}>
              {value}
            </Typography>
            {helper && (
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                {helper}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #22D3EE 0%, #4F46E5 100%)',
              color: '#0B1021',
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 8px 18px rgba(0,0,0,0.35)',
            }}
          >
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );

  const renderBadgeCard = (badge: BadgeViewModel) => {
    const isUnlocked = badge.state === 'unlocked';
    const progressText =
      badge.progressValue && !isUnlocked
        ? `Progress: ${(badge.progressValue * 100).toFixed(0)}%`
        : isUnlocked && badge.unlockedAt
        ? `Unlocked ${new Date(badge.unlockedAt).toLocaleDateString()}`
        : 'Locked';
    const artFilename = badgeArtFilenames[badge.code] || 'first-game.png';
    const artSrc = `/achievement-art/${artFilename}`;

    return (
      <MotionCard
        key={badge.code}
        variants={badgeItemVariants(prefersReducedMotion)}
        whileHover={
          prefersReducedMotion
            ? undefined
            : { y: -6, boxShadow: '0 12px 28px rgba(44,24,16,0.16)' }
        }
        data-testid={`badge-card-${badge.code}`}
        sx={{
          borderRadius: 3,
          position: 'relative',
          overflow: 'hidden',
          background: theme.palette.background.paper,
          border: isUnlocked ? '1px solid rgba(34,211,238,0.6)' : '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 16px 32px rgba(0,0,0,0.35)',
        }}
      >
        <Box sx={{ position: 'relative' }}>
          <Box
            component="img"
            src={artSrc}
            alt={badge.name}
            sx={{
              width: '100%',
              height: 180,
              objectFit: 'cover',
              filter: isUnlocked ? 'none' : 'grayscale(0.6) brightness(0.85)',
              transition: 'filter 0.2s ease',
            }}
          />
          {!isUnlocked && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.35) 100%)',
              }}
            />
          )}
        </Box>
        <CardContent sx={{ position: 'relative' }}>
          <Stack spacing={1}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {badge.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {badge.description}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                size="small"
                label={badge.category}
                sx={{
                  textTransform: 'capitalize',
                  backgroundColor: isUnlocked ? 'rgba(34,211,238,0.15)' : 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(34,211,238,0.3)',
                }}
              />
              <Typography variant="caption" color="text.secondary">
                {progressText}
              </Typography>
            </Stack>
            {!isUnlocked && (
              <Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, Math.max(0, (badge.progressValue || 0) * 100))}
                  sx={{
                    height: 8,
                    borderRadius: 2,
                    backgroundColor: 'rgba(255,255,255,0.12)',
                    '& .MuiLinearProgress-bar': {
                      background: 'linear-gradient(135deg, #22D3EE 0%, #4F46E5 100%)',
                    },
                  }}
                />
              </Box>
            )}
          </Stack>
        </CardContent>
      </MotionCard>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Grid container spacing={3}>
            {[...Array(4)].map((_, idx) => (
              <Grid item xs={12} sm={6} md={3} key={idx}>
                <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 3 }} />
              </Grid>
            ))}
            <Grid item xs={12}>
              <Skeleton variant="rectangular" height={420} sx={{ borderRadius: 3 }} />
            </Grid>
          </Grid>
        </Container>
      );
    }

    if (error) {
      return (
        <Container maxWidth="md" sx={{ py: 6 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
          <Button variant="contained" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </Container>
      );
    }

    if (!profile) {
      return null;
    }

    const stats = profile.stats;
    const winRate = formatWinRate(stats.games_won, stats.games_played);

    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            mb: 4,
            borderRadius: 3,
            background: heroBackground,
            border: '1px solid rgba(34,211,238,0.25)',
            boxShadow: '0 12px 24px rgba(0,0,0,0.35)',
            color: '#fff',
          }}
          data-testid="profile-hero"
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems="center">
            <Box
              sx={{
                width: 88,
                height: 88,
                borderRadius: '24px',
                background: 'linear-gradient(135deg, #22D3EE 0%, #4F46E5 100%)',
                color: '#0B1021',
                display: 'grid',
                placeItems: 'center',
                fontSize: '2rem',
                fontWeight: 700,
                boxShadow: '0 12px 20px rgba(0,0,0,0.45)',
              }}
            >
              {profile.user.username.charAt(0).toUpperCase()}
            </Box>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#fff' }}>
                {profile.user.username}
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                {profile.user.email}
              </Typography>
                <Stack direction="row" spacing={1} alignItems="center" mt={1} flexWrap="wrap">
                {profile.leaderboardRank !== null && (
                  <Chip
                    icon={<LeaderboardIcon />}
                    label={`Rank #${profile.leaderboardRank}`}
                    color="secondary"
                    variant="outlined"
                    sx={{
                      color: '#E5E7EB',
                      borderColor: 'rgba(34,211,238,0.6)',
                      backgroundColor: 'rgba(34,211,238,0.12)',
                    }}
                  />
                )}
                <Chip
                  icon={<TrophyIcon />}
                  label={`${profile.achievements.unlocked.length} achievements`}
                  variant="outlined"
                  color="secondary"
                  sx={{
                    color: '#E5E7EB',
                    borderColor: 'rgba(34,211,238,0.6)',
                    backgroundColor: 'rgba(34,211,238,0.12)',
                  }}
                />
              </Stack>
            </Box>
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                startIcon={<LeaderboardIcon />}
                onClick={() => navigate('/leaderboard')}
                sx={{
                  color: '#E5E7EB',
                  borderColor: 'rgba(34,211,238,0.8)',
                  backgroundColor: 'rgba(34,211,238,0.12)',
                  '&:hover': {
                    borderColor: '#22D3EE',
                    backgroundColor: 'rgba(34,211,238,0.2)',
                  },
                }}
              >
                View Leaderboard
              </Button>
              <Button
                variant="contained"
                onClick={() => navigate('/')}
                sx={{
                  background: 'linear-gradient(135deg, #DAA520 0%, #FFD700 100%)',
                  color: '#000',
                  fontWeight: 600,
                  '&:hover': {
                    background: 'linear-gradient(135deg, #B8860B 0%, #DAA520 100%)',
                  },
                }}
              >
                Play a Game
              </Button>
            </Stack>
          </Stack>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            overflow: 'hidden',
            mb: 3,
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            indicatorColor="secondary"
            textColor="inherit"
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': { fontWeight: 600, color: '#f5f5f5' },
              '& .MuiTabs-indicator': { backgroundColor: theme.palette.secondary.main },
            }}
          >
            <Tab label="Stats" value="stats" />
            <Tab label="Achievements" value="achievements" />
          </Tabs>
        </Paper>

        {activeTab === 'stats' && (
          <Box>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                {renderStatCard('Games Played', stats.games_played, <DirectionsRun />, 'stats-card-games')}
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                {renderStatCard('Games Won', stats.games_won, <MilitaryTech />, 'stats-card-wins')}
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                {renderStatCard('Win Rate', winRate, <Insights />, 'stats-card-winrate')}
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                {renderStatCard(
                  'Fastest Win',
                  formatSeconds(stats.fastest_win_time),
                  <AccessTime />,
                  'stats-card-fastest'
                )}
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                {renderStatCard('Total Prestige', stats.total_prestige_points, <WorkspacePremium />, 'stats-card-prestige')}
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                {renderStatCard('Highest Score', stats.highest_prestige_score, <Star />, 'stats-card-highscore')}
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                {renderStatCard('Cards Purchased', stats.total_cards_purchased, <Style />, 'stats-card-cards')}
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                {renderStatCard('Nobles Acquired', stats.total_nobles_acquired, <Groups />, 'stats-card-nobles')}
              </Grid>
            </Grid>
            <Paper
              elevation={0}
              sx={{
                mt: 4,
                px: 4,
                py: 3,
                borderRadius: 3,
                background: 'rgba(0,0,0,0.35)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#f5f5f5',
              }}
            >
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                Highlights
              </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip
                label={`Favorite Gem: ${stats.favorite_gem_type || 'Unknown'}`}
                variant="outlined"
                color="secondary"
                sx={{ color: '#E5E7EB', borderColor: 'rgba(34,211,238,0.5)' }}
              />
              <Chip
                label={`Games: ${stats.games_played}`}
                variant="outlined"
                color="secondary"
                sx={{ color: '#E5E7EB', borderColor: 'rgba(34,211,238,0.5)' }}
              />
              <Chip
                label={`Wins: ${stats.games_won}`}
                variant="outlined"
                color="secondary"
                sx={{ color: '#E5E7EB', borderColor: 'rgba(34,211,238,0.5)' }}
              />
              <Chip
                label={`Win Rate: ${winRate}`}
                variant="outlined"
                color="secondary"
                sx={{ color: '#E5E7EB', borderColor: 'rgba(34,211,238,0.5)' }}
              />
            </Stack>
          </Paper>
        </Box>
      )}

        {activeTab === 'achievements' && (
          <Box>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 3,
                borderRadius: 3,
                background: 'rgba(0,0,0,0.35)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                justifyContent="space-between"
              >
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {categoryOptions.map((cat) => (
                    <Chip
                      key={cat}
                      label={cat === 'all' ? 'All' : cat}
                      variant={categoryFilter === cat ? 'filled' : 'outlined'}
                      color={categoryFilter === cat ? 'secondary' : 'default'}
                      onClick={() => setCategoryFilter(cat)}
                      sx={{
                        textTransform: 'capitalize',
                        color: categoryFilter === cat ? '#0B1021' : '#E5E7EB',
                        backgroundColor: categoryFilter === cat ? '#22D3EE' : 'transparent',
                        borderColor: 'rgba(255,255,255,0.3)',
                      }}
                    />
                  ))}
                </Stack>
                <Stack direction="row" spacing={1}>
                  <Chip
                    label={unlockedFirst ? 'Unlocked first' : 'Catalog order'}
                    color="primary"
                    onClick={() => setUnlockedFirst((v) => !v)}
                    variant="outlined"
                    sx={{
                      color: '#E5E7EB',
                      borderColor: 'rgba(34,211,238,0.6)',
                      backgroundColor: 'rgba(34,211,238,0.12)',
                    }}
                  />
                </Stack>
              </Stack>
            </Paper>

            {filteredBadges.length === 0 ? (
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  borderRadius: 3,
                  background: 'rgba(0,0,0,0.35)',
                  border: '1px dashed rgba(255,255,255,0.25)',
                  textAlign: 'center',
                  color: '#f5f5f5',
                }}
              >
                <Typography variant="h6" gutterBottom>
                  No achievements yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Finish your first game to unlock “First Game”.
                </Typography>
                <Button variant="contained" onClick={() => navigate('/')}>
                  Join a Lobby
                </Button>
              </Paper>
            ) : (
              <MotionBox
                variants={badgeContainerVariants(prefersReducedMotion)}
                initial="hidden"
                animate="show"
                sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 3 }}
                data-testid="achievements-grid"
              >
                {filteredBadges.map((badge) => renderBadgeCard(badge))}
              </MotionBox>
            )}
          </Box>
        )}
      </Container>
    );
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'transparent',
        py: 4,
      }}
    >
      <style>
        {`
        @keyframes shine {
          0% { transform: translateX(-100%); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }
      `}
      </style>
      {renderContent()}
    </Box>
  );
};

export default ProfilePage;
