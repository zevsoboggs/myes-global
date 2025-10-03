import { useState, useEffect } from 'react';

export function useAppLoading() {
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Simulate app initialization time
    const minLoadTime = 2000; // Minimum 2 seconds to show preloader
    const startTime = Date.now();

    const initializeApp = async () => {
      try {
        // Wait for minimum load time or actual loading to complete
        const elapsed = Date.now() - startTime;
        const remainingTime = Math.max(0, minLoadTime - elapsed);

        if (remainingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingTime));
        }

        setIsInitialized(true);

        // Small delay before hiding preloader for smooth transition
        setTimeout(() => {
          setIsLoading(false);
        }, 300);
      } catch (error) {
        console.error('App initialization error:', error);
        setIsLoading(false);
      }
    };

    // Check if this is the first load
    const hasShownPreloader = sessionStorage.getItem('preloader-shown');

    if (!hasShownPreloader) {
      sessionStorage.setItem('preloader-shown', 'true');
      initializeApp();
    } else {
      // Skip preloader on subsequent navigation within the same session
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, []);

  return { isLoading, isInitialized };
}