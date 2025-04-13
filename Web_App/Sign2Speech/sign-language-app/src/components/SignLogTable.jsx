import React, { useEffect, useState } from 'react';
import { rtdb } from '../firebase';
import { ref, get } from 'firebase/database';
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  AppBar,
  Toolbar,
  IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function SignDetectionLog() {
  const [logs, setLogs] = useState([]);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;

      const historyRef = ref(rtdb, 'SignSpeak/history');
      const userSignsRef = ref(rtdb, `users/${currentUser.uid}/signs`);

      const [historySnap, userSignsSnap] = await Promise.all([
        get(historyRef),
        get(userSignsRef),
      ]);

      const history = historySnap.exists() ? historySnap.val() : {};
      const userSigns = userSignsSnap.exists() ? userSignsSnap.val() : {};

      const logData = Object.values(history).map(entry => ({
        detected_sign: entry.detected_sign,
        timestamp: new Date(entry.timestamp * 1000).toLocaleString(),
        message: userSigns[entry.detected_sign]?.text || 'Unknown',
      }));

      setLogs(logData.reverse()); // latest first
    };

    fetchData();
  }, [currentUser]);

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate('/dashboard')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Sign Detection Logs
          </Typography>
        </Toolbar>
      </AppBar>

      <Container sx={{ mt: 4 }}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Detected Sign</strong></TableCell>
                <TableCell><strong>Timestamp</strong></TableCell>
                <TableCell><strong>Message</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log, index) => (
                <TableRow key={index}>
                  <TableCell>{log.detected_sign}</TableCell>
                  <TableCell>{log.timestamp}</TableCell>
                  <TableCell>{log.message}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>
    </>
  );
}
