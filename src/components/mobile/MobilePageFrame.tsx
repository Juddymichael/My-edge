import type { ReactNode } from 'react';

interface MobilePageFrameProps { title: string; description: string; children?: ReactNode; }

export function MobilePageFrame({ title, description, children }: MobilePageFrameProps) {
  return <section data-mobile-ui className="mobile-page-frame">
    <header className="mobile-page-header mobile-safe-container"><h1 className="mobile-safe-text">{title}</h1><p className="mobile-safe-text">{description}</p></header>
    {children}
  </section>;
}
