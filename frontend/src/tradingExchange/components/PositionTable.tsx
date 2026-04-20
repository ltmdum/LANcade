import { useState, useMemo, useEffect, useRef } from 'react';
import type { TradingExchangeTrade } from '@lancade/shared';
import { NumberField } from './NumberField';
import {
  computePosition,
  computeRealizedPnl,
  computeAverageOutstandingPrice,
  computePnlEstimate,
  getPlayerTrades,
  excludeSettlementTrades,
} from '../utils/calculations';

interface PositionTableProps {
  trades: TradingExchangeTrade[];
  playerId: string;
  /** Pre-calculated seed for the estimate field. */
  estimateSeed: number | null;
}

/**
 * Display the player's trading position, P&L, average price, and estimate.
 * @param props Position table props.
 * @returns Position table element.
 */
export function PositionTable({ trades, playerId, estimateSeed }: PositionTableProps) {
  const [estimate, setEstimate] = useState<string>('');
  const seededRef = useRef(false);

  const liveTrades = useMemo(() => excludeSettlementTrades(trades), [trades]);
  const playerTrades = useMemo(
    () => getPlayerTrades(liveTrades, playerId),
    [liveTrades, playerId],
  );
  const position = useMemo(
    () => computePosition(liveTrades, playerId),
    [liveTrades, playerId],
  );
  const realizedPnl = useMemo(() => computeRealizedPnl(playerTrades), [playerTrades]);
  const avgPrice = useMemo(
    () => computeAverageOutstandingPrice(playerTrades),
    [playerTrades],
  );
  useEffect(() => {
    if (seededRef.current || estimateSeed === null) return;
    seededRef.current = true;
    setEstimate(String(estimateSeed));
  }, [estimateSeed]);

  const estimateNum = estimate !== '' ? parseInt(estimate, 10) : null;
  const pnlEstimate = useMemo(() => {
    if (estimateNum === null || !Number.isFinite(estimateNum)) return null;
    return computePnlEstimate(playerTrades, estimateNum);
  }, [playerTrades, estimateNum]);

  return (
    <div className="te-position-table">
      <PositionRow label="Position" value={formatPosition(position)} />
      <PositionRow label="P&L" value={formatPnl(realizedPnl)} className={pnlClass(realizedPnl)} />
      <PositionRow label="Avg Price" value={avgPrice !== null ? avgPrice.toFixed(1) : '-'} />
      <EstimateRow estimate={estimate} setEstimate={setEstimate} pnlEstimate={pnlEstimate} />
    </div>
  );
}

interface PositionRowProps {
  label: string;
  value: string;
  className?: string;
}

function PositionRow({ label, value, className = '' }: PositionRowProps) {
  return (
    <div className="te-position-row">
      <span className="te-position-row__label">{label}</span>
      <span className={`te-position-row__value ${className}`}>{value}</span>
    </div>
  );
}

interface EstimateRowProps {
  estimate: string;
  setEstimate: (v: string) => void;
  pnlEstimate: number | null;
}

function EstimateRow({ estimate, setEstimate, pnlEstimate }: EstimateRowProps) {
  return (
    <div className="te-position-row te-position-row--estimate">
      <NumberField
        label="Estimate"
        value={estimate}
        onChange={setEstimate}
        className="te-estimate-field"
      />
      <div className="te-position-row__pnl-result">
        <span className="te-position-row__label">Est. P&L</span>
        <span className={`te-position-row__value ${pnlEstimate !== null ? pnlClass(pnlEstimate) : ''}`}>
          {pnlEstimate !== null ? formatPnl(pnlEstimate) : '-'}
        </span>
      </div>
    </div>
  );
}

function formatPosition(pos: number): string {
  if (pos > 0) return `+${pos}`;
  return String(pos);
}

function formatPnl(pnl: number): string {
  if (pnl > 0) return `+${pnl.toFixed(1)}`;
  return pnl.toFixed(1);
}

function pnlClass(pnl: number): string {
  if (pnl > 0) return 'te-pnl--positive';
  if (pnl < 0) return 'te-pnl--negative';
  return '';
}

