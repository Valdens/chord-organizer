import React, { useEffect, useState } from 'react';
import { Container, Typography, Paper, Box, Avatar, Button, Stack, Chip, CircularProgress, IconButton, Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, useTheme, useMediaQuery } from '@mui/material';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import DeleteIcon from '@mui/icons-material/Delete';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import GroupIcon from '@mui/icons-material/Group';
import PersonIcon from '@mui/icons-material/Person';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { useNavigate } from 'react-router-dom';

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    // Real-time listener on the users collection ordered by creation date
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersList = [];
      snapshot.forEach(docSnap => {
        usersList.push({ id: docSnap.id, ...docSnap.data() });
      });
      setUsers(usersList);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError("Failed to load users: " + err.message);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleApprove = async (userId) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        status: 'approved'
      });
    } catch (e) {
      console.error(e);
      alert("Error approving user: " + e.message);
    }
  };

  const handleDeny = async (userId) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        status: 'pending'
      });
    } catch (e) {
      console.error(e);
      alert("Error revoking user: " + e.message);
    }
  };

  const handleDelete = async (userId, email) => {
    if (window.confirm(`Are you sure you want to permanently delete registration for ${email}?`)) {
      try {
        await deleteDoc(doc(db, 'users', userId));
      } catch (e) {
        console.error(e);
        alert("Error deleting user: " + e.message);
      }
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress color="primary" />
      </Box>
    );
  }

  const pendingUsers = users.filter(u => u.status === 'pending');
  const activeUsers = users.filter(u => u.status === 'approved' || u.role === 'admin');

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={1} mb={4}>
        <IconButton onClick={() => navigate(-1)} color="inherit">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" fontWeight="800" letterSpacing="-1px">
          Control Room
        </Typography>
        <Chip 
          icon={<AdminPanelSettingsIcon style={{ color: '#4ade80' }} />} 
          label="Administrator" 
          color="primary" 
          variant="outlined" 
          size="small" 
          sx={{ ml: 1, borderColor: '#4ade80', color: '#4ade80' }} 
        />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}

      {/* Pending Requests Section */}
      <Paper sx={{ p: 3, mb: 4, bgcolor: '#1a1d24', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 4 }}>
        <Box display="flex" alignItems="center" gap={1.5} mb={2}>
          <Avatar sx={{ bgcolor: 'rgba(255, 183, 77, 0.15)', color: '#ffb74d', width: 36, height: 36 }}>
            <HourglassEmptyIcon fontSize="small" />
          </Avatar>
          <Typography variant="h5" fontWeight="bold">
            Pending Approval Requests ({pendingUsers.length})
          </Typography>
        </Box>
        <Typography variant="body2" color="textSecondary" mb={3}>
          The following users have logged in via Google SSO and are locked out of the application until approved.
        </Typography>

        {pendingUsers.length === 0 ? (
          <Box p={4} textAlign="center" border="1px dashed rgba(255,255,255,0.1)" borderRadius={3} bgcolor="rgba(255,255,255,0.01)">
            <Typography variant="body1" color="textSecondary">No pending requests! Your application is fully processed.</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size={isMobile ? "small" : "medium"}>
              <TableHead>
                <TableRow sx={{ '& th': { borderColor: 'rgba(255,255,255,0.05)' } }}>
                  <TableCell>User Profile</TableCell>
                  {!isMobile && <TableCell>Email</TableCell>}
                  {!isMobile && <TableCell>Requested At</TableCell>}
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingUsers.map((u) => (
                  <TableRow key={u.id} sx={{ '& td': { borderColor: 'rgba(255,255,255,0.05)' }, '&:hover': { bgcolor: 'rgba(255,255,255,0.01)' } }}>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar src={u.photoURL} sx={{ width: 36, height: 36 }}>
                          {u.displayName ? u.displayName[0] : 'U'}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">{u.displayName || 'Unknown Name'}</Typography>
                          {isMobile && <Typography variant="caption" color="textSecondary" display="block">{u.email}</Typography>}
                        </Box>
                      </Stack>
                    </TableCell>
                    {!isMobile && <TableCell>{u.email}</TableCell>}
                    {!isMobile && <TableCell variant="caption">{u.createdAt?.seconds ? new Date(u.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}</TableCell>}
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          startIcon={<CheckCircleIcon />}
                          onClick={() => handleApprove(u.id)}
                          sx={{
                            bgcolor: '#4ade80',
                            color: '#000',
                            '&:hover': {
                              bgcolor: '#22c55e',
                              transform: 'scale(1.05)'
                            }
                          }}
                        >
                          Approve
                        </Button>
                        <IconButton color="error" size="small" onClick={() => handleDelete(u.id, u.email)} title="Permanently Delete Request">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Active Members Section */}
      <Paper sx={{ p: 3, bgcolor: '#1a1d24', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 4 }}>
        <Box display="flex" alignItems="center" gap={1.5} mb={2}>
          <Avatar sx={{ bgcolor: 'rgba(74, 222, 128, 0.15)', color: '#4ade80', width: 36, height: 36 }}>
            <GroupIcon fontSize="small" />
          </Avatar>
          <Typography variant="h5" fontWeight="bold">
            Approved Members & Admins ({activeUsers.length})
          </Typography>
        </Box>
        <Typography variant="body2" color="textSecondary" mb={3}>
          These accounts have unrestricted access to songs, playlists, and scraper endpoints.
        </Typography>

        <TableContainer>
          <Table size={isMobile ? "small" : "medium"}>
            <TableHead>
              <TableRow sx={{ '& th': { borderColor: 'rgba(255,255,255,0.05)' } }}>
                <TableCell>Member</TableCell>
                {!isMobile && <TableCell>Email</TableCell>}
                <TableCell>Role</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {activeUsers.map((u) => {
                const isSelf = u.email === 'supervaldens@gmail.com';
                const isAdminRole = u.role === 'admin';
                return (
                  <TableRow key={u.id} sx={{ '& td': { borderColor: 'rgba(255,255,255,0.05)' }, '&:hover': { bgcolor: 'rgba(255,255,255,0.01)' } }}>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar src={u.photoURL} sx={{ width: 36, height: 36 }}>
                          {u.displayName ? u.displayName[0] : 'U'}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">{u.displayName || 'Unknown Name'} {isSelf && " (You)"}</Typography>
                          {isMobile && <Typography variant="caption" color="textSecondary" display="block">{u.email}</Typography>}
                        </Box>
                      </Stack>
                    </TableCell>
                    {!isMobile && <TableCell>{u.email}</TableCell>}
                    <TableCell>
                      <Chip 
                        label={u.role?.toUpperCase() || 'USER'} 
                        size="small" 
                        color={isAdminRole ? "success" : "default"}
                        variant={isAdminRole ? "outlined" : "filled"}
                        icon={isAdminRole ? <AdminPanelSettingsIcon style={{ fontSize: 14 }} /> : <PersonIcon style={{ fontSize: 14 }} />}
                        sx={{ fontSize: 11, fontWeight: 'bold' }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {!isSelf && (
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button
                            variant="outlined"
                            color="warning"
                            size="small"
                            startIcon={<BlockIcon />}
                            onClick={() => handleDeny(u.id)}
                            sx={{
                              borderColor: 'rgba(255, 183, 77, 0.4)',
                              '&:hover': {
                                borderColor: 'warning.main',
                                bgcolor: 'rgba(255, 183, 77, 0.05)'
                              }
                            }}
                          >
                            Revoke
                          </Button>
                          <IconButton color="error" size="small" onClick={() => handleDelete(u.id, u.email)} title="Delete Member">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  );
}
