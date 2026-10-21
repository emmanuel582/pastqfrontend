import { useId, type CSSProperties } from 'react';
import { skeletonShapes, type SkeletonShapeName } from './skeletonShapes';

export function imageSkeletonShape(src?: string): SkeletonShapeName | null {
  if (!src) return null;
  const path = src.split(/[?#]/)[0];
  if (path.endsWith('/images/exams/jamb.png')) return 'jamb';
  if (path.endsWith('/images/exams/waec.png')) return 'waec';
  if (path.endsWith('/pets/scholar/67.webp')) return 'scholar-account';
  if (path.endsWith('/pets/scholar/wave.png')) return 'scholar-wave';
  if (/\/pastq-icon(?:-\d+)?\.(png|svg)$/.test(path)) return 'pastq';
  return null;
}

export default function SkeletonShape({ shape, className = '', style }: { shape: SkeletonShapeName; className?: string; style?: CSSProperties }) {
  const id = useId().replace(/:/g, '');
  const source = skeletonShapes[shape];
  return <svg className={`skeleton-silhouette ${className}`} data-skeleton-shape={shape} viewBox={source.viewBox} style={style} aria-hidden="true" focusable="false">
    <defs><linearGradient id={id}><stop offset="0" stopColor="var(--skeleton-base)" /><stop offset=".5" stopColor="var(--skeleton-highlight)" /><stop offset="1" stopColor="var(--skeleton-base)" /></linearGradient></defs>
    <path d={source.path} fill={`url(#${id})`} fillRule="evenodd" />
  </svg>;
}
