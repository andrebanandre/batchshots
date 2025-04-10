'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';

export function useIsPro() {
  const { userId } = useAuth();
  const [isProUser, setIsProUser] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkProStatus = async () => {
      console.log('Checking pro status for user:', userId);
      if (!userId) {
        console.log('No user ID, setting isProUser to false');
        setIsProUser(false);
        setIsLoading(false);
        return;
      }

      try {
        console.log('Fetching pro status from API');
        const response = await fetch('/api/check-pro-status');
        const data = await response.json();
        console.log('Pro status response:', data);
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