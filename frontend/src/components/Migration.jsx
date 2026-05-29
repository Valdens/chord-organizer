import React, { useState, useEffect, useRef } from 'react';
import { 
  Container, Typography, Paper, Button, Box, CircularProgress, LinearProgress
} from '@mui/material';
import { collection, query, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

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
    
    setLogs(prev => [`Starting sync for ${unparsed.length} songs...`, ...prev]);

    for (let i = 0; i < unparsed.length; i++) {
      const song = unparsed[i];
      // Simply mark for processing - the terminal worker handles the rest!
      await updateDoc(doc(db, 'songs', song.id), { aiProcessing: true });
      
      setLogs(prev => [`Requested sync for: ${song.title}`, ...prev]);
      
      // Wait a bit between requests to let the worker breathe
      await new Promise(r => setTimeout(r, 2000));
    }
    setIsSyncing(false);
    setLogs(prev => [`--- REQUESTS COMPLETE ---`, ...prev]);
  };

  if (loading) return <Box p={4} textAlign="center"><CircularProgress /></Box>;

  const unparsedCount = songs.filter(s => !s.aiCleaned && s.externalUrl).length;

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>Big Boy Sync Engine</Typography>
      <Typography variant="body1" color="textSecondary" mb={4}>
        This tool marks your songs for the <b>Terminal AI Worker</b> to fix. 
        Once you click start, open your Cloud Shell terminal and run the worker command I gave you!
      </Typography>

      <Paper sx={{ p: 3, mb: 4, bgcolor: 'background.paper', border: '1px solid #333' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{unparsedCount} Songs remaining to fix</Typography>
          <Button variant="contained" color="primary" onClick={startSync} disabled={isSyncing || unparsedCount === 0}>
            {isSyncing ? 'Marking Songs...' : 'Queue All for AI Clean'}
          </Button>
        </Box>
      </Paper>

      <Typography variant="h6" gutterBottom>Queue Logs</Typography>
      <Paper variant="outlined" sx={{ p: 2, height: 300, overflowY: 'auto', bgcolor: '#000', fontFamily: 'monospace' }}>
        {logs.map((log, i) => (
          <Typography key={i} variant="caption" display="block">{log}</Typography>
        ))}
      </Paper>
    </Container>
  );
}
