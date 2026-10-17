import { useEffect, useRef, useState, type ImgHTMLAttributes, type ReactNode } from 'react';
import { whenImageReady } from '../../utils/imageReadiness';

type Props = ImgHTMLAttributes<HTMLImageElement> & { frameClassName?: string; fallback?: ReactNode };
function DecodedImage({ frameClassName = '', fallback, ...props }: Props) {
  const image = useRef<HTMLImageElement>(null);
  const [state, setState] = useState<'pending' | 'ready' | 'failed'>('pending');
  useEffect(() => image.current ? whenImageReady(image.current, () => setState('ready'), () => setState('failed')) : undefined, []);
  return <span className={`ready-image ${frameClassName}`} data-state={state} aria-busy={state === 'pending'}>
    {state !== 'failed' && <img {...props} decoding="async" ref={image} />}
    {state === 'pending' && <span className="skeleton-block image-skeleton" aria-hidden="true" />}
    {state === 'failed' && (fallback || <span className="image-fallback" role="status">Image unavailable</span>)}
  </span>;
}
export default function ReadyImage(props: Props) { return <DecodedImage key={props.src} {...props} />; }
