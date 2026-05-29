import React, { useState, useEffect, useRef } from 'react';
import { 
  Container, Typography, List, ListItem, ListItemText, 
  IconButton, Paper, Chip, Tabs, Tab, Box, TextField, InputAdornment, Button, CircularProgress, MenuItem
} from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import VisibilityIcon from '@mui/icons-material/Visibility';
import StarIcon from '@mui/icons-material/Star';
import SearchIcon from '@mui/icons-material/Search';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import { collection, query, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import axios from 'axios';

export default function Dashboard() {
  const location = useLocation();
  const [songs, setSongs] = useState([]);
  const [tab, setTab] = useState(3);
  const [search, setSearch] = useState(() => new URLSearchParams(location.search).get('q') || '');
  const [sortBy, setSortBy] = useState('artist');

  useEffect(() => {
    const queryTerm = new URLSearchParams(location.search).get('q');
    if (queryTerm !== null) setSearch(queryTerm);
  }, [location.search]);

  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState('');
  const migratingRef = useRef(false);

  useEffect(() => {
    const sortField = sortBy === 'createdAt' ? 'createdAt' : sortBy;
    const sortOrder = sortBy === 'createdAt' ? 'desc' : 'asc';
    const q = query(collection(db, 'songs'), orderBy(sortField, sortOrder));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSongs(docs);
    });
    return unsubscribe;
  }, [sortBy]);

  const toggleMigration = async () => {
    if (isMigrating) {
      setIsMigrating(false);
      migratingRef.current = false;
      setMigrationStatus('Migration stopped.');
      return;
    }

    setIsMigrating(true);
    migratingRef.current = true;
    
    // Find songs that don't have parsed chords yet but do have an external URL
    const unparsed = songs.filter(s => !s.parsedChords && s.externalUrl && !s.aiError);
    
    if (unparsed.length === 0) {
      setMigrationStatus('All songs are already parsed!');
      setIsMigrating(false);
      migratingRef.current = false;
      return;
    }

    setMigrationStatus(`Starting migration for ${unparsed.length} songs...`);

    for (let i = 0; i < unparsed.length; i++) {
      if (!migratingRef.current) break;
      const song = unparsed[i];
      setMigrationStatus(`[${i+1}/${unparsed.length}] Cleaning: ${song.title}`);

      try {
        await updateDoc(doc(db, 'songs', song.id), { 
          aiProcessing: true, 
          aiError: null 
        });
        const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
        const res = await axios.post("https://chord-scraper-607266476164.us-central1.run.app/clean", { id: song.id }, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (!res.data.success) {
           console.warn("Clean failed for", song.title, res.data.error);
        }
      } catch(e) {
        console.error("Migration request failed for", song.title, e);
        await updateDoc(doc(db, 'songs', song.id), { 
          aiProcessing: false,
          aiError: e.message || "Network Error during UI migration request" 
        });
      }
      
      // Wait 5 seconds between requests to respect scraper limits and prevent browser session thrashing
      if (i < unparsed.length - 1 && migratingRef.current) {
        setMigrationStatus(`[${i+1}/${unparsed.length}] Waiting 5s for container...`);
        await new Promise(r => setTimeout(r, 5000)); 
      }
    }
    
    if (migratingRef.current) {
      setIsMigrating(false);
      migratingRef.current = false;
      setMigrationStatus('Migration complete!');
    }
  };

  const filteredSongs = songs.filter(song => {
    const searchLower = search.toLowerCase();
    const matchesSearch = (song.title?.toLowerCase() || "").includes(searchLower) || 
                         (song.artist?.toLowerCase() || "").includes(searchLower) ||
                         (song.genre?.toLowerCase() || "").includes(searchLower);
    
    if (tab === 0) return matchesSearch && song.banger;
    if (tab === 1) return matchesSearch && song.status === 'Recorded';
    if (tab === 2) return matchesSearch && song.status !== 'Recorded';
    return matchesSearch;
  });



  const unparsedCount = songs.filter(s => !s.parsedChords && s.externalUrl && !s.aiError).length;
  const cleaningCount = songs.filter(s => s.aiProcessing === true).length;

  return (
    <Container maxWidth="md" sx={{ mt: 2, mb: 4 }}>
      
      {/* Background Migration Panel */}
      {unparsedCount > 0 && (
        <Paper elevation={1} sx={{ p: 2, mb: 3, bgcolor: 'background.paper', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #333' }}>
          <Box>
            <Typography variant="body1" fontWeight="bold">Background AI Importer</Typography>
            <Typography variant="body2" color="textSecondary">
              {unparsedCount} songs need chords imported and AI cleaned.
            </Typography>
            {migrationStatus && (
              <Typography variant="caption" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                {isMigrating && <CircularProgress size={12} />}
                {migrationStatus}
              </Typography>
            )}
          </Box>
          <Button 
            variant={isMigrating ? "outlined" : "contained"} 
            color={isMigrating ? "error" : "primary"}
            startIcon={isMigrating ? <StopIcon /> : <PlayArrowIcon />}
            onClick={toggleMigration}
          >
            {isMigrating ? 'Stop' : 'Start Auto-Sync'}
          </Button>
        </Paper>
      )}

      {/* Background AI Cleanup Panel */}
      {cleaningCount > 0 && (
        <Paper elevation={1} sx={{ p: 2, mb: 3, bgcolor: '#064e3b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #059669' }}>
          <Box>
            <Box display="flex" alignItems="center" gap={1}>
              <CircularProgress size={14} sx={{ color: '#fff' }} />
              <Typography variant="body1" fontWeight="bold">AI Cleanup Active</Typography>
            </Box>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {cleaningCount} song{cleaningCount > 1 ? 's' : ''} in the high-fidelity cleanup queue.
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              Worker processing in background...
            </Typography>
          </Box>
          <Chip label="Processing" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 'bold' }} />
        </Paper>
      )}

      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search title, artist, genre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
          }}
        />
        <TextField
          select
          size="small"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="title">Sort by Title</MenuItem>
          <MenuItem value="artist">Sort by Artist</MenuItem>
          <MenuItem value="createdAt">Sort by Newest</MenuItem>
        </TextField>
      </Box>

      <Paper square sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="fullWidth" indicatorColor="primary" textColor="primary" scrollButtons="auto" variant="scrollable">
          <Tab label="Bangers" />
          <Tab label="Recorded" />
          <Tab label="Unrecorded" />
          <Tab label="All" />
        </Tabs>
      </Paper>

      {/* Render Main List */}
      <Paper elevation={3} sx={{ overflow: 'hidden' }}>
        <List sx={{ p: 0 }}>
          {filteredSongs.map((song) => (
            <ListItem 
              key={song.id}
              divider
              sx={{ transition: 'all 0.2s', '&:hover': { backgroundColor: 'rgba(74, 222, 128, 0.08)', cursor: 'pointer' } }}
              secondaryAction={
                <IconButton edge="end" component={Link} to={`/song/${song.id}`}>
                  <VisibilityIcon />
                </IconButton>
              }
            >
              <ListItemText
                primary={
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {song.banger && <StarIcon color="warning" fontSize="small" />}
                    {song.title}
                  </span>
                }
                secondary={`${song.artist} • ${song.genre}`}
              />
              <Chip 
                label={song.status} 
                color={song.status === 'Recorded' ? "success" : "default"} 
                variant={song.status === 'Recorded' ? "filled" : "outlined"}
                size="small" 
                sx={{ mr: 2 }} 
              />
            </ListItem>
          ))}
          {filteredSongs.length === 0 && (
            <Box p={4} textAlign="center">
              <Typography color="textSecondary">No songs found in this view.</Typography>
            </Box>
          )}
        </List>
      </Paper>
    </Container>
  );
}
