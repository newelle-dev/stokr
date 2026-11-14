import * as React from 'react';

// Below lg: plain page body. From lg: the old card look, so desktop stays as it was.
export function PageBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="lg:rounded-[var(--radius-xl)] lg:border lg:border-[var(--border)] lg:bg-[var(--card)] lg:p-6 lg:shadow-xs">
      {children}
    </div>
  );
}
