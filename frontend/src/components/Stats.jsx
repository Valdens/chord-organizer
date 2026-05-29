import React, { useState, useEffect } from 'react';
import { Container, Typography, Paper, Box, CircularProgress, Grid } from '@mui/material';
import { collection, getDocs } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '../firebase';

export default function Stats() {
  const [data, setData] = useState({ genres: {}, total: 0, cleaned: 0, unparsed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const snapshot = await getDocs(collection(db, 'songs'));
      const stats = { genres: {}, total: 0, cleaned: 0, unparsed: 0 };
      
      snapshot.forEach(doc => {
        const d = doc.data();
        stats.total++;
        if (d.aiCleaned) stats.cleaned++;
        if (!d.parsedChords && d.externalUrl && !d.aiError) stats.unparsed++;
        
        const genre = d.genre || 'Unknown';
        stats.genres[genre] = (stats.genres[genre] || 0) + 1;
      });
      
      setData(stats);
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) return <Box display="flex" justifyContent="center" mt={10}><CircularProgress /></Box>;

  const sortedGenres = Object.entries(data.genres).sort((a, b) => b[1] - a[1]);
  const maxCount = Math.max(...Object.values(data.genres));

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Library Overview</Typography>
      
      <Grid container spacing={3} mb={4}>
        <Grid item xs={4}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'background.paper' }}>
            <Typography variant="h4" color="primary">{data.total}</Typography>
            <Typography variant="caption">Total Songs</Typography>
          </Paper>
        </Grid>
        <Grid item xs={4}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'background.paper' }}>
            <Typography variant="h4" sx={{ color: '#4caf50' }}>{data.cleaned}</Typography>
            <Typography variant="caption">AI Cleaned</Typography>
          </Paper>
        </Grid>
        <Grid item xs={4}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'background.paper' }}>
            <Typography variant="h4" sx={{ color: '#ff9800' }}>{data.unparsed}</Typography>
            <Typography variant="caption">Need Import</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Typography variant="h6" color="textSecondary" gutterBottom>Songs by Genre</Typography>
      <Paper elevation={3} sx={{ p: 3 }}>
        {sortedGenres.map(([genre, count]) => (
          <Box key={genre} mb={2} component={Link} to={`/?q=${encodeURIComponent(genre)}`} sx={{ display: 'block', textDecoration: 'none', color: 'inherit', '&:hover': { opacity: 0.8 } }}>
            <Box display="flex" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2">{genre}</Typography>
              <Typography variant="body2" fontWeight="bold">{count}</Typography>
            </Box>
            <Box sx={{ height: 8, bgcolor: '#333', borderRadius: 4, overflow: 'hidden' }}>
              <Box sx={{ height: '100%', width: `${(count / maxCount) * 100}%`, bgcolor: 'primary.main' }} />
            </Box>
          </Box>
        ))}
      </Paper>
    </Container>
  );
}
