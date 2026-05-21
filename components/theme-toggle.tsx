'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [darkMode, setDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Check localStorage or system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);

    setDarkMode(isDark);
    setMounted(true);

    // Apply the class (only 'dark' class matters for Tailwind)
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newDark = !darkMode;
    setDarkMode(newDark);

    if (newDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
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
          <Sun className="w-4 h-4" />
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
      {darkMode ? (
        <div className="flex items-center gap-2">
          <Sun className="w-4 h-4" />
          <span>Light</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Moon className="w-4 h-4" />
          <span>Dark</span>
        </div>
      )}
    </button>
  );
}