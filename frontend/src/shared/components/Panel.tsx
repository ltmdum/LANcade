import React from 'react';
import './Panel.css';

interface PanelProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Shared panel wrapper with optional title.
 * @param props Panel properties.
 * @returns Panel section element.
 */
export function Panel({ title, children, className = '' }: PanelProps) {
  return (
    <section className={`panel ${className}`}>
      {title && <h2 className="panel-title">{title}</h2>}
      {children}
    </section>
  );
}
