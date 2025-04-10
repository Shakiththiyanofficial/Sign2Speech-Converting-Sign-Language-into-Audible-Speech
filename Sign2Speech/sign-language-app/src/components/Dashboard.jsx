import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Container,
  Typography,
  Button,
  Box,
  TextField,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  AppBar,
  Toolbar
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { ref, set, get, remove } from 'firebase/database';
import { rtdb } from '../firebase';
import logo from '../assets/logo.png';
import '../styles/Dashboard.css';

export default function Dashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [signCode, setSignCode] = useState('');
  const [signCodeError, setSignCodeError] = useState('');
  const [combinations, setCombinations] = useState([]);
  const [editMode, setEditMode] = useState(false); // ⬅️ New: Edit mode toggle

  // Fetch from Realtime Database
  useEffect(() => {
    const fetchRealtimeCombinations = async () => {
      try {
        const userSignsRef = ref(rtdb, `users/${currentUser.uid}/signs`);
        const snapshot = await get(userSignsRef);

        if (snapshot.exists()) {
          const data = snapshot.val();
          const entries = Object.entries(data).map(([signCode, value]) => ({
            signCode,
            message: value.text || 'No message'
          }));
          setCombinations(entries);
        } else {
          setCombinations([]);
        }
      } catch (error) {
        console.error("Error fetching combinations:", error);
      }
    };

    if (currentUser) {
      fetchRealtimeCombinations();
    }
  }, [currentUser]);

  const handleSignCodeChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^[01]+$/.test(value)) {
      setSignCode(value);
      if (value.length !== 5 && value.length > 0) {
        setSignCodeError('Sign code must be exactly 5 binary digits (0 or 1)');
      } else {
        setSignCodeError('');
      }
    } else {
      setSignCodeError('Sign code can only contain binary digits (0 or 1)');
    }
  };

  const handleGo = async () => {
    if (!signCode || signCode.length !== 5 || !/^[01]+$/.test(signCode)) {
      setSignCodeError("Sign code must be exactly 5 binary digits (0 or 1)");
      return;
    }

    if (signCode !== '11111') {
      setSignCodeError("Only 11111 is allowed as the start code");
      return;
    }

    try {
      await set(ref(rtdb, `users/${currentUser.uid}/startCode`), signCode);
      navigate('/combination');
    } catch (error) {
      console.error("Failed to save code:", error);
      alert("Something went wrong.");
    }
  };

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  }

  const handleDeleteCombination = async (signCodeToDelete) => {
    try {
      await remove(ref(rtdb, `users/${currentUser.uid}/signs/${signCodeToDelete}`));
      setCombinations(prev => prev.filter(combo => combo.signCode !== signCodeToDelete));
    } catch (error) {
      console.error("Failed to delete combination:", error);
      alert("Error deleting combination");
    }
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
          <IconButton
            color="inherit"
            onClick={() => navigate('/monitor')}
          >
            <NotificationsIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Box className="logo-container">
          <Box className="logo-image">
            <img src={logo} alt="Sign to Speak Logo" style={{ width: '100%' }} />
          </Box>
          <Typography variant="body2" className="tagline">
            "Take care of your loved one who can't communicate directly but can notify you of their needs, no matter the distance."
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 'bold', mb: 2 }}>
            START
          </Typography>

          <TextField
            fullWidth
            label="SIGN CODE"
            variant="outlined"
            value={signCode}
            onChange={handleSignCodeChange}
            error={!!signCodeError}
            helperText={signCodeError || "Enter exactly 5 binary digits (0 or 1)"}
            inputProps={{ maxLength: 5, inputMode: 'numeric' }}
            sx={{ mb: 2, bgcolor: 'rgba(173, 216, 230, 0.2)', '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Button
              variant="contained"
              onClick={handleGo}
              disabled={!!signCodeError || signCode.length !== 5}
              sx={{ px: 4, borderRadius: 2 }}
            >
              GO
            </Button>
          </Box>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                SIGN COMBINATIONS
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setEditMode(!editMode)}
              >
                {editMode ? "Done" : "Edit"}
              </Button>
            </Box>
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => navigate('/combination')}
              sx={{ borderRadius: 2, fontSize: '0.7rem' }}
            >
              ADD
            </Button>
          </Box>

          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <List sx={{ p: 0 }}>
              {combinations.length > 0 ? (
                combinations.map((combo, index) => (
                  <React.Fragment key={index}>
                    <ListItem
                      sx={{ bgcolor: index % 2 === 0 ? 'rgba(173, 216, 230, 0.1)' : 'white', py: 1 }}
                      secondaryAction={
                        editMode && (
                          <IconButton edge="end" onClick={() => handleDeleteCombination(combo.signCode)}>
                            <DeleteIcon color="error" />
                          </IconButton>
                        )
                      }
                    >
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                            SIGN CODE : {combo.signCode}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="body2" sx={{ mt: 0.5 }}>
                            MESSAGE : {combo.message}
                          </Typography>
                        }
                      />
                    </ListItem>
                    {index < combinations.length - 1 && <Divider />}
                  </React.Fragment>
                ))
              ) : (
                <ListItem>
                  <ListItemText primary="No combinations saved yet" />
                </ListItem>
              )}
            </List>
          </Paper>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4 }}>
          <Box sx={{ mb: 1 }}>
            <Box className="waveform">
              {[...Array(10)].map((_, i) => (
                <Box
                  key={i}
                  className="wave-bar"
                  sx={{
                    height: `${Math.min(10 + i * 3, 30)}px`,
                    backgroundColor: i < 5 ? 'primary.main' : 'info.main'
                  }}
                />
              ))}
            </Box>
          </Box>
          <Typography variant="body2" sx={{ color: 'primary.main', textAlign: 'center', mt: 1 }}>
            STAY CONNECT WITH YOUR LOVED ONE
          </Typography>
        </Box>
      </Container>
    </>
  );
}
