import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, IconButton, Paper,
  CircularProgress, Chip, Button, Slider, Stack, Switch, FormControlLabel,
  useMediaQuery, useTheme, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  List as MuiList, ListItem as MuiListItem, ListItemText as MuiListItemText, Alert, Avatar
} from '@mui/material';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import LinkIcon from '@mui/icons-material/Link';
import { doc, updateDoc, onSnapshot, getDocs, collection, arrayUnion, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { transposeText, isChord, isChordLine } from '../utils/transposer';
import axios from 'axios';

export default function SongViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transposeSteps, setTransposeSteps] = useState(0);
  const [fontSize, setFontSize] = useState(isMobile ? 14 : 18);
  const [lineHeight, setLineHeight] = useState(1.4);
  const [smartWrap, setSmartWrap] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ title: '', artist: '', genre: '', status: 'Unrecorded', banger: false, parsedChords: '' });

  // Playlist states
  const [playlists, setPlaylists] = useState([]);
  const [playlistDialogOpen, setPlaylistDialogOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const handleOpenPlaylists = async () => {
    setPlaylistDialogOpen(true);
    const snap = await getDocs(collection(db, 'playlists'));
    setPlaylists(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const handleAddToPlaylist = async (playlistId) => {
    await updateDoc(doc(db, 'playlists', playlistId), {
      songIds: arrayUnion(song.id)
    });
    setPlaylistDialogOpen(false);
  };

  const handleCreateAndAdd = async () => {
    if (!newPlaylistName.trim()) return;
    await addDoc(collection(db, 'playlists'), {
      name: newPlaylistName,
      songIds: [song.id],
      createdAt: serverTimestamp()
    });
    setPlaylistDialogOpen(false);
    setNewPlaylistName('');
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'songs', id), (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() };
        setSong(data);
        if (!isEditing) {
          setEditData({ title: data.title, artist: data.artist, genre: data.genre, status: data.status || 'Unrecorded', banger: data.banger || false, parsedChords: data.parsedChords || "" });
        }
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [id, isEditing]);

  const requestAiClean = async () => {
    console.log("Triggering AI Priority Clean for:", id);
    await updateDoc(doc(db, 'songs', id), {
      aiProcessing: true,
      aiError: null,
      lastPriorityRequest: serverTimestamp()
    });
    
    // Trigger the serverless Google Cloud Run Scraper instantly in the background
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
    axios.post("https://chord-scraper-607266476164.us-central1.run.app/clean", { id: id }, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }).catch(e => console.error("Cloud Run trigger clean error:", e));
  };

  const toggleBanger = async () => {
    await updateDoc(doc(db, 'songs', id), { banger: !song.banger });
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) document.documentElement.requestFullscreen().catch(() => { });
    else document.exitFullscreen().catch(() => { });
    setIsFullscreen(!isFullscreen);
  };

  const handleTransposeUp = () => setTransposeSteps(prev => prev + 1);
  const handleTransposeDown = () => setTransposeSteps(prev => prev - 1);

  const handleSave = async () => {
    await updateDoc(doc(db, 'songs', id), {
      title: editData.title,
      artist: editData.artist,
      genre: editData.genre,
      status: editData.status,
      banger: editData.banger,
      parsedChords: editData.parsedChords
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to permanently delete this song?")) {
      await deleteDoc(doc(db, 'songs', id));
      navigate(-1);
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" mt={10}><CircularProgress /></Box>;
  if (!song) return <Typography p={4}>Song not found.</Typography>;

  const rawText = song.parsedChords || "";
  const transposedTextContent = transposeText(rawText, transposeSteps);

  const renderFormattedText = () => {
    if (!transposedTextContent) return "No content found.";

    if (!smartWrap) {
      return transposedTextContent.split('\n').map((line, lineIdx) => {
        const tokens = line.split(/(\s+)/);
        return (
          <div key={lineIdx} style={{ minHeight: '1em' }}>
            {tokens.map((token, tokenIdx) => {
              const cleanToken = token.trim();
              if (cleanToken && isChord(cleanToken)) {
                return <span key={tokenIdx} style={{ color: '#4caf50', fontWeight: 'bold' }}>{token}</span>;
              }
              return <span key={tokenIdx}>{token}</span>;
            })}
          </div>
        );
      });
    }

    const maxChars = isMobile ? 38 : 85;
    const lines = transposedTextContent.split('\n');
    const result = [];

    for (let i = 0; i < lines.length; i++) {
      let isChordLineOnly = isChordLine(lines[i]);
      let isNextLyric = i + 1 < lines.length && !isChordLine(lines[i + 1]) && lines[i + 1].trim() !== '';

      if (isChordLineOnly && isNextLyric) {
        let cLine = lines[i];
        let lLine = lines[i + 1];
        i++;
        let currentIdx = 0;
        const maxLen = Math.max(cLine.length, lLine.length);
        while (currentIdx < maxLen) {
          let endIdx = currentIdx + maxChars;
          if (endIdx < maxLen) {
            let spaceIdx = lLine.lastIndexOf(' ', endIdx);
            if (spaceIdx > currentIdx + (maxChars / 3)) {
              endIdx = spaceIdx;
            }
          }
          let subChord = cLine.substring(currentIdx, endIdx);
          let subLyric = lLine.substring(currentIdx, endIdx);
          const cTokens = subChord.split(/(\s+)/);
          result.push(
            <div key={`c-${i}-${currentIdx}`} style={{ minHeight: '1em' }}>
              {cTokens.map((t, tid) => t.trim() && isChord(t.trim()) ? <span key={tid} style={{ color: '#4caf50', fontWeight: 'bold' }}>{t}</span> : <span key={tid}>{t}</span>)}
            </div>
          );
          result.push(
            <div key={`l-${i}-${currentIdx}`} style={{ minHeight: '1em', marginBottom: '16px' }}>
              {subLyric}
            </div>
          );
          currentIdx = endIdx;
          if (currentIdx < maxLen && (lLine[currentIdx] === ' ' || cLine[currentIdx] === ' ')) {
            currentIdx++;
          }
        }
      } else {
        const tokens = lines[i].split(/(\s+)/);
        result.push(
          <div key={i} style={{ minHeight: '1em', marginBottom: '4px' }}>
            {tokens.map((token, tokenIdx) => {
              const cleanToken = token.trim();
              if (cleanToken && isChord(cleanToken)) {
                return <span key={tokenIdx} style={{ color: '#4caf50', fontWeight: 'bold' }}>{token}</span>;
              }
              return <span key={tokenIdx}>{token}</span>;
            })}
          </div>
        );
      }
    }
    return result;
  };

  return (
    <Container maxWidth={false} sx={{ mt: isFullscreen ? 0 : 2, mb: 4, px: isFullscreen ? 1 : (isMobile ? 1 : 4), maxWidth: isFullscreen ? '100%' : '1200px' }}>
      {!isFullscreen && (
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <IconButton onClick={() => navigate(-1)} color="inherit"><ArrowBackIcon /></IconButton>
            <Typography variant="h6">Library</Typography>
          </Box>
          <Box display="flex" gap={1}>
            {!isEditing && (
              <IconButton onClick={handleDelete} color="error" title="Delete Song">
                <DeleteIcon />
              </IconButton>
            )}
            <Button
              startIcon={isEditing ? <CloseIcon /> : <EditIcon />}
              color={isEditing ? "error" : "primary"}
              onClick={() => {
                setIsEditing(!isEditing);
                if (isEditing) setEditData({ title: song.title, artist: song.artist, genre: song.genre, status: song.status || 'Unrecorded', banger: song.banger || false, parsedChords: song.parsedChords });
              }}
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </Button>
          </Box>
        </Box>
      )}

      {!isEditing && !song.parsedChords && !song.aiProcessing && song.externalUrl && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Chords could not be automatically extracted for this song.
          <Box mt={1}>
            <Button variant="outlined" color="inherit" size="small" startIcon={<LinkIcon />} href={song.externalUrl} target="_blank" rel="noreferrer">
              Open Original Source Website
            </Button>
          </Box>
        </Alert>
      )}

      {isEditing ? (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" mb={2}>Edit Metadata</Typography>
          <Stack spacing={2} mb={3}>
            <TextField label="Title" fullWidth value={editData.title} onChange={e => setEditData({ ...editData, title: e.target.value })} />
            <Stack direction="row" spacing={2} flexWrap={isMobile ? 'wrap' : 'nowrap'} useFlexGap>
              <TextField label="Artist" fullWidth value={editData.artist} onChange={e => setEditData({ ...editData, artist: e.target.value })} />
              <TextField label="Genre" fullWidth value={editData.genre} onChange={e => setEditData({ ...editData, genre: e.target.value })} />
              <TextField select SelectProps={{ native: true }} label="Status" fullWidth value={editData.status} onChange={e => setEditData({ ...editData, status: e.target.value })}>
                <option value="Unrecorded">Unrecorded</option>
                <option value="Recorded">Recorded</option>
                <option value="Archived">Archived</option>
              </TextField>
              <FormControlLabel
                control={
                  <Switch 
                    checked={editData.banger} 
                    onChange={e => setEditData({ ...editData, banger: e.target.checked })} 
                    color="warning"
                  />
                }
                label="Banger ⭐️"
                sx={{ minWidth: 120, pl: 1, alignSelf: 'center' }}
              />
            </Stack>
          </Stack>
        </Paper>
      ) : (
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2} flexWrap={isMobile ? 'wrap' : 'nowrap'} gap={2}>
          <Box>
            <Typography variant={isMobile ? "h5" : "h3"} fontWeight="bold">{song.title}</Typography>
            <Box display="flex" alignItems="center" gap={1.5} mt={0.5}>
              <Chip label={song.status || 'Unrecorded'} size="small" color={song.status === 'Recorded' ? 'success' : 'default'} />
              <Typography variant="h6" color="textSecondary">{song.artist} • {song.genre}</Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton onClick={toggleBanger} color="warning">{song.banger ? <StarIcon /> : <StarBorderIcon />}</IconButton>
            <IconButton onClick={handleOpenPlaylists} color="primary" title="Add to Playlist"><PlaylistAddIcon /></IconButton>
            <Box display="flex" alignItems="center" bgcolor="background.paper" p={0.5} borderRadius={6} border="1px solid rgba(255,255,255,0.1)">
              <IconButton onClick={handleTransposeDown} color="primary" size="small"><ArrowDownwardIcon fontSize="small" /></IconButton>
              <Typography variant="body2" sx={{ px: 1, fontWeight: 'bold', minWidth: '25px', textAlign: 'center' }}>{transposeSteps > 0 ? `+${transposeSteps}` : transposeSteps}</Typography>
              <IconButton onClick={handleTransposeUp} color="primary" size="small"><ArrowUpwardIcon fontSize="small" /></IconButton>
            </Box>
            <IconButton onClick={toggleFullscreen} color="inherit" size="small">{isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}</IconButton>
          </Stack>
        </Box>
      )}

      {/* Control Bar */}
      {!isEditing && (
        <Paper sx={{ p: 1.5, mb: 2, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', bgcolor: '#1e1e1e' }} elevation={4}>
          <Box sx={{ minWidth: 150, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="caption">Size</Typography>
            <Slider size="small" value={fontSize} min={10} max={36} onChange={(e, v) => setFontSize(v)} />
          </Box>
          <Box sx={{ minWidth: 150, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="caption">Space</Typography>
            <Slider size="small" value={lineHeight} min={1} max={3} step={0.1} onChange={(e, v) => setLineHeight(v)} />
          </Box>
          <FormControlLabel
            control={<Switch size="small" checked={smartWrap} onChange={(e) => setSmartWrap(e.target.checked)} />}
            label={<Typography variant="caption" sx={{ fontWeight: 'bold' }}>{smartWrap ? 'Smart Wrap ON' : 'Smart Wrap OFF'}</Typography>}
          />
          {song.aiProcessing && <Chip label="AI Processing..." color="warning" variant="outlined" size="small" />}
        </Paper>
      )}

      {isEditing ? (
        <Paper sx={{ p: 0, bgcolor: '#0f1115' }}>
          <TextField multiline fullWidth minRows={20} variant="outlined" value={editData.parsedChords} onChange={(e) => setEditData({ ...editData, parsedChords: e.target.value })} InputProps={{ style: { fontFamily: '"Roboto Mono", "Courier New", monospace', color: '#eee', lineHeight: 1.4 } }} sx={{ '& fieldset': { border: 'none' } }} />
        </Paper>
      ) : !song.parsedChords && song.aiProcessing ? (
        <Paper 
          elevation={12} 
          sx={{ 
            p: 6, 
            textAlign: 'center', 
            bgcolor: 'rgba(26, 29, 36, 0.7)', 
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 6,
            minHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            boxShadow: '0 16px 40px rgba(0,0,0,0.3)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Glowing background circles for rich premium aesthetics */}
          <Box sx={{ position: 'absolute', width: '250px', height: '250px', borderRadius: '50%', background: 'rgba(74, 222, 128, 0.05)', filter: 'blur(50px)', top: '10%', left: '10%', zIndex: 0 }} />
          <Box sx={{ position: 'absolute', width: '250px', height: '250px', borderRadius: '50%', background: 'rgba(124, 58, 237, 0.05)', filter: 'blur(60px)', bottom: '10%', right: '10%', zIndex: 0 }} />

          <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
              <CircularProgress size={80} thickness={3} sx={{ color: '#4ade80', position: 'absolute', top: 0, left: 0 }} />
              <Avatar 
                sx={{ 
                  width: 80, 
                  height: 80, 
                  bgcolor: 'rgba(74, 222, 128, 0.1)', 
                  color: '#4ade80',
                  animation: 'spin 4s linear infinite',
                  '@keyframes spin': {
                    '100%': { transform: 'rotate(360deg)' }
                  }
                }}
              >
                <AutoFixHighIcon sx={{ fontSize: 36 }} />
              </Avatar>
            </Box>

            <Typography variant="h5" fontWeight="bold" sx={{ color: '#4ade80', letterSpacing: '-0.5px' }}>
              Engraving Chords via Gemini AI
            </Typography>

            <Typography variant="body2" color="textSecondary" sx={{ maxWidth: '450px', lineHeight: 1.6 }}>
              We are fetching the Ultimate Guitar sheet through our residential proxy, isolating the chords, stripping redundant website layout garbage, and aligning transposition keys. 
            </Typography>

            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#4ade80', animation: 'blink 1.5s infinite ease-in-out', '@keyframes blink': { '0%, 100%': { opacity: 0.3 }, '50%': { opacity: 1 } } }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'bold', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                Status: Residential Fetch & Alignment Active
              </Typography>
            </Box>
          </Box>
        </Paper>
      ) : (
        <Paper elevation={0} sx={{ p: isMobile ? 2 : 4, backgroundColor: '#0f1115', color: '#eee', fontFamily: '"Roboto Mono", "Courier New", monospace', fontSize: `${fontSize}px`, lineHeight: lineHeight, whiteSpace: 'pre', overflowX: smartWrap ? 'hidden' : 'auto', minHeight: '80vh', border: '1px solid #222', borderRadius: '12px', letterSpacing: '-0.5px' }}>
          {renderFormattedText()}
        </Paper>
      )}

      {isEditing && (
        <Box mt={3} display="flex" justifyContent="flex-end">
          <Button variant="contained" color="primary" size="large" onClick={handleSave} startIcon={<SaveIcon />}>Save Changes</Button>
        </Box>
      )}

      {!isEditing && song.parsedChords && (
        <Box mt={4} display="flex" justifyContent="space-between" flexWrap="wrap" gap={3} sx={{ pt: 2, borderTop: '1px solid #333' }}>
          <Box display="flex" gap={2} flexWrap="wrap">
            <Button size="small" variant="outlined" startIcon={<AutoFixHighIcon />} onClick={requestAiClean} sx={{ color: song.aiProcessing ? 'secondary.main' : 'primary.main', px: 2 }}>{song.aiProcessing ? "Priority Scrape Enqueued..." : "Re-run AI Alignment"}</Button>
            {song.externalUrl && <Button size="small" variant="text" startIcon={<LinkIcon />} href={song.externalUrl} target="_blank" color="inherit" rel="noreferrer" sx={{ px: 2 }}>Source Document</Button>}
          </Box>
          <Typography variant="caption" color="textSecondary">Green = Detected Chord. Toggle 'Smart Wrap' if lines are escaping your screen.</Typography>
        </Box>
      )}

      {!isEditing && !song.parsedChords && !song.aiProcessing && (
        <Box mt={4} sx={{ pt: 2, borderTop: '1px solid #444' }}>
          <Button variant="outlined" startIcon={<AutoFixHighIcon />} onClick={requestAiClean} sx={{ color: song.aiProcessing ? 'secondary.main' : 'primary.main', py: 1.5, px: 3 }}>{song.aiProcessing ? "Jump to Front of AI Queue" : "Force AI Background Scrape"}</Button>
        </Box>
      )}

      <Dialog open={playlistDialogOpen} onClose={() => setPlaylistDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add to Playlist</DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <MuiList>
            {playlists.map(pl => (
              <MuiListItem button="true" key={pl.id} onClick={() => handleAddToPlaylist(pl.id)}>
                <MuiListItemText primary={pl.name} secondary={`${pl.songIds?.length || 0} songs`} />
              </MuiListItem>
            ))}
          </MuiList>
          <Box p={2} display="flex" gap={2}>
            <TextField size="small" fullWidth placeholder="Or create new playlist..." value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)} />
            <Button variant="contained" disabled={!newPlaylistName.trim()} onClick={handleCreateAndAdd}>Create & Add</Button>
          </Box>
        </DialogContent>
        <DialogActions><Button onClick={() => setPlaylistDialogOpen(false)}>Close</Button></DialogActions>
      </Dialog>
    </Container>
  );
}
