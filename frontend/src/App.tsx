import { useState, useEffect, useMemo, useCallback } from 'react';
import { useServerState } from './shared/hooks/useServerState';
import { AdminPanel } from './shared/components/AdminPanel';
import { JoinPanel } from './shared/components/JoinPanel';
import { GameSelector } from './shared/components/GameSelector';
import { CategorySelector } from './shared/components/CategorySelector';
import { RoundControl } from './shared/components/RoundControl';
import { PlayerList } from './shared/components/PlayerList';
import { EndGameButton } from './shared/components/EndGameButton';
import { GameInfoModal } from './shared/components/GameInfoModal';
import { GameSettingsPanel } from './shared/components/GameSettingsPanel';
import { Panel } from './shared/components/Panel';
import { parseAccess } from './shared/utils/accessMode';
import { getSessionData, setSessionData } from './shared/utils/api';
import { gamePluginRegistry } from './plugins';
import iconImg from './assets/icon.png';
import './App.css';

function App() {
  const access = useMemo(() => parseAccess(window.location.pathname), []);
  const isAdmin = access.mode === 'admin';
  const accessKey = access.key;

  const [playerName, setPlayerName] = useState(localStorage.getItem('playerName') || '');
  const [playerId, setPlayerId] = useState(localStorage.getItem('playerId') || '');
  const [adminIsPlaying, setAdminIsPlaying] = useState(() => {
    if (!isAdmin) return false;
    const stored = localStorage.getItem('adminIsPlaying');
    return stored === null ? true : stored === 'true';
  });
  const [showConfig, setShowConfig] = useState(isAdmin);
  const [showGameInfo, setShowGameInfo] = useState(false);
  const [reuseEnabled, setReuseEnabled] = useState(true);

  useEffect(() => {
    if (!isAdmin || !accessKey) return;
    (async () => {
      try {
        const { data } = await getSessionData('shared:reuse-enabled', accessKey);
        if (typeof data === 'boolean') {
          setReuseEnabled(data);
        }
      } catch {
        // fallback to default
      }
    })();
  }, [isAdmin, accessKey]);

  async function handleReuseToggle(next: boolean) {
    setReuseEnabled(next);
    if (accessKey) {
      try {
        await setSessionData('shared:reuse-enabled', next, accessKey);
      } catch {
        // revert silently
      }
    }
  }

  const handleAdminIsPlaying = useCallback((next: boolean) => {
    setAdminIsPlaying(next);
    localStorage.setItem('adminIsPlaying', String(next));
  }, []);

  const clearPlayerIdentity = useCallback(() => {
    localStorage.removeItem('playerId');
    setPlayerId('');
  }, []);

  const handleUnauthorized = useCallback(() => {
    // Server rejected our key (e.g. server restarted with new keys).
    // Wipe local player identity; the URL key is now stale.
    clearPlayerIdentity();
  }, [clearPlayerIdentity]);

  const { serverState, connection } = useServerState({
    accessKey,
    waitingMessage:
      access.mode === 'none'
        ? 'Open this app from your invite link to continue.'
        : 'Connecting...',
    onUnauthorized: handleUnauthorized,
  });

  const gameInfo = serverState?.game;
  const gameId = gameInfo?.id || '';
  const gameName = gameInfo?.name || 'Game';
  const availableGames = serverState?.games || [];
  const settings = serverState?.settings;
  const availableCategories = settings?.categories || [];
  const selectedCategory = settings?.selectedCategory || '';
  const selectedCategories = settings?.selectedCategories || [];
  const categoryMode = settings?.categoryMode || 'single';

  const pluginConfig = useMemo(() => {
    return gamePluginRegistry.getConfig(gameId);
  }, [gameId]);

  const sharedWordPoolGames = useMemo(() => {
    return gamePluginRegistry
      .getAllConfigs()
      .filter((c) => c.sharesWordPool)
      .map((c) => c.name);
  }, []);

  const isSharedWordPoolGame = gameId
    ? gamePluginRegistry.getConfig(gameId)?.sharesWordPool ?? false
    : false;

  const sharedWordPoolLabel = useMemo(() => {
    if (sharedWordPoolGames.length < 2) return sharedWordPoolGames.join(', ');
    return sharedWordPoolGames.slice(0, -1).join(', ') + ', and ' + sharedWordPoolGames[sharedWordPoolGames.length - 1];
  }, [sharedWordPoolGames]);

  const activePlugin = useMemo(() => {
    if (!serverState || !gameId) return undefined;
    return gamePluginRegistry.findPluginForState(serverState, gameId);
  }, [serverState, gameId]);

  const isKnownPlayer = useMemo(() => {
    if (!playerId || !serverState?.players) return false;
    return serverState.players.some((player) => player.id === playerId);
  }, [playerId, serverState?.players]);

  const needsToJoinAsPlayer = isAdmin && adminIsPlaying && !isKnownPlayer;

  const phase = useMemo(() => {
    if (!serverState || !activePlugin) return 'idle';
    return activePlugin.getPhase(serverState);
  }, [serverState, activePlugin]);

  useEffect(() => {
    if (isAdmin && showConfig && phase !== 'idle' && phase !== 'finished' && phase !== 'results') {
      setShowConfig(false);
    }
  }, [isAdmin, phase, showConfig]);

  const prevPhaseRef = useMemo(() => ({ current: phase }), []);
  useEffect(() => {
    if (showGameInfo && prevPhaseRef.current === 'idle' && phase !== 'idle') {
      setShowGameInfo(false);
    }
    prevPhaseRef.current = phase;
  }, [phase, showGameInfo]);

  const isParticipating = isAdmin ? adminIsPlaying && isKnownPlayer : isKnownPlayer;
  const canSeeGame = isParticipating || (isAdmin && !adminIsPlaying);

  const renderGameView = () => {
    if (!serverState || !canSeeGame || !activePlugin) return null;

    return activePlugin.render({
      serverState,
      connection,
      playerId,
      playerName,
      accessKey,
      isAdmin,
      isParticipating,
      setShowConfig,
    });
  };

  const gameSlogan = pluginConfig?.slogan || '';
  const defaultMinutes = pluginConfig?.defaultTimer?.minutes || '01';
  const defaultSeconds = pluginConfig?.defaultTimer?.seconds || '30';
  const roundControlTitle = pluginConfig?.roundControlTitle || 'Round Control';
  const joinPanelTitle = pluginConfig?.joinPanelTitle || 'Join the Round';
  const minPlayers = pluginConfig?.minPlayers;
  const hideTimer = pluginConfig?.hideTimer || false;
  const customDuration = pluginConfig?.customDuration;
  const gameSettingsControls = pluginConfig?.gameSettings;
  const gameSettingsValues = (serverState as unknown as Record<string, unknown> | undefined)?.gameSettings as Record<string, unknown> | undefined;
  const playerCount = serverState?.players?.length || 0;

  const getGameDescription = useCallback((id: string) => {
    return gamePluginRegistry.getConfig(id)?.description;
  }, []);

  const getGameInfo = useCallback((id: string) => {
    const config = gamePluginRegistry.getConfig(id);
    if (!config) return undefined;
    return { name: config.name, description: config.description, instructions: config.instructions };
  }, []);

  const showPlayHeader = (phase === 'active' || phase === 'voting' || phase === 'results' || phase === 'finished')
    && canSeeGame
    && !showConfig;

  const headerCategory = useMemo(() => {
    if (!serverState || !activePlugin) return 'Category';
    return activePlugin.getHeaderCategory(serverState);
  }, [serverState, activePlugin]);

  if (access.mode === 'none') {
    return (
      <div className="app-container">
        <div className="app-content">
          <div className="card">
            <header className="app-header">
              <p className="app-header-label">
                <img src={iconImg} alt="" className="app-header-icon" />
                LANcade
              </p>
              <h1 className="app-header-title">Open your invite link</h1>
              <p className="app-header-description">
                Ask the host to share their player link, then tap it from your phone.
              </p>
            </header>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="app-content">
        <div className="card">
          {/* Game Info Button */}
          {pluginConfig && !showConfig && (
            <button
              type="button"
              className="app-info-button"
              onClick={() => setShowGameInfo(true)}
              aria-label={`How to play ${gameName}`}
            >
              i
            </button>
          )}

          {/* Header */}
          <header className="app-header">
            {showPlayHeader ? (
              <>
                <p className="app-header-label">{gameName}</p>
                <h1 className="app-header-title-small">{headerCategory}</h1>
              </>
            ) : (
              <>
                <p className="app-header-label">
                  <img src={iconImg} alt="" className="app-header-icon" />
                  {isAdmin ? 'Admin Console' : 'LANcade'}
                </p>
                <h1 className="app-header-title">{gameName}</h1>
                {gameSlogan && (
                  <p className="app-header-description">{gameSlogan}</p>
                )}
                {!gameId && (
                  <p className="app-header-description">Pick a game and start playing.</p>
                )}
              </>
            )}
          </header>

          {/* Config View for Admin */}
          {isAdmin && showConfig && (
            <>
              <AdminPanel
                accessKey={accessKey}
                isPlaying={adminIsPlaying}
                setIsPlaying={handleAdminIsPlaying}
                playerId={playerId}
                clearPlayerIdentity={clearPlayerIdentity}
              />
              {adminIsPlaying && (
                <JoinPanel
                  accessKey={accessKey}
                  playerName={playerName}
                  setPlayerName={setPlayerName}
                  playerId={playerId}
                  setPlayerId={setPlayerId}
                  title="Join as Player"
                />
              )}
              <GameSelector
                games={availableGames}
                selectedGameId={gameId}
                accessKey={accessKey}
                onUnauthorized={handleUnauthorized}
                getGameDescription={getGameDescription}
                getGameInfo={getGameInfo}
              />
              {availableCategories.length > 0 && (
                <CategorySelector
                  categories={availableCategories}
                  selectedCategory={selectedCategory}
                  selectedCategories={selectedCategories}
                  categoryMode={categoryMode}
                  accessKey={accessKey}
                  onUnauthorized={handleUnauthorized}
                />
              )}
              {isSharedWordPoolGame && (
                <Panel title="Cross-Game Word Reuse">
                  <label className="admin-panel-toggle-row">
                    <span className="admin-panel-toggle-label">Prevent reusing words</span>
                    <span className="admin-panel-toggle">
                      <input
                        type="checkbox"
                        checked={reuseEnabled}
                        onChange={(e) => handleReuseToggle(e.target.checked)}
                      />
                      <span className="admin-panel-toggle-track">
                        <span className="admin-panel-toggle-thumb" />
                      </span>
                    </span>
                  </label>
                  <p className="admin-panel-status">
                    {`Words submitted in previous games of ${sharedWordPoolLabel} will be ${reuseEnabled ? 'blocked' : 'allowed'}.`}
                  </p>
                </Panel>
              )}
              {gameSettingsControls && (
                <GameSettingsPanel
                  controls={gameSettingsControls}
                  values={gameSettingsValues || {}}
                  accessKey={accessKey}
                  onUnauthorized={handleUnauthorized}
                />
              )}
              <RoundControl
                accessKey={accessKey}
                onUnauthorized={handleUnauthorized}
                onRoundStarted={() => setShowConfig(false)}
                title={roundControlTitle}
                defaultMinutes={defaultMinutes}
                defaultSeconds={defaultSeconds}
                playerCount={playerCount}
                minPlayers={minPlayers}
                hideTimer={hideTimer}
                customDuration={customDuration}
                needsToJoinAsPlayer={needsToJoinAsPlayer}
              />
              <PlayerList
                players={serverState?.players || []}
                accessKey={accessKey}
                onUnauthorized={handleUnauthorized}
              />
            </>
          )}

          {/* Join View for Players (player-only URL — admin uses the panel above) */}
          {!isAdmin && !isKnownPlayer && (
            <JoinPanel
              accessKey={accessKey}
              playerName={playerName}
              setPlayerName={setPlayerName}
              playerId={playerId}
              setPlayerId={setPlayerId}
              title={joinPanelTitle}
            />
          )}

          {/* Game View */}
          {(!showConfig || !isAdmin) && renderGameView()}

          {/* Admin End Game Button - shown during any active game phase (not idle, finished, or results) */}
          {isAdmin && !showConfig && phase !== 'idle' && phase !== 'finished' && phase !== 'results' && (
            <EndGameButton
              accessKey={accessKey}
              onUnauthorized={handleUnauthorized}
              onEnded={() => setShowConfig(true)}
            />
          )}

          {/* How to Play link — shown during idle phase for players */}
          {pluginConfig && phase === 'idle' && !isAdmin && isKnownPlayer && (
            <button
              type="button"
              className="app-how-to-play"
              onClick={() => setShowGameInfo(true)}
            >
              How to Play
            </button>
          )}

          {/* App Links — shown when connected but no game in progress */}
          {serverState && (!gameId || phase === 'idle') && (
            <div className="app-links">
              <p className="app-links-text">
                Enjoying the games?{' '}
                <a className="app-links-link" href="https://play.google.com/store/apps/details?id=com.lancade.app" target="_blank" rel="noopener noreferrer">
                  Download the app
                </a>
                {' '}and become a LANcade party host yourself.
              </p>
              <p className="app-links-text">
                Tech savvy? Host the full games suite for free by{' '}
                <a className="app-links-link" href="https://github.com/ltmdum/LANcade" target="_blank" rel="noopener noreferrer">
                  cloning the repo
                </a>.
              </p>
              <p className="app-links-text">
                Help us improve LANcade by leaving{' '}
                <a className="app-links-link" href="https://ltmdum.github.io/LANcade/feedback.html" target="_blank" rel="noopener noreferrer">
                  feedback or suggestions
                </a>.
              </p>
            </div>
          )}

          {/* Connection Status */}
          {!serverState && (
            <div className="app-connection-status">
              {connection}
            </div>
          )}
        </div>
      </div>

      {/* Game Info Modal */}
      {showGameInfo && pluginConfig && (
        <GameInfoModal
          name={pluginConfig.name}
          description={pluginConfig.description}
          instructions={pluginConfig.instructions}
          gameId={gameId}
          onClose={() => setShowGameInfo(false)}
        />
      )}
    </div>
  );
}

export default App;
