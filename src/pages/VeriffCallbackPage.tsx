import React, { useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export function VeriffCallbackPage() {
  const { t } = useLanguage();
  useEffect(() => {
    try {
      // Inform opener that Veriff flow finished
      if (window.opener) {
        window.opener.postMessage({ type: 'veriff_complete' }, '*');
      }
    } catch {}
    // Try to close popup/tab
    setTimeout(() => {
      try { window.close(); } catch {}
    }, 300);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center text-gray-700">
      {t('kyc.callbackClosing')}
    </div>
  );
}

export default VeriffCallbackPage;


