export type SkeletonKind = 'page' | 'home' | 'list' | 'form' | 'question';

export default function ContentSkeleton({ kind = 'list', label = 'Loading content', fullPage = false }: { kind?: SkeletonKind; label?: string; fullPage?: boolean }) {
  return <div className={`content-skeleton skeleton-${kind}${fullPage ? ' skeleton-full-page study-app' : ''}`} role="status" aria-label={label} aria-busy="true">
    <span className="sr-only">{label}</span>
    <div className="skeleton-shapes" aria-hidden="true">
      {fullPage && <div className="skeleton-top"><span className="skeleton-block skeleton-brand" /><span className="skeleton-block skeleton-circle" /></div>}
      {kind !== 'list' && <><span className="skeleton-block skeleton-title" /><span className="skeleton-block skeleton-short" /></>}
      {(kind === 'home' || kind === 'page') && <span className="skeleton-block skeleton-hero" />}
      {kind === 'question' && <div className="skeleton-question"><span className="skeleton-block" /><span className="skeleton-block" /><span className="skeleton-block skeleton-short" /></div>}
      <div className="skeleton-rows">{Array.from({ length: kind === 'question' ? 4 : 3 }, (_, index) => <div className="skeleton-row" key={index}>{kind === 'list' && <span className="skeleton-block skeleton-thumbnail" />}<span className="skeleton-row-copy"><span className="skeleton-block" /><span className="skeleton-block skeleton-short" /></span></div>)}</div>
    </div>
  </div>;
}
