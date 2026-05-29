import React from 'react';
import { Container, Typography, Button, Box, Paper, Avatar, useTheme, Alert } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function PendingApproval() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 10% 20%, rgba(15, 17, 21, 1) 0%, rgba(26, 29, 36, 1) 90%)',
        p: 2,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Decorative Background Glows */}
      <Box
        sx={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'rgba(74, 222, 128, 0.03)',
          filter: 'blur(80px)',
          top: '-10%',
          right: '-10%',
          zIndex: 0
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'rgba(124, 58, 237, 0.03)',
          filter: 'blur(100px)',
          bottom: '-10%',
          left: '-10%',
          zIndex: 0
        }}
      />

      <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
        <Paper
          elevation={24}
          sx={{
            p: 4,
            borderRadius: 6,
            background: 'rgba(26, 29, 36, 0.8)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            textAlign: 'center',
            boxShadow: '0 24px 64px rgba(0,0,0,0.4)'
          }}
        >
          {/* Animated Hourglass / Pulsing ring */}
          <Box
            sx={{
              display: 'inline-flex',
              position: 'relative',
              mb: 3,
              '&::before': {
                content: '""',
                position: 'absolute',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                border: '3px solid #ffb74d',
                animation: 'pulse 2s infinite ease-in-out',
                opacity: 0.5
              },
              '@keyframes pulse': {
                '0%': { transform: 'scale(1)', opacity: 0.6 },
                '50%': { transform: 'scale(1.2)', opacity: 0.1 },
                '100%': { transform: 'scale(1)', opacity: 0.6 }
              }
            }}
          >
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: 'rgba(255, 183, 77, 0.15)',
                color: '#ffb74d'
              }}
            >
              <HourglassEmptyIcon sx={{ fontSize: 40 }} />
            </Avatar>
          </Box>

          <Typography variant="h4" fontWeight="800" letterSpacing="-1px" gutterBottom>
            Access Pending Approval
          </Typography>

          <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4, lineHeight: 1.6 }}>
            Welcome, <strong style={{ color: '#fff' }}>{user?.displayName || 'Musician'}</strong>! Your account request has been successfully submitted. An administrator will review your access request shortly.
          </Typography>

          {user && (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                mb: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                borderRadius: 4,
                bgcolor: 'rgba(255,255,255,0.02)',
                borderColor: 'rgba(255,255,255,0.05)',
                textAlign: 'left'
              }}
            >
              <Avatar src={user.photoURL} alt={user.displayName || 'Avatar'} sx={{ width: 44, height: 44 }}>
                {user.displayName ? user.displayName[0] : 'U'}
              </Avatar>
              <Box>
                <Typography variant="subtitle2" fontWeight="bold">
                  {user.displayName || 'Active Account'}
                </Typography>
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', wordBreak: 'break-all' }}>
                  {user.email}
                </Typography>
              </Box>
            </Paper>
          )}

          <Alert 
            severity="info" 
            sx={{ 
              mb: 4, 
              textAlign: 'left',
              borderRadius: 3, 
              border: '1px solid rgba(2, 136, 209, 0.2)',
              bgcolor: 'rgba(2, 136, 209, 0.05)'
            }}
          >
            Access is automatically unlocked in real-time as soon as your account is approved. No browser refresh is required!
          </Alert>

          <Button
            variant="outlined"
            color="error"
            onClick={handleLogout}
            startIcon={<LogoutIcon />}
            sx={{
              borderRadius: '24px',
              px: 4,
              borderColor: 'rgba(244, 67, 54, 0.4)',
              '&:hover': {
                borderColor: 'error.main',
                bgcolor: 'rgba(244, 67, 54, 0.05)',
                transform: 'none',
                boxShadow: 'none'
              }
            }}
          >
            Sign Out of Account
          </Button>
        </Paper>
      </Container>
    </Box>
  );
}
