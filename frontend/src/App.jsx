import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Box, CircularProgress } from '@mui/material';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import SongViewer from './components/SongViewer';
import AddSong from './components/AddSong';
import Stats from './components/Stats';
import Migration from './components/Migration';
import Navbar from './components/Navbar';
import Playlists from './components/Playlists';
import PlaylistView from './components/PlaylistView';
import PendingApproval from './components/PendingApproval';
import AdminPanel from './components/AdminPanel';

// Modern, snappy dark theme perfect for stage/busking
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#4ade80' }, // More vibrant modern green
    background: { default: '#0f1115', paper: '#1a1d24' }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    button: {
      textTransform: 'none',
      fontWeight: 'bold',
    }
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '24px',
          padding: '8px 24px',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 6px 16px rgba(74, 222, 128, 0.2)',
          }
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0))',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        }
      }
    }
  }
});

function AppContent() {
  const { user, loading, appLoading, userStatus, userRole } = useAuth();

  if (loading || appLoading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f1115',
        }}
      >
        <CircularProgress sx={{ color: '#4ade80' }} size={50} thickness={4} />
      </Box>
    );
  }

  if (!user) {
    return <Login />;
  }

  // Gate on user status
  if (userStatus === 'pending') {
    return <PendingApproval />;
  }

  const isAdmin = userRole === 'admin';

  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/song/:id" element={<SongViewer />} />
        <Route path="/add" element={<AddSong />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/playlists" element={<Playlists />} />
        <Route path="/playlist/:id" element={<PlaylistView />} />
        <Route path="/migrate" element={<Migration />} />
        {isAdmin && <Route path="/admin" element={<AdminPanel />} />}
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
