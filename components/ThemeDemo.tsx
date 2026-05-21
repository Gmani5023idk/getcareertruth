import { useState, useEffect } from 'react';

export default function ThemeDemo() {
  const [currentTheme, setCurrentTheme] = useState('light');

  useEffect(() => {
    // Check user preference or system preference for dark mode
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const isDarkPreferred = darkModeMediaQuery.matches;
    
    if (isDarkPreferred) {
      setCurrentTheme('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setCurrentTheme(newTheme);
  };

  return (
    <div className={currentTheme === 'dark' ? 'min-h-screen bg-[#0A0F1E]' : 'min-h-screen bg-white'}>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Theme Toggle Demo</h1>
        
        <button 
          onClick={toggleTheme}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mb-8"
        >
          Toggle Theme
        </button>
        
        <div className={currentTheme === 'dark' ? 'bg-[#0F1629] p-6 rounded-xl border border-[#1E2A45]' : 'bg-gray-100 p-6 rounded-xl border border-gray-300'}>
          <h2 className={currentTheme === 'dark' ? 'text-[#F0F4FF] text-xl mb-4' : 'text-gray-900 text-xl mb-4'}>
            Current Theme: {currentTheme}
          </h2>
          
          <p className="mb-4 text-text-secondary">
            This is a sample component that changes appearance based on the current theme.
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <div className={currentTheme === 'dark' ? 'bg-[#0F1629] p-4 rounded border border-[#1E2A45]' : 'bg-white p-4 rounded border border-gray-300'}>
              <h3 className={currentTheme === 'dark' ? 'text-[#F0F4FF] mb-2' : 'text-gray-900 mb-2'}>Feature 1</h3>
              <p className={currentTheme === 'dark' ? 'text-[#8A9BBE]' : 'text-gray-600'}>
                Description of feature 1
              </p>
            </div>
            
            <div className={currentTheme === 'dark' ? 'bg-[#0F1629] p-4 rounded border border-[#1E2A45]' : 'bg-white p-4 rounded border border-gray-300'}>
              <h3 className={currentTheme === 'dark' ? 'text-[#F0F4FF] mb-2' : 'text-gray-900 mb-2'}>Feature 2</h3>
              <p className={currentTheme === 'dark' ? 'text-[#8A9BBE]' : 'text-gray-600'}>
                Description of feature 2
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}