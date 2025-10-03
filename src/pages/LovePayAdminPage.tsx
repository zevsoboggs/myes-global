import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function LovePayAdminPage() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/lovepay/requests', { replace: true });
  }, [navigate]);
  return <div className="min-h-screen" />;
} 