import { useState, useEffect, useMemo, useCallback } from 'react';
import { useServerState } from './shared/hooks/useServerState';
import { AdminPanel } from './shared/components/AdminPanel';
import { JoinPanel } from './shared/components/JoinPanel';
import { GameSelector } from './shared/components/GameSelector';
import { CategorySelector } from './shared/components/CategorySelector';
import { RoundControl } from './shared/components/RoundControl';
import { PlayerList } from './shared/components/PlayerList';
import { EndGameButton } from './shared/components/EndGameButton';
import { gamePluginRegistry } from './plugins';
import './App.css';

function App() {
  const isAdminPage = window.location.pathname === '/admin';
  
  const [adminSessionId, setAdminSessionId] = useState(
    localStorage.getItem('adminSessionId') || ''
  );
  const [playerName, setPlayerName] = useState(localStorage.getItem('playerName') || '');
  const [playerPassword, setPlayerPassword] = useState(localStorage.getItem('playerPassword') || '');
  const [playerId, setPlayerId] = useState(localStorage.getItem('playerId') || '');
  const [showConfig, setShowConfig] = useState(isAdminPage);

  const buildAuthQuery = useCallback(() => {
    if (isAdminPage && adminSessionId) {
      return `adminSessionId=${encodeURIComponent(adminSessionId)}`;
    }
    if (playerPassword) {
      return `password=${encodeURIComponent(playerPassword)}`;
    }
    return '';
  }, [isAdminPage, adminSessionId, playerPassword]);

  const authKey = `${adminSessionId || ''}|${playerPassword || ''}`;

  const handleAdminExpired = useCallback(() => {
    localStorage.removeItem('adminSessionId');
    setAdminSessionId('');
  }, []);

  const { serverState, connection } = useServerState({
    getAuthQuery: buildAuthQuery,
    authKey,
    waitingMessage: isAdminPage ? 'Waiting for admin or player access...' : 'Waiting for password...',
    onAdminUnauthorized: adminSessionId ? handleAdminExpired : undefined,
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

  // Get plugin configuration for the current game
  const pluginConfig = useMemo(() => {
    return gamePluginRegistry.getConfig(gameId);
  }, [gameId]);

  // Find the plugin that can render this game
  const activePlugin = useMemo(() => {
    if (!serverState || !gameId) return undefined;
    return gamePluginRegistry.findPluginForState(serverState, gameId);
  }, [serverState, gameId]);

  const isKnownPlayer = useMemo(() => {
    if (!playerId || !serverState?.players) return false;
    return serverState.players.some((player) => player.id === playerId);
  }, [playerId, serverState?.players]);

  const phase = useMemo(() => {
    if (!serverState || !activePlugin) return 'idle';
    return activePlugin.getPhase(serverState);
  }, [serverState, activePlugin]);

  useEffect(() => {
    if (isAdminPage && showConfig && phase !== 'idle' && phase !== 'finished' && phase !== 'results') {
      setShowConfig(false);
    }
  }, [isAdminPage, phase, showConfig]);

  const renderGameView = () => {
    const isActiveAdmin = isAdminPage && !!adminSessionId;
    if (!serverState || (!isKnownPlayer && !isActiveAdmin) || !activePlugin) return null;
    
    return activePlugin.render({
      serverState,
      connection,
      playerId,
      playerName,
      playerPassword,
      adminSessionId,
      isAdmin: isAdminPage && !!adminSessionId,
      setShowConfig,
    });
  };

  // Get slogan from plugin config for header display
  const gameSlogan = pluginConfig?.slogan || '';

  // Get timer defaults from plugin config
  const defaultMinutes = pluginConfig?.defaultTimer?.minutes || '01';
  const defaultSeconds = pluginConfig?.defaultTimer?.seconds || '30';
  const roundControlTitle = pluginConfig?.roundControlTitle || 'Round Control';
  const joinPanelTitle = pluginConfig?.joinPanelTitle || 'Join the Round';
  const minPlayers = pluginConfig?.minPlayers;
  const hideTimer = pluginConfig?.hideTimer || false;
  const playerCount = serverState?.players?.length || 0;

  // Function to get game description for the game selector info buttons
  const getGameDescription = useCallback((id: string) => {
    return gamePluginRegistry.getConfig(id)?.description;
  }, []);

  // Header display logic
  const showPlayHeader = (phase === 'active' || phase === 'voting' || phase === 'results' || phase === 'finished') 
    && (isKnownPlayer || isAdminPage) 
    && !showConfig;

  // Category display for header (delegated to plugin)
  const headerCategory = useMemo(() => {
    if (!serverState || !activePlugin) return 'Category';
    return activePlugin.getHeaderCategory(serverState);
  }, [serverState, activePlugin]);

  return (
    <div className="app-container">
      <div className="app-content">
        <div className="card">
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
                  {isAdminPage ? 'Admin Console' : 'LAN Game'}
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
          {isAdminPage && showConfig && (
            <>
              <AdminPanel 
                adminSessionId={adminSessionId}
                setAdminSessionId={setAdminSessionId}
              />
              <JoinPanel
                playerName={playerName}
                setPlayerName={setPlayerName}
                playerPassword={playerPassword}
                setPlayerPassword={setPlayerPassword}
                playerId={playerId}
                setPlayerId={setPlayerId}
                title="Join as Player"
              />
              <GameSelector
                games={availableGames}
                selectedGameId={gameId}
                adminSessionId={adminSessionId}
                onExpired={handleAdminExpired}
                getGameDescription={getGameDescription}
              />
              {availableCategories.length > 0 && (
                <CategorySelector
                  categories={availableCategories}
                  selectedCategory={selectedCategory}
                  selectedCategories={selectedCategories}
                  categoryMode={categoryMode}
                  adminSessionId={adminSessionId}
                  onExpired={handleAdminExpired}
                />
              )}
              <RoundControl
                adminSessionId={adminSessionId}
                onExpired={handleAdminExpired}
                onRoundStarted={() => setShowConfig(false)}
                title={roundControlTitle}
                defaultMinutes={defaultMinutes}
                defaultSeconds={defaultSeconds}
                playerCount={playerCount}
                minPlayers={minPlayers}
                hideTimer={hideTimer}
              />
              <PlayerList
                players={serverState?.players || []}
                adminSessionId={adminSessionId}
                onExpired={handleAdminExpired}
              />
            </>
          )}

          {/* Join View for Players */}
          {!isKnownPlayer && (!isAdminPage || !showConfig) && (
            <JoinPanel
              playerName={playerName}
              setPlayerName={setPlayerName}
              playerPassword={playerPassword}
              setPlayerPassword={setPlayerPassword}
              playerId={playerId}
              setPlayerId={setPlayerId}
              title={joinPanelTitle}
            />
          )}

          {/* Game View */}
          {(!showConfig || !isAdminPage) && renderGameView()}

          {/* Admin End Game Button - shown during any active game phase (not idle or finished) */}
          {isAdminPage && adminSessionId && !showConfig && phase !== 'idle' && phase !== 'finished' && phase !== 'results' && (
            <EndGameButton
              adminSessionId={adminSessionId}
              onExpired={handleAdminExpired}
              onEnded={() => setShowConfig(true)}
            />
          )}

          {/* Connection Status */}
          {!serverState && (
            <div className="app-connection-status">
              {connection}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
