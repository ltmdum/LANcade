import { OrderInput } from './OrderInput';

interface AuctionPanelProps {
  hasSubmitted: boolean;
  totalPlayers: number;
  submittedCount: number;
  onSubmit: (bid: number, offer: number) => void;
  fallbackBid: number | null;
  fallbackOffer: number | null;
  bidTraded: boolean;
  offerTraded: boolean;
  status?: string;
}

/**
 * UI for the auction phase: submit blind bid/offer pair.
 * @param props Auction panel props.
 * @returns Auction panel element.
 */
export function AuctionPanel({
  hasSubmitted,
  totalPlayers,
  submittedCount,
  onSubmit,
  fallbackBid,
  fallbackOffer,
  bidTraded,
  offerTraded,
  status,
}: AuctionPanelProps) {
  return (
    <div className="te-auction">
      <h3 className="te-auction__title">Auction</h3>
      <p className="te-auction__desc">
        Submit your bid (lower estimate) and offer (upper estimate) for the sum of all cards.
      </p>
      {hasSubmitted ? (
        <p className="te-auction__waiting">
          Waiting for other players ({submittedCount}/{totalPlayers})
        </p>
      ) : (
        <OrderInput
          onSubmit={onSubmit}
          currentBid={null}
          currentOffer={null}
          fallbackBid={fallbackBid}
          fallbackOffer={fallbackOffer}
          bidTraded={bidTraded}
          offerTraded={offerTraded}
          status={status}
        />
      )}
    </div>
  );
}
