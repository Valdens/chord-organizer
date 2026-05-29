import React, { useState } from 'react';
import { Box, Typography, Button, Paper, Alert, CircularProgress, useTheme } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import MusicNoteIcon from '@mui/icons-material/MusicNote';

export default function Login() {
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const theme = useTheme();

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to authenticate with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 10% 20%, rgba(74, 222, 128, 0.05) 0%, rgba(170, 59, 255, 0.03) 90.1%), #0f1115',
        padding: 3,
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        width: '100%',
      }}
    >
      {/* Decorative glowing backdrops */}
      <Box
        sx={{
          position: 'absolute',
          top: '20%',
          left: '15%',
          width: '300px',
          height: '300px',
          background: 'rgba(74, 222, 128, 0.15)',
          borderRadius: '50%',
          filter: 'blur(100px)',
          zIndex: 0,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '20%',
          right: '15%',
          width: '300px',
          height: '300px',
          background: 'rgba(170, 59, 255, 0.1)',
          borderRadius: '50%',
          filter: 'blur(100px)',
          zIndex: 0,
        }}
      />

      <Paper
        elevation={0}
        sx={{
          padding: { xs: 4, sm: 6 },
          maxWidth: '440px',
          width: '100%',
          zIndex: 1,
          textAlign: 'center',
          background: 'rgba(26, 29, 36, 0.65)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.07)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.4)',
          borderRadius: 6,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Animated Icon Header */}
        <Box
          sx={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #4ade80 0%, #aa3bff 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 3,
            boxShadow: '0 8px 24px rgba(74, 222, 128, 0.3)',
            animation: 'pulse 3s infinite ease-in-out',
            '@keyframes pulse': {
              '0%': { transform: 'scale(1)', boxShadow: '0 8px 24px rgba(74, 222, 128, 0.2)' },
              '50%': { transform: 'scale(1.05)', boxShadow: '0 12px 32px rgba(170, 59, 255, 0.35)' },
              '100%': { transform: 'scale(1)', boxShadow: '0 8px 24px rgba(74, 222, 128, 0.2)' },
            }
          }}
        >
          <MusicNoteIcon sx={{ fontSize: 32, color: '#0f1115' }} />
        </Box>

        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 800,
            letterSpacing: '-1px',
            marginBottom: 1.5,
            background: 'linear-gradient(135deg, #f3f4f6 30%, #9ca3af 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Valdens Chords
        </Typography>

        <Typography
          variant="body1"
          sx={{
            color: 'rgba(255, 255, 255, 0.55)',
            marginBottom: 4,
            fontSize: '0.95rem',
            lineHeight: 1.5,
          }}
        >
          Your premium Stage & Busking companion. Log in to access your curated interactive chord books, playlists, and real-time AI tools.
        </Typography>

        {error && (
          <Alert
            severity="error"
            variant="outlined"
            sx={{
              width: '100%',
              marginBottom: 3,
              borderRadius: 3,
              borderColor: 'rgba(211, 47, 47, 0.4)',
              color: '#ff8a80',
              backgroundColor: 'rgba(211, 47, 47, 0.05)',
              textAlign: 'left',
            }}
          >
            {error}
          </Alert>
        )}

        <Button
          fullWidth
          variant="contained"
          disabled={loading}
          onClick={handleLogin}
          sx={{
            backgroundColor: '#ffffff',
            color: '#1f2937',
            padding: '12px 24px',
            fontSize: '1rem',
            fontWeight: 600,
            borderRadius: '28px',
            display: 'flex',
            gap: 2,
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(255, 255, 255, 0.1)',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              backgroundColor: '#f3f4f6',
              transform: 'translateY(-2px)',
              boxShadow: '0 8px 20px rgba(255, 255, 255, 0.15)',
            },
            '&:active': {
              transform: 'translateY(0)',
            },
            '&.Mui-disabled': {
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              color: 'rgba(31, 41, 55, 0.5)',
            }
          }}
        >
          {loading ? (
            <CircularProgress size={24} sx={{ color: '#1f2937' }} />
          ) : (
            <>
              {/* Google official SVG logo */}
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.79 2.7v2.24h2.9c1.7-1.57 2.69-3.88 2.69-6.57z" fill="#4285F4" />
                <path d="M9 18c2.43 0 4.47-.8 5.96-2.23l-2.9-2.24c-.8.54-1.84.87-3.06.87-2.35 0-4.35-1.59-5.06-3.73H.95v2.3C2.43 16.42 5.48 18 9 18z" fill="#34A853" />
                <path d="M3.94 10.67c-.18-.54-.28-1.12-.28-1.72s.1-1.18.28-1.72V4.93H.95C.34 6.15 0 7.54 0 9s.34 2.85.95 4.07l2.99-2.4z" fill="#FBBC05" />
                <path d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.8 11.43 0 9 0 5.48 0 2.43 1.58.95 4.93l2.99 2.3c.71-2.14 2.71-3.73 5.06-3.73z" fill="#EA4335" />
              </svg>
              Sign in with Google
            </>
          )}
        </Button>
      </Paper>
    </Box>
  );
}
