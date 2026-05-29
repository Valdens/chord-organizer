import React, { useState } from 'react';
import { Container, Typography, TextField, Button, Box, CircularProgress, Alert } from '@mui/material';
import axios from 'axios';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

function standardizeGenre(genreStr) {
  if (!genreStr) return 'Misc / Unknown';
  const g = genreStr.toLowerCase().trim();
  const mapping = [
    { master: 'Disney', keywords: ['disney'] },
    { master: 'Video Games', keywords: ['video game', 'video games'] },
    { master: 'Folk & Indie', keywords: ['folk', 'indie'] },
    { master: 'Rock', keywords: ['metal', 'punk', 'rock', 'blues', 'progressive', 'hard rock', 'glam', 'roll', 'soft rock', 'new wave'] },
    { master: 'Pop', keywords: ['pop', 'disco', 'funk', 'synth-pop', 'synthpop', 'dance', 'ballad'] },
    { master: 'Soundtrack', keywords: ['soundtrack', 'musical', 'anime', 'theatre', 'show tune', 'score', 'tv', 'animation'] },
    { master: 'Standards & Jazz', keywords: ['standards', 'jazz', 'oldies', 'traditional', 'vocal', 'big band', 'standard', 'doo-wop'] },
    { master: 'Soul, R&B & Hip-Hop', keywords: ['soul', 'r&b', 'hip-hop', 'hip hop', 'rap'] },
    { master: 'Country', keywords: ['country'] },
    { master: 'Comedy & Novelty', keywords: ['comedy', 'novelty', 'parody'] },
    { master: 'Children', keywords: ['children'] },
    { master: 'Christmas & Holiday', keywords: ['christmas', 'holiday'] },
    { master: 'Electronic', keywords: ['electronic', 'edm', 'house'] },
    { master: 'Religious & Patriotic', keywords: ['praise', 'patriotic', 'church', 'christian'] },
  ];
  for (const map of mapping) {
    for (const kw of map.keywords) {
      if (g.includes(kw)) return map.master;
    }
  }
  return 'Misc / Unknown';
}

function cleanTitle(title) {
  if (!title) return title;
  let cleaned = title.trim();
  cleaned = cleaned.replace(/\s+\d{4,9}$/, '');
  const contractions = {
    '\\bShes\\b': "She's", '\\bHes\\b': "He's", '\\bIm\\b': "I'm", '\\bTheres\\b': "There's",
    '\\bDont\\b': "Don't", '\\bCant\\b': "Can't", '\\bWont\\b': "Won't", '\\bIsnt\\b': "Isn't",
    '\\bArent\\b': "Aren't", '\\bYoure\\b': "You're", '\\bTheyre\\b': "They're", '\\bWeve\\b': "We've",
    '\\bIve\\b': "I've", '\\bYouve\\b': "You've", '\\bId\\b': "I'd", '\\bAint\\b': "Ain't"
  };
  for (const [pattern, replacement] of Object.entries(contractions)) {
      cleaned = cleaned.replace(new RegExp(pattern, 'ig'), (match) => {
          if (match[0] === match[0].toLowerCase()) return replacement.toLowerCase();
          return replacement;
      });
  }
  cleaned = cleaned.replace(/\s+Chords$/i, '').replace(/\s+Tabs$/i, '');
  cleaned = cleaned.replace(/\s+Acoustic$/i, ' (Acoustic)');
  return cleaned.trim();
}

export default function AddSong() {
  const [urlsInput, setUrlsInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setProgressMsg('');

    const urls = urlsInput.split(/\r?\n|,/).map(u => u.trim()).filter(Boolean);
    if (urls.length === 0) {
      setError("Please provide at least one URL.");
      setLoading(false);
      return;
    }

    try {
      let successCount = 0;
      let lastDocId = null;

      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        if (urls.length > 1) {
          setProgressMsg(`Processing ${i + 1} of ${urls.length}...`);
        }

        console.log("Adding song shell to Firestore...");
        const parsedChords = "";
        const titleData = url.split('/').pop().replace(/-/g, ' '); 
        const artistData = "Unknown Artist";
        const genreData = "Unknown Genre";

        console.log("Saving to Firestore...");
        const finalGenre = standardizeGenre(artistData === "Unknown Artist" ? "" : genreData);
        
        const songData = {
          title: cleanTitle(titleData),
          artist: artistData,
          genre: finalGenre,
          tags: genreData && genreData !== finalGenre ? [genreData] : [],
          externalUrl: url,
          parsedChords: parsedChords,
          status: "Unrecorded",
          banger: false,
          createdAt: serverTimestamp(),
          aiProcessing: parsedChords ? false : true,
          aiError: null,
          lastPriorityRequest: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, 'songs'), songData);
        lastDocId = docRef.id;
        successCount++;
        
        // If initial scrape was empty, trigger the serverless Cloud Run Scraper instantly in the background
        if (!parsedChords) {
          console.log("Triggering serverless Cloud Run Scraper for new song:", docRef.id);
          const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
          axios.post("https://chord-scraper-607266476164.us-central1.run.app/clean", { id: docRef.id }, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          }).catch(e => console.warn("Cloud Run background scraper trigger failed for:", docRef.id, e));
        }
        
        if (urls.length > 1 && i < urls.length - 1) {
            await new Promise(r => setTimeout(r, 2000));
        }
      }
      
      setUrlsInput('');
      if (urls.length === 1 && lastDocId) {
        setSuccess("Song added successfully! Redirecting...");
        setTimeout(() => { navigate(`/song/${lastDocId}`); }, 1500);
      } else {
        setSuccess(`Successfully added ${successCount} songs to your library.`);
      }

    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
      setProgressMsg('');
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Add New Song</Typography>
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
        <TextField fullWidth label="Song URLs (One per line)" variant="outlined" multiline minRows={3} placeholder="https://tabs.ultimate-guitar.com/..." value={urlsInput} onChange={(e) => setUrlsInput(e.target.value)} disabled={loading} sx={{ mb: 2 }} />
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        <Button type="submit" variant="contained" color="primary" fullWidth disabled={loading || !urlsInput.trim()} startIcon={loading && <CircularProgress size={20} />}>
          {loading ? (progressMsg || 'Processing...') : 'Process Links'}
        </Button>
      </Box>
    </Container>
  );
}
