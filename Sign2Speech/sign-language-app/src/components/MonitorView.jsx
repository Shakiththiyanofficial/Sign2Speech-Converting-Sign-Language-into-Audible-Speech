import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { rtdb } from '../firebase';
import { ref, onValue } from 'firebase/database';
import {
  Container,
  Typography,
  Box,
  IconButton,
  AppBar,
  Toolbar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Card,
  CardContent,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  VolumeUp as VolumeUpIcon,
  History as HistoryIcon
} from '@mui/icons-material';

export default function MonitorView() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [signs, setSigns] = useState({});
  const [currentStatus, setCurrentStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [autoPlay, setAutoPlay] = useState(true);
  const lastProcessedTimestamp = useRef(0);

  useEffect(() => {
    if (!currentUser) return;

    const signsRef = ref(rtdb, `users/${currentUser.uid}/signs`);
    const statusRef = ref(rtdb, `users/${currentUser.uid}/current_status`);

    const unsubscribeSigns = onValue(signsRef, (snapshot) => {
      if (snapshot.exists()) {
        setSigns(snapshot.val());
      }
    });

    const unsubscribeStatus = onValue(statusRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data.timestamp > lastProcessedTimestamp.current) {
          lastProcessedTimestamp.current = data.timestamp;
          setCurrentStatus(data);

          const matchedSign = signs[data.detected_sign];
          setHistory(prev => [
            {
              timestamp: data.timestamp,
              pattern: data.detected_sign,
              text: matchedSign?.text || 'Unknown Sign'
            },
            ...prev.slice(0, 9)
          ]);

          if (autoPlay) {
            const audioUrl = matchedSign?.audioUrl;
            if (audioUrl) {
              const audio = new Audio(audioUrl);
              audio.play().catch(err => {
                console.warn("Audio failed, fallback to speech:", err);
                fallbackSpeak(matchedSign?.text);
              });
            } else {
              fallbackSpeak(matchedSign?.text);
            }
          }
        }
      }
    });

    return () => {
      unsubscribeSigns();
      unsubscribeStatus();
    };
  }, [currentUser, signs, autoPlay]);

  const fallbackSpeak = (text) => {
    if ('speechSynthesis' in window && text) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString();
  };

  const renderHandVisual = (pattern) => {
    if (!pattern) return null;
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
        {pattern.split('').map((digit, i) => (
          <Box key={i} sx={{
            width: 30,
            height: 60,
            mx: 1,
            bgcolor: digit === '1' ? 'primary.main' : 'grey.300',
            borderRadius: '0 0 10px 10px'
          }} />
        ))}
      </Box>
    );
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate('/dashboard')} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Sign Monitor</Typography>
          <FormControlLabel
            control={
              <Switch checked={autoPlay} onChange={e => setAutoPlay(e.target.checked)} color="secondary" />
            }
            label="Auto Play"
          />
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          <Box sx={{ flex: 2 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <NotificationsActiveIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h5">Current Sign</Typography>
                </Box>

                {currentStatus ? (
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    {renderHandVisual(currentStatus.detected_sign)}
                    <Typography variant="h4" sx={{ mt: 2 }}>
                      {signs[currentStatus.detected_sign]?.text || 'Unknown Sign'}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }} color="text.secondary">
                      Pattern: {currentStatus.detected_sign}
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      Detected at {formatTime(currentStatus.timestamp)}
                    </Typography>
                    <IconButton
                      color="primary"
                      size="large"
                      sx={{ mt: 2 }}
                      onClick={() => {
                        const audioUrl = signs[currentStatus.detected_sign]?.audioUrl;
                        if (audioUrl) {
                          const audio = new Audio(audioUrl);
                          audio.play().catch(err => {
                            console.warn("Manual audio failed:", err);
                            fallbackSpeak(signs[currentStatus.detected_sign]?.text);
                          });
                        } else {
                          fallbackSpeak(signs[currentStatus.detected_sign]?.text);
                        }
                      }}
                    >
                      <VolumeUpIcon fontSize="large" />
                    </IconButton>
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', p: 4 }}>
                    <NotificationsIcon sx={{ fontSize: 60, color: 'text.secondary' }} />
                    <Typography variant="body1" sx={{ mt: 2 }}>
                      Waiting for sign gestures...
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>

          <Box sx={{ flex: 1 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <HistoryIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Recent Activity</Typography>
                </Box>

                {history.length > 0 ? (
                  <List dense>
                    {history.map((item, index) => (
                      <React.Fragment key={item.timestamp}>
                        <ListItem>
                          <ListItemIcon sx={{ minWidth: 40 }}>
                            <VolumeUpIcon
                              fontSize="small"
                              color="action"
                              sx={{ cursor: 'pointer' }}
                              onClick={() => {
                                const audioUrl = signs[item.pattern]?.audioUrl;
                                if (audioUrl) {
                                  const audio = new Audio(audioUrl);
                                  audio.play().catch(err => {
                                    fallbackSpeak(item.text);
                                  });
                                } else {
                                  fallbackSpeak(item.text);
                                }
                              }}
                            />
                          </ListItemIcon>
                          <ListItemText primary={item.text} secondary={formatTime(item.timestamp)} />
                        </ListItem>
                        {index < history.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" sx={{ textAlign: 'center', p: 2 }} color="text.secondary">
                    No activity yet
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Container>
    </>
  );
}
