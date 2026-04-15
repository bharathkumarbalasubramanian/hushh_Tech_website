import React from 'react';
import { useNavigate } from 'react-router-dom';
import HushhIDHero from '../components/HushhIDHero';
import { FINANCIAL_LINK_ROUTE } from '../services/onboarding/flow';

/**
 * Demo page to showcase the Apple-style Hushh ID Hero component
 * This demonstrates the premium, polished design inspired by Apple's service tiles
 */
const HushhIDHeroDemo: React.FC = () => {
  const navigate = useNavigate();

  const handleCreateClick = () => {
    console.log('Create Hushh ID clicked');
    navigate(FINANCIAL_LINK_ROUTE);
  };

  return (
    <div>
      <HushhIDHero 
        userName="Ankit Kumar Singh" 
        onCreateClick={handleCreateClick} 
      />
    </div>
  );
};

export default HushhIDHeroDemo;
