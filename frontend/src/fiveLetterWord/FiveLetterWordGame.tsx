import { useState, useEffect, useMemo, useRef } from 'react';
import { PlayerGuess } from './components/PlayerGuess';
import { GuessGrid } from './components/GuessGrid';
import { GraceCountdown } from './components/GraceCountdown';
import { GameResult } from './components/GameResult';
import { PlayAgainPanel } from '../shared/components/PlayAgainPanel';
import { submitWord, startRound } from '../shared/utils/api';
import { Panel } from '../shared/components/Panel';
import { VolumeNotice } from '../shared/components/VolumeNotice';
import confetti from 'canvas-confetti';
import { playWinSound } from '../shared/utils/sounds';
import type { GameProps } from '../shared/types/GameProps';
import type { FiveLetterWordState } from '@lancade/shared';
import './FiveLetterWordGame.css';

interface FiveLetterWordGameProps extends GameProps {
  serverState: FiveLetterWordState;
}

function computeGreenLetters(grid: { letters: string[]; word: string }[]): (string | null)[] {
  const greens: (string | null)[] = [null, null, null, null, null];
  for (const row of grid) {
    for (let i = 0; i < row.letters.length; i++) {
      if (row.letters[i] === 'correct') {
        greens[i] = row.word[i];
      }
    }
  }
  return greens;
}

function computeForbiddenLetters(grid: { letters: string[]; word: string }[]): Set<string>[] {
  const forbidden: Set<string>[] = [new Set<string>(), new Set<string>(), new Set<string>(), new Set<string>(), new Set<string>()];
  for (const row of grid) {
    for (let i = 0; i < row.letters.length; i++) {
      if (row.letters[i] !== 'correct') {
        forbidden[i].add(row.word[i]);
      }
    }
  }
  return forbidden;
}

function computeMustIncludeLetters(grid: { letters: string[]; word: string }[]): Record<string, number> {
  const mustInclude: Record<string, number> = {};
  for (const row of grid) {
    const rowCounts: Record<string, number> = {};
    for (let i = 0; i < row.letters.length; i++) {
      if (row.letters[i] === 'present') {
        const letter = row.word[i];
        rowCounts[letter] = (rowCounts[letter] || 0) + 1;
      }
    }
    for (const [letter, count] of Object.entries(rowCounts)) {
      mustInclude[letter] = Math.max(mustInclude[letter] || 0, count);
    }
  }
  return mustInclude;
}

