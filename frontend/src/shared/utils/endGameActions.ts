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
  adminSessionId: string;
  setShowConfirmation: (show: boolean) => void;
  setStatus: (status: string) => void;
  setIsEnding: (ending: boolean) => void;
  onExpired: () => void;
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
    adminSessionId,
    setShowConfirmation,
    setStatus,
    setIsEnding,
    onExpired,
    onEnded,
  } = options;

  if (!adminSessionId) {
    return { success: false, statusMessage: 'Admin session required.' };
  }

  setIsEnding(true);
  setStatus('');

  try {
    const { response, data } = await endGame(adminSessionId);

    if (response.status === 401) {
      onExpired();
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
