import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export default function StudyDialog({ title, children, onClose, drawer = false, className = '' }: { title: string; children: ReactNode; onClose: () => void; drawer?: boolean; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const dialog = ref.current; dialog?.showModal();
    return () => { dialog?.close(); previous?.focus(); };
  }, []);
  return <dialog ref={ref} aria-label={title} className={`study-dialog ${drawer ? 'question-drawer' : ''} ${className}`} onCancel={event => { event.preventDefault(); closeRef.current(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="dialog-heading"><h2>{title}</h2><button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={20} /></button></div>{children}
  </dialog>;
}
