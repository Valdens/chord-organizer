import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Paper, Button, Box, CircularProgress
} from '@mui/material';
import { collection, query, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import axios from 'axios';

export default function Migration() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'songs'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSongs(docs);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const startSync = async () => {
    setIsSyncing(true);
    const unparsed = songs.filter(s => !s.aiCleaned && s.externalUrl);
    
    setLogs(prev => [`Starting real-time AI clean for ${unparsed.length} songs...`, ...prev]);

    for (let i = 0; i < unparsed.length; i++) {
      const song = unparsed[i];
      setLogs(prev => [`[${i + 1}/${unparsed.length}] Triggering clean for: ${song.title}`, ...prev]);
      
      try {
        await updateDoc(doc(db, 'songs', song.id), { 
          aiProcessing: true,
          aiError: null
        });
        
        const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
        const res = await axios.post("https://chord-scraper-607266476164.us-central1.run.app/clean", { id: song.id }, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        
        if (res.data.success) {
          setLogs(prev => [`  -> SUCCESS: ${song.title}`, ...prev]);
        } else {
          setLogs(prev => [`  !! FAILED: ${song.title} (${res.data.error || 'Unknown error'})`, ...prev]);
          await updateDoc(doc(db, 'songs', song.id), { aiProcessing: false, aiError: res.data.error || 'Scraper failed' });
        }
      } catch (e) {
        setLogs(prev => [`  !! NETWORK ERROR: ${song.title} (${e.message})`, ...prev]);
        await updateDoc(doc(db, 'songs', song.id), { aiProcessing: false, aiError: e.message });
      }
      
      // Short delay to avoid API throttling
      await new Promise(r => setTimeout(r, 2000));
    }
    setIsSyncing(false);
    setLogs(prev => [`--- BULK SYNC COMPLETE ---`, ...prev]);
  };

  if (loading) return <Box p={4} textAlign="center"><CircularProgress /></Box>;

  const unparsedCount = songs.filter(s => !s.aiCleaned && s.externalUrl).length;

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>Big Boy Sync Engine</Typography>
      <Typography variant="body1" color="textSecondary" mb={4}>
        This tool automates a bulk synchronization pass across your library, triggering the serverless high-fidelity Gemini AI engraving engine in parallel to format and clean all pending songs instantly.
      </Typography>

      <Paper sx={{ p: 3, mb: 4, bgcolor: 'background.paper', border: '1px solid #333' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{unparsedCount} Songs remaining to fix</Typography>
          <Button variant="contained" color="primary" onClick={startSync} disabled={isSyncing || unparsedCount === 0}>
            {isSyncing ? 'Processing AI Clean...' : 'Queue All for AI Clean'}
          </Button>
        </Box>
      </Paper>

      <Typography variant="h6" gutterBottom>Queue Logs</Typography>
      <Paper variant="outlined" sx={{ p: 2, height: 300, overflowY: 'auto', bgcolor: '#000', fontFamily: 'monospace' }}>
        {logs.map((log, i) => (
          <Typography key={i} variant="caption" display="block" sx={{ color: log.includes('!!') ? '#f87171' : log.includes('SUCCESS') ? '#4ade80' : '#e2e8f0' }}>
            {log}
          </Typography>
        ))}
      </Paper>
    </Container>
  );
}
