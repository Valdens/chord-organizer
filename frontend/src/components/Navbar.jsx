import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Typography, Button, IconButton, Box, Menu, MenuItem, useTheme, useMediaQuery, Avatar, Divider, Snackbar, Alert, AlertTitle } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import BarChartIcon from '@mui/icons-material/BarChart';
import SyncIcon from '@mui/icons-material/Sync';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import CasinoIcon from '@mui/icons-material/Casino';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { collection, getDocs, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, logout, userRole } = useAuth();
  const [loadingRandom, setLoadingRandom] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [userAnchorEl, setUserAnchorEl] = useState(null);
  const [newRequestToast, setNewRequestToast] = useState(null);

  useEffect(() => {
    if (userRole !== 'admin') return;

    // Listen to users collection for status == 'pending'
    const q = query(collection(db, 'users'), where('status', '==', 'pending'));
    const startTime = Date.now();

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const newUser = { id: change.doc.id, ...change.doc.data() };
          // Only show toast notifications for users created after the session started
          const createdAtMs = newUser.createdAt?.seconds ? newUser.createdAt.seconds * 1000 : Date.now();
          if (createdAtMs > startTime - 5000) {
            setNewRequestToast(newUser);
          }
        }
      });
    });

    return unsubscribe;
  }, [userRole]);

  const handleApproveFromToast = async () => {
    if (!newRequestToast) return;
    try {
      await updateDoc(doc(db, 'users', newRequestToast.id), { status: 'approved' });
      setNewRequestToast(null);
    } catch (e) {
      console.error("Error approving from toast:", e);
    }
  };

  const handleRandom = async () => {
    setLoadingRandom(true);
    try {
      const snap = await getDocs(collection(db, 'songs'));
      const docs = snap.docs;
      const randomDoc = docs[Math.floor(Math.random() * docs.length)];
      if (randomDoc) {
        setAnchorEl(null);
        navigate(`/song/${randomDoc.id}`);
      }
    } catch(e) {
      console.error(e);
    }
    setLoadingRandom(false);
  };

  const handleLogout = async () => {
    setUserAnchorEl(null);
    try {
      await logout();
      navigate('/');
    } catch(e) {
      console.error("Logout error:", e);
    }
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <IconButton edge="start" color="inherit" component={Link} to="/" sx={{ mr: 2 }}>
          <HomeIcon />
        </IconButton>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, textAlign: 'left' }}>
          {isMobile ? "Valdens Chords" : "Valdens Chord Organizer"}
        </Typography>

        {isMobile ? (
          <Box display="flex" gap={0.5} alignItems="center">
            <IconButton color="inherit" onClick={handleRandom} disabled={loadingRandom}><CasinoIcon /></IconButton>
            <IconButton color="inherit" onClick={e => setAnchorEl(e.currentTarget)}><MenuIcon /></IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
              <MenuItem component={Link} to="/add" onClick={() => setAnchorEl(null)}><AddCircleIcon sx={{mr:1, color: 'text.secondary'}}/> Add Song</MenuItem>
              <MenuItem component={Link} to="/playlists" onClick={() => setAnchorEl(null)}><QueueMusicIcon sx={{mr:1, color: 'text.secondary'}}/> Playlists</MenuItem>
              <MenuItem component={Link} to="/stats" onClick={() => setAnchorEl(null)}><BarChartIcon sx={{mr:1, color: 'text.secondary'}}/> Stats</MenuItem>
              <MenuItem component={Link} to="/migrate" onClick={() => setAnchorEl(null)}><SyncIcon sx={{mr:1, color: 'text.secondary'}}/> Sync</MenuItem>
            </Menu>
            <IconButton onClick={e => setUserAnchorEl(e.currentTarget)} sx={{ ml: 0.5, p: 0.5 }}>
              <Avatar 
                src={user?.photoURL} 
                alt={user?.displayName || 'User'} 
                sx={{ width: 32, height: 32, border: '1.5px solid rgba(74, 222, 128, 0.4)' }}
              >
                {user?.displayName ? user.displayName[0] : (user?.email ? user.email[0].toUpperCase() : 'U')}
              </Avatar>
            </IconButton>
          </Box>
        ) : (
          <Box display="flex" gap={1} alignItems="center">
            <Button color="inherit" onClick={handleRandom} disabled={loadingRandom} startIcon={<CasinoIcon />}>
              Random
            </Button>
            <Button color="inherit" component={Link} to="/migrate" startIcon={<SyncIcon />}>
              Sync
            </Button>
            <Button color="inherit" component={Link} to="/playlists" startIcon={<QueueMusicIcon />}>
              Playlists
            </Button>
            <Button color="inherit" component={Link} to="/stats" startIcon={<BarChartIcon />}>
              Stats
            </Button>
            <Button color="inherit" component={Link} to="/add" startIcon={<AddCircleIcon />}>
              Add Song
            </Button>
            <IconButton onClick={e => setUserAnchorEl(e.currentTarget)} sx={{ ml: 1, p: 0.5 }}>
              <Avatar 
                src={user?.photoURL} 
                alt={user?.displayName || 'User'} 
                sx={{ width: 36, height: 36, border: '2px solid rgba(74, 222, 128, 0.4)' }}
              >
                {user?.displayName ? user.displayName[0] : (user?.email ? user.email[0].toUpperCase() : 'U')}
              </Avatar>
            </IconButton>
          </Box>
        )}

        {/* Profile Dropdown Menu */}
        <Menu
          anchorEl={userAnchorEl}
          open={Boolean(userAnchorEl)}
          onClose={() => setUserAnchorEl(null)}
          PaperProps={{
            sx: {
              mt: 1.5,
              minWidth: 200,
              background: 'rgba(26, 29, 36, 0.95)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              borderRadius: 3,
            }
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <Box sx={{ px: 2, py: 1.5, textAlign: 'left' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
              {user?.displayName || 'Active User'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              {user?.email || ''}
            </Typography>
          </Box>
          <Divider sx={{ my: 0.5, borderColor: 'rgba(255, 255, 255, 0.08)' }} />
          {userRole === 'admin' && (
            <MenuItem component={Link} to="/admin" onClick={() => setUserAnchorEl(null)} sx={{ py: 1, color: '#4ade80' }}>
              <AdminPanelSettingsIcon sx={{ mr: 1.5, fontSize: 20 }} />
              Admin Panel
            </MenuItem>
          )}
          <MenuItem onClick={handleLogout} sx={{ py: 1, color: '#ff8a80' }}>
            <LogoutIcon sx={{ mr: 1.5, fontSize: 20 }} />
            Sign Out
          </MenuItem>
        </Menu>
      </Toolbar>
      {/* Toast Notification for Admins */}
      <Snackbar
        open={Boolean(newRequestToast)}
        autoHideDuration={8000}
        onClose={() => setNewRequestToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        sx={{ zIndex: 9999 }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setNewRequestToast(null)}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={handleApproveFromToast} 
              sx={{ 
                fontWeight: 'bold', 
                color: '#0f1115', 
                bgcolor: '#4ade80', 
                borderRadius: '16px', 
                px: 2,
                '&:hover': { bgcolor: '#22c55e' } 
              }}
            >
              Approve
            </Button>
          }
          sx={{
            bgcolor: '#1a1d24',
            color: '#fff',
            border: '1.5px solid #4ade80',
            boxShadow: '0 8px 32px rgba(74, 222, 128, 0.15)',
            borderRadius: '16px',
            alignItems: 'center',
            '& .MuiAlert-icon': {
              color: '#4ade80'
            }
          }}
        >
          <AlertTitle style={{ fontWeight: 'bold', color: '#4ade80', margin: 0, marginBottom: '2px' }}>Access Requested</AlertTitle>
          <Typography variant="body2" sx={{ fontSize: 13, opacity: 0.9 }}>
            {newRequestToast?.displayName || 'A new user'} is requesting access.
          </Typography>
        </Alert>
      </Snackbar>
    </AppBar>
  );
}
