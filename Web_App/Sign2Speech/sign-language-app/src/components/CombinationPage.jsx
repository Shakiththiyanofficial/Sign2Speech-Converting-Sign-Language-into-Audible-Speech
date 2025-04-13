import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Container,
  Typography,
  Button,
  Box,
  TextField
} from '@mui/material';
import { ref, set } from 'firebase/database';
import { rtdb } from '../firebase'; // Make sure this points to your Realtime Database config
import logo from '../assets/logo.png'; // Update path as needed

export default function CombinationPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { signCode: initialSignCode } = location.state || { signCode: '' };

  const [signCode, setSignCode] = useState(initialSignCode);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleConfirm() {
    if (!signCode.trim() || !message.trim()) {
      alert("Please enter both sign code and message");
      return;
    }

    if (signCode.length !== 5 || !/^[01]+$/.test(signCode)) {
      alert("Sign code must be exactly 5 binary digits (0 or 1)");
      return;
    }

    // 🚫 Block '11111'
    if (signCode === '11111') {
      alert("11111 is reserved as the START sign and cannot be used.");
      return;
    }

    setSaving(true);
    try {
      const signRef = ref(rtdb, `users/${currentUser.uid}/signs/${signCode}`);
      await set(signRef, {
        text: message // ✅ Only set the text. Let Cloud Function handle audioUrl.
      });

      navigate('/dashboard');
    } catch (error) {
      console.error("Error saving combination:", error);
      alert("Failed to save combination");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      {/* Logo and Tagline */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
        <Box sx={{ mb: 1, maxWidth: 200 }}>
          <img src={logo} alt="Sign to Speak Logo" style={{ width: '100%' }} />
        </Box>
        <Typography variant="body2" sx={{ textAlign: 'center', fontStyle: 'italic', maxWidth: 300 }}>
          "Take care of your loved one who can't communicate directly but can notify you of their needs, no matter the distance."
        </Typography>
      </Box>

      {/* SIGN COMBINATION Section */}
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h6" 
          sx={{ 
            color: 'primary.main', 
            fontWeight: 'bold', 
            mb: 2 
          }}
        >
          SIGN COMBINATION
        </Typography>

        <TextField
          fullWidth
          label="SIGN CODE"
          variant="outlined"
          value={signCode}
          onChange={(e) => {
            const val = e.target.value;
            if (/^[01]{0,5}$/.test(val)) {
              setSignCode(val);
            }
          }}
          helperText="Must be 5 binary digits (except 11111)"
          sx={{ 
            mb: 2,
            bgcolor: 'rgba(173, 216, 230, 0.2)',
            '& .MuiOutlinedInput-root': {
              borderRadius: 2
            }
          }}
        />
        <TextField
          fullWidth
          label="MESSAGE"
          variant="outlined"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          multiline
          minRows={2}
          sx={{ 
            mb: 2,
            bgcolor: 'rgba(173, 216, 230, 0.2)',
            '& .MuiOutlinedInput-root': {
              borderRadius: 2
            }
          }}
        />

        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Button 
            variant="contained" 
            onClick={handleConfirm}
            disabled={saving}
            sx={{ 
              px: 4, 
              borderRadius: 2,
              bgcolor: 'rgba(173, 216, 230, 0.7)',
              color: 'primary.main',
              '&:hover': {
                bgcolor: 'rgba(173, 216, 230, 0.9)',
              }
            }}
          >
            {saving ? "SAVING..." : "CONFIRM"}
          </Button>
        </Box>
      </Box>

      {/* Footer */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 'auto', pt: 10 }}>
        <Box sx={{ mb: 1 }}>
          {/* Waveform Visualization */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '3px', 
            height: 40 
          }}>
            {[...Array(10)].map((_, i) => (
              <Box 
                key={i}
                sx={{
                  width: '4px',
                  height: `${Math.min(10 + i * 3, 30)}px`,
                  bgcolor: i < 5 ? 'primary.main' : 'info.main',
                  borderRadius: '2px'
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
  );
}
