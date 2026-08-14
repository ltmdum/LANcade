import './AppLinks.css';
import appStoreBadge from '../../assets/badges/app-store.svg';
import googlePlayBadge from '../../assets/badges/google-play.png';

const APP_STORE_URL = 'https://apps.apple.com/us/app/lancade-server/id6794334690';
const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=com.lancade.app';
const GITHUB_URL = 'https://github.com/ltmdum/LANcade';
const FEEDBACK_URL = 'https://ltmdum.github.io/LANcade/feedback.html';

/**
 * Download/feedback links panel shown when no game is in progress or after a game finishes.
 * Aims to convert players into app downloaders.
 */
export function AppLinks() {
  return (
    <div className="app-links">
      <h2 className="app-links-heading">Enjoying the games?</h2>
      <p className="app-links-subheading">Host your own LANcade parties</p>
      <div className="app-links-badges">
        <a
          className="app-badge"
          aria-label="Download LANcade from the Apple App Store"
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          <img src={appStoreBadge} alt="" />
        </a>
        <a
          className="app-badge"
          aria-label="Get LANcade on Google Play"
          href={GOOGLE_PLAY_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          <img src={googlePlayBadge} alt="" />
        </a>
      </div>
      <p className="app-links-secondary">
        Host the full games suite for free on PC by{' '}
        <a className="app-links-link" href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
          cloning the repo
        </a>
        .
      </p>
      <p className="app-links-secondary">
        Help us improve LANcade by leaving{' '}
        <a className="app-links-link" href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer">
          feedback or suggestions
        </a>
        .
      </p>
    </div>
  );
}