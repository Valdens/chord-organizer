import React, { useState, useEffect } from 'react';
import { Container, Typography, List, ListItem, ListItemText, IconButton, Paper, Box, CircularProgress } from '@mui/material';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import StarIcon from '@mui/icons-material/Star';
import { doc, onSnapshot, getDocs, collection, updateDoc, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';

export default function PlaylistView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState(null);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubPlaylist = onSnapshot(doc(db, 'playlists', id), async (docSnap) => {
      if (docSnap.exists()) {
        const pData = { id: docSnap.id, ...docSnap.data() };
        setPlaylist(pData);
        
        const songsSnap = await getDocs(collection(db, 'songs'));
        const allSongs = songsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        const matchedSongs = (pData.songIds || [])
          .map(songId => allSongs.find(s => s.id === songId))
          .filter(Boolean);
          
        setSongs(matchedSongs);
      }
      setLoading(false);
    });
    return unsubPlaylist;
  }, [id]);

  const handleRemove = async (songId, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("Remove this song from the playlist?")) {
      await updateDoc(doc(db, 'playlists', id), {
        songIds: arrayRemove(songId)
      });
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" mt={10}><CircularProgress /></Box>;
  if (!playlist) return <Typography p={4}>Playlist not found.</Typography>;

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <IconButton onClick={() => navigate('/playlists')} color="inherit"><ArrowBackIcon /></IconButton>
        <Typography variant="h4">{playlist.name}</Typography>
      </Box>

      <Paper elevation={3} sx={{ overflow: 'hidden' }}>
        <List sx={{ p: 0 }}>
          {songs.map((song, index) => (
            <ListItem key={`${song.id}-${index}`} divider sx={{ transition: 'all 0.2s', '&:hover': { backgroundColor: 'rgba(74, 222, 128, 0.08)' } }}>
              <Typography variant="body2" color="textSecondary" sx={{ mr: 2, width: '20px' }}>{index + 1}.</Typography>
              <ListItemText 
                primary={
                   <Box display="flex" alignItems="center" gap={1}>
                     {song.banger && <StarIcon color="warning" fontSize="small" />}
                     {song.title}
                   </Box>
                } 
                secondary={`${song.artist} • ${song.genre}`} 
              />
              <IconButton component={Link} to={`/song/${song.id}`} sx={{ mr: 1 }} color="primary">
                <VisibilityIcon />
              </IconButton>
              <IconButton color="error" onClick={(e) => handleRemove(song.id, e)}>
                <DeleteIcon />
              </IconButton>
            </ListItem>
          ))}
          {songs.length === 0 && (
            <Box p={4} textAlign="center">
              <Typography color="textSecondary">No songs in this playlist.</Typography>
            </Box>
          )}
        </List>
      </Paper>
    </Container>
  );
}
