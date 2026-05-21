'use client';

import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [darkMode, setDarkMode] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Check system preference or stored preference
    const storedTheme = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    const systemPrefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = storedTheme ? storedTheme === 'dark' : systemPrefersDark;
    
    setDarkMode(isDark);
    setMounted(true);
    
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !darkMode;
    setDarkMode(newTheme);
    
    if (newTheme) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
    }
  };

  // Don't render anything on the server-side until mounted
  if (!mounted) {
    return (
      <button 
        className="theme-toggle-btn"
        aria-label="Loading theme toggle"
        disabled
      >
        <div className="flex items-center gap-2">
          <span>Loading...</span>
        </div>
      </button>
    );
  }

  return (
    <button 
      onClick={toggleTheme}
      className="theme-toggle-btn"
      aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
    >
      <div className="flex items-center gap-2">
        <span>{darkMode ? 'właściw' : '☀️'}</span>
      </div>
    </button>
  );
}