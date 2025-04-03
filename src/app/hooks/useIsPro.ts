'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';

export function useIsPro() {
  const { userId } = useAuth();
  const [isProUser, setIsProUser] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkProStatus = async () => {
      if (!userId) {
        setIsProUser(false);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/check-pro-status');
        const data = await response.json();
        setIsProUser(data.isPro);
      } catch (error) {
        console.error('Error checking pro status:', error);
        setIsProUser(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkProStatus();
  }, [userId]);

  return { isProUser, isLoading };
} 