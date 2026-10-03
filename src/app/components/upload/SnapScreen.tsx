import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { ArrowDown, ArrowUp, ArrowRight, BookOpen, Camera, FileText, Plus, Upload, X } from 'lucide-react';
import { supabase } from '../../../services/supabase';
import { uploadMaterial, type MaterialUploadProgress } from '../../../services/materialUpload';
import { classifyMaterialFiles, isPhoneCameraDevice, MATERIAL_ACCEPT } from '../../../utils/materialFiles';
import { sortUploadFiles } from '../../../services/vision';
import ScholarMascot from '../ScholarMascot';

export type UploadDraft = { files: File[]; name: string };

function PaperIllustration() {
  return <svg className="upload-paper-art" viewBox="0 0 180 168" fill="none" aria-hidden="true">
    <rect x="40" y="26" width="100" height="126" rx="4" transform="rotate(-10 40 26)" fill="var(--study-control)" stroke="var(--study-line)" />
    <rect x="57" y="13" width="100" height="132" rx="4" transform="rotate(6 57 13)" fill="var(--study-bg)" stroke="var(--study-art-ink)" strokeOpacity=".5" />
    <g transform="rotate(6 57 13)">
      <path d="M74 36h47" stroke="var(--study-ink)" strokeWidth="3" strokeLinecap="round" />
      <path d="M74 47h30M74 66h65M74 73h51M74 99h65M74 106h45" stroke="var(--study-art-ink)" strokeOpacity=".4" strokeWidth="2" strokeLinecap="round" />
      <circle cx="78" cy="85" r="3" stroke="var(--study-art-ink)" strokeOpacity=".5" /><circle cx="93" cy="85" r="3" stroke="var(--study-accent)" />
      <path d="M78 120h45" stroke="var(--study-art-ink)" strokeOpacity=".35" strokeWidth="2" strokeLinecap="round" />
    </g>
    <path d="m26 128 21 21 45-47" stroke="var(--study-accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

function FilePreview({ file }: { file: File }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!file.type.startsWith('image/')) return;
    const objectUrl = URL.createObjectURL(file); setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return <span className="upload-file-preview">{url ? <img src={url} alt="" onError={() => setUrl('')} /> : <FileText size={20} strokeWidth={1.4} />}</span>;
}

