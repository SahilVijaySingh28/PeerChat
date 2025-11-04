import { useState, useEffect, useCallback } from 'react';

export const useTheme = () => {
  const [theme, setTheme] = useState('dark');

  // Apply theme to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
    
    // Save theme to localStorage
    localStorage.setItem('flashchat-theme', theme);
  }, [theme]);

  // Load theme from localStorage on initial render
  useEffect(() => {
    const savedTheme = localStorage.getItem('flashchat-theme');
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  // Toggle theme
  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  }, []);

  // Set theme explicitly
  const setThemeMode = useCallback((mode) => {
    if (mode === 'dark' || mode === 'light') {
      setTheme(mode);
    }
  }, []);

  return {
    theme,
    toggleTheme,
    setTheme: setThemeMode
  };
};