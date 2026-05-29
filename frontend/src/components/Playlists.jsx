import React, { useState, useEffect } from 'react';
import { Container, Typography, List, ListItem, ListItemText, IconButton, Paper, Box, TextField, Button, CircularProgress } from '@mui/material';
import { Link } from 'react-router-dom';
import DeleteIcon from '@mui/icons-material/Delete';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import AddIcon from '@mui/icons-material/Add';
import { collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';

export default function Playlists() {
  const [playlists, setPlaylists] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'playlists'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPlaylists(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await addDoc(collection(db, 'playlists'), {
      name: newTitle,
      songIds: [],
      createdAt: serverTimestamp()
    });
    setNewTitle('');
  };

  const handleDelete = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("Delete this playlist?")) {
      await deleteDoc(doc(db, 'playlists', id));
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" mt={10}><CircularProgress /></Box>;

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Playlists</Typography>
      <Paper sx={{ p: 2, mb: 4 }}>
        <Box component="form" onSubmit={handleCreate} display="flex" gap={2}>
          <TextField 
            fullWidth 
            size="small" 
            placeholder="New Playlist Name..." 
            value={newTitle} 
            onChange={(e) => setNewTitle(e.target.value)} 
          />
          <Button type="submit" variant="contained" disabled={!newTitle.trim()} startIcon={<AddIcon />}>
            Create
          </Button>
        </Box>
      </Paper>

      <Paper elevation={3}>
        <List sx={{ p: 0 }}>
          {playlists.map((playlist) => (
            <ListItem 
              key={playlist.id} 
              divider 
              component={Link} 
              to={`/playlist/${playlist.id}`}
              sx={{ transition: 'all 0.2s', color: 'inherit', textDecoration: 'none', '&:hover': { backgroundColor: 'rgba(74, 222, 128, 0.08)', cursor: 'pointer' } }}
              secondaryAction={
                <IconButton edge="end" color="error" onClick={(e) => handleDelete(playlist.id, e)}>
                  <DeleteIcon />
                </IconButton>
              }
            >
              <QueueMusicIcon sx={{ mr: 2, color: 'text.secondary' }} />
              <ListItemText 
                primary={<Typography variant="body1" color="textPrimary">{playlist.name}</Typography>} 
                secondary={`${playlist.songIds?.length || 0} songs`} 
              />
            </ListItem>
          ))}
          {playlists.length === 0 && (
            <Box p={4} textAlign="center">
              <Typography color="textSecondary">No playlists yet.</Typography>
            </Box>
          )}
        </List>
      </Paper>
    </Container>
  );
}
