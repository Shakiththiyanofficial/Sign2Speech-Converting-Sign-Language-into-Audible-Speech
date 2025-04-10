// src/contexts/AuthContext.jsx

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { auth, db } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // Initialize default signs for new user
        const userId = userCredential.user.uid;
        initializeDefaultSigns(userId);
        return userCredential;
      });
  }

  function initializeDefaultSigns(userId) {
    const defaultSigns = {
      '10000': { text: 'Help', audio_url: '' },
      '01000': { text: 'Water', audio_url: '' },
      '00100': { text: 'Food', audio_url: '' },
      '00010': { text: 'Medicine', audio_url: '' },
      '00001': { text: 'Bathroom', audio_url: '' },
      '11000': { text: 'Emergency', audio_url: '' },
      '10100': { text: 'Pain', audio_url: '' },
      '10010': { text: 'Doctor', audio_url: '' },
      '10001': { text: 'Family', audio_url: '' },
      '01100': { text: 'Yes', audio_url: '' },
    };

    const signPromises = Object.entries(defaultSigns).map(([pattern, data]) => {
      return set(ref(db, `users/${userId}/signs/${pattern}`), data);
    });

    return Promise.all(signPromises);
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}