function fileSize(bytes: number) { return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`; }

export default function SnapScreen({ nav, onSessionStarted, draft, onDraftChange }: {
  nav: (screen: 'manual-entry' | 'processing' | 'login') => void;
  onSessionStarted: (sessionId: string) => void;
  draft: UploadDraft; onDraftChange: (draft: UploadDraft) => void;
}) {
  const [files, setFiles] = useState<File[]>(draft.files);
  const [name, setName] = useState(draft.name);
  const [error, setError] = useState('');
  const [needsLogin, setNeedsLogin] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<MaterialUploadProgress>({ done: 0, total: 0, label: '' });
  const [dragging, setDragging] = useState(false);
  const [phone] = useState(() => isPhoneCameraDevice(navigator.userAgent, (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData?.mobile));
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [capturing, setCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const captureRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraRequest = useRef(0);
  const active = useRef(true);
  const uploadLock = useRef(false);
  useEffect(() => { onDraftChange({ files, name }); }, [files, name, onDraftChange]);

  function closeCamera() {
    cameraRequest.current++;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false); setCameraStarting(false); setCameraReady(false); setCapturing(false);
  }
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; cameraRequest.current++; streamRef.current?.getTracks().forEach(track => track.stop()); };
  }, []);
  useEffect(() => {
    if (!cameraOpen || !streamRef.current || !videoRef.current) return;
    const video = videoRef.current;
    const request = cameraRequest.current;
    video.srcObject = streamRef.current;
    void video.play().catch(() => {
      if (active.current && request === cameraRequest.current) { closeCamera(); setCameraError('The preview could not open. Use your phone’s camera or choose a photo.'); }
    });
  }, [cameraOpen]);

  async function openCamera() {
    if (!phone || cameraStarting || uploading) return;
    setCameraError('');
    // Native capture also works in phone browsers without a live-preview API.
    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) { captureRef.current?.click(); return; }
    const request = ++cameraRequest.current;
    setCameraStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: {
        facingMode: { ideal: 'environment' }, width: { ideal: 2560 }, height: { ideal: 1920 },
      } });
      if (!active.current || request !== cameraRequest.current) { stream.getTracks().forEach(track => track.stop()); return; }
      streamRef.current = stream;
      stream.getVideoTracks().forEach(track => track.addEventListener('ended', () => {
        if (active.current && request === cameraRequest.current) { closeCamera(); setCameraError('The camera stopped. Open it again, or choose a photo.'); }
      }, { once: true }));
      setCameraReady(false); setCameraOpen(true);
    } catch {
      if (active.current && request === cameraRequest.current) setCameraError('Allow camera access, or use your phone’s camera below. You can also choose an existing photo.');
    } finally {
      if (active.current && request === cameraRequest.current) setCameraStarting(false);
    }
  }

  function addFiles(incoming: File[]) {
    if (uploadLock.current || !incoming.length) return;
    setError(''); setNeedsLogin(false);
    // Sort only the new selection; never undo the student's manual page order.
    setFiles(current => [...current, ...sortUploadFiles(incoming)]);
  }
  function choose(event: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.target.files || []));
    event.target.value = '';
  }
  function move(index: number, direction: -1 | 1) {
    setFiles(current => {
      const next = [...current]; const other = index + direction;
      if (other < 0 || other >= current.length) return current;
      [next[index], next[other]] = [next[other], next[index]];
      return next;
    });
  }
  function capturePhoto() {
    const video = videoRef.current;
    if (!video || !cameraReady || capturing || !video.videoWidth || !video.videoHeight) return;
    setCapturing(true);
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) { setCapturing(false); setCameraError('Could not take this photo. Please try again.'); return; }
    context.drawImage(video, 0, 0);
    const request = cameraRequest.current;
    canvas.toBlob(blob => {
      if (!active.current || request !== cameraRequest.current) return;
      if (!blob) { setCapturing(false); setCameraError('Could not take this photo. Please try again.'); return; }
      const photo = new File([blob], `page_${Date.now()}.jpg`, { type: 'image/jpeg' });
      closeCamera(); addFiles([photo]); setCameraError('');
    }, 'image/jpeg', .94);
  }
  async function submit() {
    if (uploadLock.current || !files.length) return;
    uploadLock.current = true;
    setError(''); setNeedsLogin(false); setUploading(true);
    setProgress({ done: 0, total: files.length, label: 'Preparing your material' });
    try {
      classifyMaterialFiles(files);
      const { data, error: authError } = await supabase.auth.getSession();
      if (authError || !data.session) { setNeedsLogin(true); throw new Error('Sign in to upload. Your chosen files are kept.'); }
      const id = await uploadMaterial(files, name, next => { if (active.current) setProgress(next); });
      if (active.current) { onDraftChange({ files: [], name: '' }); onSessionStarted(id); nav('processing'); }
    } catch (failure) {
      if (active.current) {
        const message = failure instanceof Error ? failure.message : 'Your upload did not finish. Please try again.';
        setError(message);
        if (/sign in/i.test(message)) setNeedsLogin(true);
      }
    } finally {
      uploadLock.current = false;
      if (active.current) setUploading(false);
    }
  }
  function drop(event: DragEvent) {
    event.preventDefault(); setDragging(false); addFiles(Array.from(event.dataTransfer.files));
  }

  return <main className="study-app upload-screen">
    <header className="study-topbar"><span className="wordmark">past<span>q</span><span className="wordmark-rule" /></span><span className="upload-page-label">Add questions</span></header>
    <input ref={fileRef} className="upload-file-input" type="file" aria-label="Choose material files" accept={MATERIAL_ACCEPT} multiple disabled={uploading} onChange={choose} />
    <input ref={captureRef} className="upload-file-input" type="file" aria-label="Take a photo with your phone camera" accept="image/*" capture="environment" disabled={uploading} onChange={choose} />
    <div className="upload-layout">
      <section className="upload-intro"><h1>Turn your paper<br />into practice.</h1><p>{phone ? 'A photo, a file, a fresh start.' : 'Please upload your question paper, or use your phone to take a photo.'}</p></section>
      <section className={`upload-material ${files.length ? 'has-files' : ''} ${dragging ? 'is-dragging' : ''}`} aria-label="Your material" onDragOver={e => { e.preventDefault(); if (!uploading) setDragging(true); }} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false); }} onDrop={drop}>
        {!files.length ? <div className="upload-empty"><PaperIllustration /><div className="upload-empty-content"><h2>{dragging ? 'Drop it here.' : 'Bring your questions.'}</h2><p>Photos, PDF or text</p><button className="study-primary" onClick={() => fileRef.current?.click()}><Upload size={18} />Choose files<ArrowRight size={18} /></button><span className="upload-drop-note">{phone ? 'Select one page or a whole paper.' : 'Or drag your files into this space.'}</span></div></div> : <>
          <label className="upload-name">Material name<input placeholder="e.g. Chemistry revision" value={name} disabled={uploading} onChange={e => setName(e.target.value)} /></label>
          <div className="upload-selection-heading"><h2>{files.length} file{files.length === 1 ? '' : 's'} selected</h2><button className="text-button" disabled={uploading} onClick={() => fileRef.current?.click()}><Plus size={16} />Add files</button></div>
          <ol className="upload-file-list">{files.map((file, index) => <li key={`${file.name}-${index}`}><span className="upload-file-number">{String(index + 1).padStart(2, '0')}</span><FilePreview file={file} /><span className="upload-file-info"><span className="upload-filename" title={file.name}>{file.name}</span><span className="upload-file-size">{fileSize(file.size)}</span></span><div className="upload-file-actions">
            <button className="icon-button" aria-label={`Move ${file.name} up`} disabled={uploading || index === 0} onClick={() => move(index, -1)}><ArrowUp size={16} /></button>
            <button className="icon-button" aria-label={`Move ${file.name} down`} disabled={uploading || index === files.length - 1} onClick={() => move(index, 1)}><ArrowDown size={16} /></button>
            <button className="icon-button" aria-label={`Remove ${file.name}`} disabled={uploading} onClick={() => setFiles(current => current.filter((_, i) => i !== index))}><X size={17} /></button>
          </div></li>)}</ol>
          {error && <div className="upload-error" role="alert"><p>{error}</p>{needsLogin && <button className="study-secondary" onClick={() => nav('login')}>Sign in</button>}</div>}
          {uploading && <div className="upload-progress" role="status" aria-live="polite"><ScholarMascot compact /><div><p>{progress.label || 'Preparing your material'}</p><div className="study-loading-track" role="progressbar" aria-label="Uploading material" aria-valuemin={0} aria-valuemax={progress.total || undefined} aria-valuenow={progress.total ? progress.done : undefined}><span style={{ width: progress.total ? `${progress.done / progress.total * 100}%` : '0%' }} /></div></div></div>}
          <button className="study-primary upload-submit" disabled={uploading} onClick={() => void submit()}>{uploading ? 'Uploading…' : 'Prepare questions'}<Upload size={18} /></button>
        </>}
      </section>
      {!uploading && <div className="upload-alternatives">
        {phone && <button className="upload-alternative" onClick={() => void openCamera()} disabled={cameraStarting}><Camera size={21} strokeWidth={1.5} /><span>{cameraStarting ? 'Opening camera…' : 'Take a photo'}</span><ArrowRight size={18} /></button>}
        <button className="upload-alternative" onClick={() => nav('manual-entry')}><BookOpen size={21} strokeWidth={1.5} /><span>Paste questions instead</span><ArrowRight size={18} /></button>
      </div>}
      {cameraError && !cameraOpen && <div className="upload-camera-help"><p role="alert">{cameraError}</p><button className="study-secondary" onClick={() => captureRef.current?.click()}>Use phone camera</button></div>}
    </div>
    {cameraOpen && <section className="upload-camera-view" role="dialog" aria-modal="true" aria-label="Question paper camera"><video ref={videoRef} autoPlay playsInline muted onError={() => { closeCamera(); setCameraError('The preview could not open. Use your phone’s camera or choose a photo.'); }} onLoadedData={() => { if (videoRef.current?.videoWidth) setCameraReady(true); }} /><header><button className="camera-close" aria-label="Close camera" onClick={closeCamera}><X size={22} /></button></header><div className="camera-controls"><p>{cameraError || 'Keep the whole page in view.'}</p><button className="camera-shutter" aria-label="Take photo" disabled={!cameraReady || capturing} onClick={capturePhoto}><span /></button></div></section>}
  </main>;
}
