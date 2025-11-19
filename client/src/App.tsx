import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Container, ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme';
import { AuthProvider } from './contexts/AuthContext';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import LeaderboardPage from './pages/LeaderboardPage';
import GamePage from './pages/GamePage';
import LobbyPage from './pages/LobbyPage';
import InvitePage from './pages/InvitePage';

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <style>
          {`
            @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap');
          `}
        </style>

        <Header gameTitle="Splendor" />

        <Container
          maxWidth="xl"
          sx={{
            mt: 0,
            px: 0,
            minHeight: 'calc(100vh - 64px)',
          }}
        >
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/lobby/:gameId" element={<LobbyPage />} />
            <Route path="/game/:gameId" element={<GamePage />} />
            <Route path="/invite/:gameId" element={<InvitePage />} />
          </Routes>
        </Container>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
