import { useCallback, useEffect, useState } from 'react';

export function useToast() {
  const [message, setMessage] = useState('');
  const notify = useCallback((text: string) => setMessage(text), []);
  const dismiss = useCallback(() => setMessage(''), []);
  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(dismiss, 4500);
    return () => window.clearTimeout(timeout);
  }, [message, dismiss]);
  return { message, notify, dismiss };
}
