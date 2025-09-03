import { useState, useEffect } from 'react';
import { WebContainer } from '@webcontainer/api';

export function useWebContainer() {
  const [webcontainer, setWebcontainer] = useState<WebContainer>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function main() {
    try {
      setIsLoading(true);
      const webcontainerInstance = await WebContainer.boot();
      setWebcontainer(webcontainerInstance);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to boot WebContainer');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    main();
  }, []);

  return { webcontainer, isLoading, error };
} 