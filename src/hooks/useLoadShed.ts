import { useContext } from 'react';
import { LoadShedContext } from '../context/LoadShedContext';

export const useLoadShed = () => {
  const context = useContext(LoadShedContext);
  if (!context) {
    throw new Error('useLoadShed must be used within a LoadShedProvider');
  }
  return context;
};
