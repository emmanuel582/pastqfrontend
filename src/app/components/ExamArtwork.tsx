import type { ReactNode } from 'react';
import { BookOpen } from 'lucide-react';
import ReadyImage from './ReadyImage';
import { examArtwork } from '../../utils/examArtwork';

export default function ExamArtwork({ identity, fallback = <BookOpen size={22} strokeWidth={1.5} /> }: { identity?: Parameters<typeof examArtwork>[0]; fallback?: ReactNode }) {
  const artwork = examArtwork(identity);
  return <span className={`exam-artwork${artwork ? ' exam-artwork-official' : ''}`} aria-hidden="true">
    {artwork ? <ReadyImage src={`/images/exams/${artwork}.png`} alt="" width={64} height={64} fallback={fallback} /> : fallback}
  </span>;
}
