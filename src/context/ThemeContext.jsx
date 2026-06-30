/**
 * context/ThemeContext.jsx — Theme Context
 * Note: Dark mode has been removed. Only light theme is available.
 */

import { createContext, useContext } from 'react';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  // Theme context maintained for backwards compatibility
  // Dark mode functionality has been removed

  return (
    <ThemeContext.Provider value={{ theme: 'light', isDark: false }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
