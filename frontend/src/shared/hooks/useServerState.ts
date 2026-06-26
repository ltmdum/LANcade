import { useState, useEffect, useRef } from 'react';
import type { GameState } from '@lancade/shared';

interface UseServerStateOptions {
  /** Access key from the invite URL, or empty when no link is present. */
  accessKey: string;
  /** Message shown when there is no key yet. */
  waitingMessage?: string;
  /** Called when the server rejects the current key. */
  onUnauthorized?: () => void;
}

interface UseServerStateReturn {
  serverState: GameState | null;
  connection: string;
}

/**
 * Subscribe to server state updates via SSE and HTTP fallback.
 * @param options Hook configuration options.
 * @returns Current server state and connection status.
 */
export function useServerState(options: UseServerStateOptions): UseServerStateReturn {
  const { accessKey, onUnauthorized } = options;
  const waitingMessage = options.waitingMessage || 'Waiting for an invite link...';

  const [serverState, setServerState] = useState<GameState | null>(null);
  const [connection, setConnection] = useState('Disconnected');
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!accessKey) {
      setConnection(waitingMessage);
      setServerState(null);
      return () => {};
    }

    const query = `key=${encodeURIComponent(accessKey)}`;

    function closeEventSource() {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    }

    function connectEvents() {
      closeEventSource();
      const eventSource = new EventSource(`/api/events?${query}`);
      eventSourceRef.current = eventSource;

      eventSource.addEventListener('state', (event) => {
        if (cancelled) return;
        const data = JSON.parse(event.data);
        setServerState(data);
        setConnection('Connected');
      });

      eventSource.onopen = () => {
        if (cancelled) return;
        setConnection('Connected');
      };

      eventSource.onerror = () => {
        if (cancelled) return;
        setConnection('Connection lost. Reconnecting...');
      };
    }

    async function init() {
      setConnection('Connecting...');
      try {
        const response = await fetch(`/api/state?${query}`);
        if (cancelled) return;

        if (response.status === 401) {
          if (onUnauthorized) {
            onUnauthorized();
          }
          setConnection('Unauthorized');
          return;
        }

        if (!response.ok) {
          setConnection('Unable to connect.');
          return;
        }

        const state = await response.json();
        if (cancelled) return;

        setServerState(state);
        setConnection('Connected');
        connectEvents();
      } catch {
        if (!cancelled) {
          setConnection('Unable to connect.');
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      closeEventSource();
    };
  }, [accessKey, onUnauthorized, waitingMessage]);

  return { serverState, connection };
}
