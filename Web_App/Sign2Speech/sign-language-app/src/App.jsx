// src/App.jsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import CombinationPage from './components/CombinationPage';
// import SignCustomization from './components/SignCustomization';
import MonitorView from './components/MonitorView';
import ProtectedRoute from './components/ProtectedRoute';
import AuthProvider from './contexts/AuthContext';
import SignLogTable from './components/SignLogTable';


// Create a theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/Dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/combination" element={
              <ProtectedRoute>
                <CombinationPage />
              </ProtectedRoute>
            } />
            
            <Route path="/monitor" element={
              <ProtectedRoute>
                <MonitorView />
              </ProtectedRoute>
            } />

            
            <Route path="/logtable" element={
              <ProtectedRoute>
                <SignLogTable />
              </ProtectedRoute>
            } />

          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;