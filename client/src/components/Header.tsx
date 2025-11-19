import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { AccountCircle, Logout, PersonAdd, Login, EmojiEvents } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import NotificationBell from './NotificationBell';

interface HeaderProps {
  gameTitle?: string;
  onTitleClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ gameTitle = 'Splendor', onTitleClick }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleTitleClick = () => {
    if (onTitleClick) {
      onTitleClick();
    } else {
      navigate('/');
    }
  };

  return (
    <>
      <AppBar
        position="static"
        elevation={0}
        sx={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <Toolbar>
          <Typography
            variant="h4"
            component="div"
            sx={{
              flexGrow: 1,
              color: 'white',
              fontFamily: '"Cinzel", serif',
              fontWeight: 600,
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
              letterSpacing: '0.02em',
              cursor: 'pointer',
            }}
            onClick={handleTitleClick}
          >
            {gameTitle}
          </Typography>

          {isAuthenticated && user ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <NotificationBell />

              <Button
                color="inherit"
                startIcon={<EmojiEvents />}
                onClick={() => navigate('/leaderboard')}
                sx={{
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  },
                }}
              >
                Leaderboard
              </Button>
              
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 2,
                  py: 0.5,
                  borderRadius: 1,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }}
              >
                <AccountCircle />
                <Typography variant="body1" sx={{ color: 'white' }}>
                  {user.username}
                </Typography>
              </Box>

              <Button
                color="inherit"
                startIcon={<Logout />}
                onClick={handleLogout}
                sx={{
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                Logout
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                color="inherit"
                startIcon={<EmojiEvents />}
                onClick={() => navigate('/leaderboard')}
                sx={{
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  },
                }}
              >
                Leaderboard
              </Button>
              <Button
                color="inherit"
                startIcon={<PersonAdd />}
                onClick={() => navigate('/auth?mode=register')}
                sx={{
                  '&:hover': {
                    backgroundColor: 'rgba(138, 43, 226, 0.2)',
                  },
                }}
              >
                Register
              </Button>
              <Button
                color="inherit"
                startIcon={<Login />}
                onClick={() => navigate('/auth?mode=login')}
                sx={{
                  '&:hover': {
                    backgroundColor: 'rgba(138, 43, 226, 0.2)',
                  },
                }}
              >
                Login
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>
    </>
  );
};

export default Header;