export function FiveLetterWordGame({
  serverState,
  playerId,
  accessKey,
  isAdmin,
  isParticipating,
  setShowConfig,
}: FiveLetterWordGameProps) {
  const [wordInput, setWordInput] = useState('');
  const [status, setStatus] = useState('');
  const [adminStatus, setAdminStatus] = useState('');
  const submittingRef = useRef(false);

  const match = serverState.match;
  const hardMode = (serverState as FiveLetterWordState).gameSettings?.hardMode === 1;

  const myState = useMemo(() => {
    return match.playerStates.find(s => s.playerId === playerId);
  }, [match.playerStates, playerId]);

  const greenLetters = useMemo(() => {
    if (!hardMode || !myState) return [null, null, null, null, null] as (string | null)[];
    return computeGreenLetters(myState.grid);
  }, [myState, hardMode]);

  const forbiddenLetters = useMemo(() => {
    if (!hardMode || !myState) return [new Set<string>(), new Set<string>(), new Set<string>(), new Set<string>(), new Set<string>()];
    return computeForbiddenLetters(myState.grid);
  }, [myState, hardMode]);

  const mustIncludeLetters = useMemo(() => {
    if (!hardMode || !myState) return {};
    return computeMustIncludeLetters(myState.grid);
  }, [myState, hardMode]);

  // Clear input on new match
  useEffect(() => {
    setWordInput('');
    setStatus('');
  }, [match.id]);

  const prevMatchStateRef = useRef(match.state);

  useEffect(() => {
    if (
      match.state === 'finished' &&
      prevMatchStateRef.current !== 'finished' &&
      match.winnerId !== null &&
      match.winnerId === playerId
    ) {
      playWinSound();
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      confetti({ particleCount: 100, spread: 80, origin: { x: 1, y: 0.6 } });
    }
    prevMatchStateRef.current = match.state;
  }, [match.state, match.winnerId, playerId]);

  async function handleSubmit() {
    if (submittingRef.current) {
      setStatus('Still processing previous guess...');
      return;
    }
    const nonGreenCount = greenLetters.filter(l => !l).length;
    if (wordInput.length !== nonGreenCount) {
      setStatus('Enter a 5-letter word');
      return;
    }

    const chars: string[] = [];
    let typedIndex = 0;
    for (let i = 0; i < 5; i++) {
      chars.push(greenLetters[i] || wordInput[typedIndex++] || '');
    }
    const fullWord = chars.join('');

    if (hardMode) {
      for (const [letter, required] of Object.entries(mustIncludeLetters)) {
        const actual = fullWord.split('').filter(c => c === letter).length;
        if (actual < required) {
          setStatus('Must use all discovered letters');
          return;
        }
      }

      for (let i = 0; i < 5; i++) {
        if (!greenLetters[i] && forbiddenLetters[i].has(fullWord[i])) {
          setStatus('Letter already ruled out at this position');
          return;
        }
      }
    }

    setStatus('');
    submittingRef.current = true;
    const safetyTimer = setTimeout(() => {
      submittingRef.current = false;
    }, 10000);
    try {
      const { response, data } = await submitWord(playerId, fullWord, accessKey);
      clearTimeout(safetyTimer);
      submittingRef.current = false;
      
      if (!response.ok) {
        const reason = data?.reason || 'unknown';
        const messages: Record<string, string> = {
          round_not_active: 'Game is not active',
          invalid_length: 'Word must be 5 letters',
          invalid_word: 'Not a valid word',
          already_solved: 'You already solved it!',
          out_of_guesses: 'No more guesses left',
          hard_mode_wrong_position: 'A green letter must stay in its position',
        };
        setStatus(messages[reason] || 'Could not submit word');
        return;
      }

      setWordInput('');
      setStatus('');
    } catch {
      clearTimeout(safetyTimer);
      setStatus('Could not submit word');
      submittingRef.current = false;
    }
  }

  async function handlePlayAgain() {
    setAdminStatus('');
    try {
      const { response } = await startRound(1000, accessKey);

      if (!response.ok) {
        setAdminStatus('Could not restart');
        return;
      }

      setShowConfig(false);
    } catch {
      setAdminStatus('Could not restart');
    }
  }

  if (match.state === 'idle') {
    return (
      <Panel>
        <VolumeNotice />
      </Panel>
    );
  }

  const canType = isParticipating && match.state === 'active' && myState && !myState.solved && myState.grid.length < 6;
  const canTypeGrace = isParticipating && match.state === 'grace' && myState && !myState.solved && myState.grid.length < 6;

  return (
    <div className="wordsprint-game">
      {/* Active state — normal play */}
      {match.state === 'active' && isParticipating && (
        <PlayerGuess
          playerState={myState}
          rowBests={match.rowBests}
          wordInput={wordInput}
          onWordInputChange={setWordInput}
          onSubmit={handleSubmit}
          isInputEnabled={!!canType}
          status={status}
          greenLetters={greenLetters}
        />
      )}
      {match.state === 'active' && !isParticipating && (
        <PlayerGuess
          playerState={undefined}
          rowBests={match.rowBests}
          wordInput=""
          onWordInputChange={() => {}}
          onSubmit={() => {}}
          isInputEnabled={false}
          status=""
          greenLetters={[null, null, null, null, null]}
        />
      )}

      {/* Grace state — someone solved */}
      {match.state === 'grace' && isParticipating && myState?.solved && (
        <>
          <GraceCountdown graceEndsAt={match.graceEndsAt ?? 0} solved />
          <GuessGrid
            grid={myState.grid}
            currentRow={myState.grid.length}
            currentInput=""
            isInputEnabled={false}
            rowBests={match.rowBests}
            greenLetters={[null, null, null, null, null]}
          />
        </>
      )}
      {match.state === 'grace' && isParticipating && !myState?.solved && (
        <>
          <GraceCountdown graceEndsAt={match.graceEndsAt ?? 0} solved={false} />
          <PlayerGuess
            playerState={myState}
            rowBests={match.rowBests}
            wordInput={wordInput}
            onWordInputChange={setWordInput}
            onSubmit={handleSubmit}
            isInputEnabled={!!canTypeGrace}
            status={status}
            greenLetters={greenLetters}
          />
        </>
      )}
      {match.state === 'grace' && !isParticipating && (
        <PlayerGuess
          playerState={undefined}
          rowBests={match.rowBests}
          wordInput=""
          onWordInputChange={() => {}}
          onSubmit={() => {}}
          isInputEnabled={false}
          status=""
          greenLetters={[null, null, null, null, null]}
        />
      )}

      {/* Finished state — results */}
      {match.state === 'finished' && (
        <div className="game-results-wrapper">
          <GameResult
            winnerId={match.winnerId}
            winnerName={match.winnerName}
            targetWord={match.targetWord}
            currentPlayerId={playerId}
            playerStates={match.playerStates}
            finishOrder={match.finishOrder}
          />

          {isAdmin && (
            <PlayAgainPanel
              onPlayAgain={handlePlayAgain}
              onBackToConfig={() => setShowConfig(true)}
              status={adminStatus}
              title="Next Steps"
            />
          )}
        </div>
      )}
    </div>
  );
}
