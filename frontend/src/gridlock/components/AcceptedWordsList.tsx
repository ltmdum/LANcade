import './AcceptedWordsList.css';

interface AcceptedWord {
  id: string;
  word: string;
}

interface AcceptedWordsListProps {
  words: AcceptedWord[];
}

/**
 * Show the player's accepted words this round with the points each one earned
 * (one point per letter).
 * @param props Accepted words list props.
 * @returns Accepted words list element.
 */
export function AcceptedWordsList({ words }: AcceptedWordsListProps) {
  if (words.length === 0) {
    return <p className="accepted-words-empty">No words yet — make one from the tiles!</p>;
  }
  return (
    <ul className="accepted-words-list">
      {words.map((entry) => (
        <li key={entry.id} className="accepted-words-item">
          <span className="accepted-words-word">{entry.word}</span>
          <span className="accepted-words-points">+{entry.word.length}</span>
        </li>
      ))}
    </ul>
  );
}
