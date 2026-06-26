import { endGame } from './api';

/**
 * State for the end game button component.
 */
export interface EndGameState {
  showConfirmation: boolean;
  status: string;
  isEnding: boolean;
}

/**
 * Create initial state for the end game button.
 * @returns Initial state object.
 */
export function createEndGameState(): EndGameState {
  return {
    showConfirmation: false,
    status: '',
    isEnding: false,
  };
}

/**
 * Options for the handleEndGame function.
 */
export interface HandleEndGameOptions {
  /** Admin access key. */
  accessKey: string;
  setShowConfirmation: (show: boolean) => void;
  setStatus: (status: string) => void;
  setIsEnding: (ending: boolean) => void;
  onUnauthorized: () => void;
  onEnded?: () => void;
}

/**
 * Result from the handleEndGame function.
 */
export interface HandleEndGameResult {
  success: boolean;
  statusMessage: string;
}

/**
 * Handle the end game action.
 * @param options Handler options including callbacks.
 * @returns Result of the end game attempt.
 */
export async function handleEndGame(options: HandleEndGameOptions): Promise<HandleEndGameResult> {
  const {
    accessKey,
    setShowConfirmation,
    setStatus,
    setIsEnding,
    onUnauthorized,
    onEnded,
  } = options;

  if (!accessKey) {
    return { success: false, statusMessage: 'Admin access required.' };
  }

  setIsEnding(true);
  setStatus('');

  try {
    const { response, data } = await endGame(accessKey);

    if (response.status === 401) {
      onUnauthorized();
      setIsEnding(false);
      return { success: false, statusMessage: '' };
    }

    if (!response.ok) {
      setIsEnding(false);
      if (data.reason === 'not_active') {
        return { success: false, statusMessage: 'No active game to end.' };
      }
      return { success: false, statusMessage: 'Could not end the game.' };
    }

    setShowConfirmation(false);
    setIsEnding(false);
    onEnded?.();
    return { success: true, statusMessage: 'Game ended.' };
  } catch {
    setIsEnding(false);
    return { success: false, statusMessage: 'Could not end the game.' };
  }
}
