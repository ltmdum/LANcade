import { useState, useEffect, useRef, useCallback } from 'react';
import { NumberField } from './NumberField';

interface OrderInputProps {
  onSubmit: (bid: number, offer: number) => void;
  disabled?: boolean;
  /** Current bid in the order book (null if traded or not placed). */
  currentBid: number | null;
  /** Current offer in the order book (null if traded or not placed). */
  currentOffer: number | null;
  /** Price to show in bid when not in the book (last buy price, already rounded). */
  fallbackBid: number | null;
  /** Price to show in offer when not in the book (last sell price, already rounded). */
  fallbackOffer: number | null;
  /** Whether the bid side just traded (show "not in market" state). */
  bidTraded?: boolean;
  /** Whether the offer side just traded (show "not in market" state). */
  offerTraded?: boolean;
  /** Timestamp when auto-submit will fire (null if not active). */
  autoSubmitEndsAt?: number | null;
  /** Clock skew for accurate countdown display. */
  clockSkewMs?: number;
  status?: string;
}

/**
 * Bid/offer input with +/- arrows and submit button below.
 * When a side trades, shows the last trade price with a visual indicator.
 * Bid and offer are coupled: bid always stays below offer.
 * Auto-submits the current input values when the countdown reaches 0.
 * @param props Order input props.
 * @returns Order input element.
 */
export function OrderInput({
  onSubmit,
  disabled = false,
  currentBid,
  currentOffer,
  fallbackBid,
  fallbackOffer,
  bidTraded = false,
  offerTraded = false,
  autoSubmitEndsAt,
  clockSkewMs = 0,
  status,
}: OrderInputProps) {
  const displayBid = currentBid ?? fallbackBid;
  const displayOffer = currentOffer ?? fallbackOffer;

  const [bid, setBid] = useState<string>(displayBid !== null ? String(displayBid) : '');
  const [offer, setOffer] = useState<string>(displayOffer !== null ? String(displayOffer) : '');
  const [error, setError] = useState('');
  const [autoSubmitSeconds, setAutoSubmitSeconds] = useState<number | null>(null);
  const prevDisplayBidRef = useRef(displayBid);
  const prevDisplayOfferRef = useRef(displayOffer);
  const bidRef = useRef(bid);
  const offerRef = useRef(offer);
  const onSubmitRef = useRef(onSubmit);
  bidRef.current = bid;
  offerRef.current = offer;
  onSubmitRef.current = onSubmit;

  useEffect(() => {
    if (displayBid !== null && displayBid !== prevDisplayBidRef.current) {
      setBid(String(displayBid));
    }
    prevDisplayBidRef.current = displayBid;
  }, [displayBid]);

  useEffect(() => {
    if (displayOffer !== null && displayOffer !== prevDisplayOfferRef.current) {
      setOffer(String(displayOffer));
    }
    prevDisplayOfferRef.current = displayOffer;
  }, [displayOffer]);

  useEffect(() => {
    if (!autoSubmitEndsAt) {
      setAutoSubmitSeconds(null);
      return;
    }
    function tick() {
      const adjusted = Date.now() - clockSkewMs;
      const remainingMs = autoSubmitEndsAt! - adjusted;
      const seconds = Math.ceil(Math.max(0, remainingMs) / 1000);
      if (remainingMs <= 0) {
        setAutoSubmitSeconds(null);
        submitFromRefs();
        return;
      }
      setAutoSubmitSeconds(seconds);
    }
    tick();
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [autoSubmitEndsAt, clockSkewMs]);

  /** Submit using current ref values (called from timer callback). */
  function submitFromRefs(): void {
    const bidNum = parseInt(bidRef.current, 10);
    const offerNum = parseInt(offerRef.current, 10);
    if (Number.isFinite(bidNum) && Number.isFinite(offerNum) && bidNum < offerNum && bidNum >= 0) {
      onSubmitRef.current(bidNum, offerNum);
    }
  }

  const handleBidChange = useCallback((v: string) => {
    setBid(v);
    const bidNum = parseInt(v, 10);
    if (!Number.isFinite(bidNum)) return;
    const offerNum = parseInt(offer, 10);
    if (!Number.isFinite(offerNum) || bidNum >= offerNum) {
      setOffer(String(bidNum + 1));
    }
  }, [offer]);

  const handleOfferChange = useCallback((v: string) => {
    setOffer(v);
    const offerNum = parseInt(v, 10);
    if (!Number.isFinite(offerNum)) return;
    const bidNum = parseInt(bid, 10);
    if (!Number.isFinite(bidNum) || offerNum <= bidNum) {
      setBid(String(Math.max(0, offerNum - 1)));
    }
  }, [bid]);

  function handleSubmit() {
    const bidNum = parseInt(bid, 10);
    const offerNum = parseInt(offer, 10);
    if (!Number.isFinite(bidNum) || !Number.isFinite(offerNum)) {
      setError('Enter both bid and offer');
      return;
    }
    if (bidNum < 0 || offerNum < 0) {
      setError('Values must be positive');
      return;
    }
    if (bidNum >= offerNum) {
      setError('Bid must be less than offer');
      return;
    }
    setError('');
    onSubmit(bidNum, offerNum);
  }

  const buttonText = autoSubmitSeconds !== null
    ? `Submit (${autoSubmitSeconds}s)`
    : 'Submit';

  return (
    <div className="te-order-input">
      <div className="te-order-input__fields">
        <NumberField
          label={bidTraded ? 'Bid (not in market)' : 'Bid'}
          value={bid}
          onChange={handleBidChange}
          disabled={disabled}
          highlight={bidTraded ? 'buy' : null}
        />
        <NumberField
          label={offerTraded ? 'Offer (not in market)' : 'Offer'}
          value={offer}
          onChange={handleOfferChange}
          disabled={disabled}
          highlight={offerTraded ? 'sell' : null}
        />
      </div>
      <button
        type="button"
        className={`btn btn-primary te-order-input__btn ${autoSubmitSeconds !== null ? 'te-order-input__btn--countdown' : ''}`}
        onClick={handleSubmit}
        disabled={disabled || !bid || !offer}
      >
        {buttonText}
      </button>
      {error && <p className="te-order-input__error">{error}</p>}
      {status && <p className="te-order-input__status">{status}</p>}
    </div>
  );
}
