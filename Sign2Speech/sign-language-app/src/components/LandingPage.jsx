import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/LandingPage.css'; // You'll need to create this CSS file
import logo from '../assets/logo.png'; 

const LandingPage = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Auto-navigate to main app after a delay (optional)
    const timer = setTimeout(() => {
      navigate('/Login'); // Change to your main app route
    }, 3000); // 3 second delay

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="landing-page">
      <div className="logo-container">
        <img src={logo} alt="Sign to Speak Logo" className="app-logo" />
        {/* <h1 className="logo">
          <span className="sign">SIGN</span> <span className="to">to</span> <span className="speak">SPEAK</span>
        </h1> */}
      </div>
      
      <div className="waveform">
        {/* Audio waveform visualization */}
        {Array(10).fill().map((_, i) => (
          <div 
            key={i} 
            className="wave-bar"
            style={{ 
              height: `${Math.random() * 20 + 10}px`,
              animationDelay: `${i * 0.1}s`
            }}
          ></div>
        ))}
      </div>
    </div>
  );
};

export default LandingPage;