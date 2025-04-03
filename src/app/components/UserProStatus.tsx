'use client';

import React from 'react';
import ProBadge from './ProBadge';
import { useIsPro } from '../hooks/useIsPro';

export default function UserProStatus() {
  const { isProUser, isLoading } = useIsPro();

  if (isLoading) return null;

  return isProUser ? <ProBadge /> : null;
} 