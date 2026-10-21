import type { CSSProperties } from 'react';
import { BookOpen, ChevronRight, GraduationCap, HeartHandshake, Bookmark, History } from 'lucide-react';
import SkeletonShape from './SkeletonShape';
import { StudyArt } from './library/StudyArt';

export type SkeletonKind = 'page' | 'home' | 'catalog' | 'materials' | 'sessions' | 'preparation' | 'preferences' | 'history' | 'saved-questions' | 'reminders' | 'builder';
type Props = { kind?: SkeletonKind; label?: string; fullPage?: boolean; hasSaved?: boolean; hasActivity?: boolean };
function Block({ width = '100%', height = 12, className = '' }: { width?: CSSProperties['width']; height?: CSSProperties['height']; className?: string }) {
  if(className.includes('skeleton-character'))return <SkeletonShape shape={className.includes('home')?'scholar-study':'scholar-idle'} className={className} style={{width,height}}/>;
  return <span className={`skeleton-block ${className}`} style={{ width, height }} />;
}
function Copy() { return <span className="skeleton-copy"><Block width="min(70%,320px)" /><Block width="min(46%,210px)" height={10} /></span>; }
function Topbar({ className = '' }: { className?: string }) { return <div className={`study-topbar ${className}`}><span className="wordmark">past<span>q</span></span><Block width={110} height={16} /></div>; }
function Title() { return <Block width="min(65%,280px)" height={38} className="skeleton-heading" />; }
function Rows({ kind = 'materials' }: { kind?: 'materials' | 'sessions' | 'history' | 'organizations' | 'home' }) {
  const rowClass = { materials: 'material-row', sessions: 'discover-row', history: 'material-row', organizations: 'organization-toggle', home: 'home-paper' }[kind];
  return <div className="skeleton-rows">{[0, 1, 2].map(index => <div className={rowClass} key={index}>
    <span className="exam-artwork skeleton-vector">{kind==='organizations'?<GraduationCap size={24} strokeWidth={1.5}/>:kind==='sessions'?<HeartHandshake size={22} strokeWidth={1.5}/>:<BookOpen size={22} strokeWidth={1.5}/>}</span><Copy /><Block width={kind === 'materials' ? 52 : 14} height={kind === 'materials' ? 36 : 14} />
  </div>)}</div>;
}
function FirstStep({ profile = false }: { profile?: boolean }) {
  return <div className={profile ? 'student-first-progress' : 'home-first'}><Block width={profile ? 170 : 210} height={profile ? 180 : 220} className={`skeleton-character${profile ? '' : ' skeleton-first-character'}`} /><Block width={220} height={profile ? 30 : 46} className={profile ? '' : 'skeleton-first-title'} /><Block width={170} height={48} className="skeleton-action" />{!profile && <Block width={150} height={16} className="skeleton-first-link" />}</div>;
}
function Home({ hasSaved }: { hasSaved: boolean }) {
  return <div className="study-app study-home personal-home"><Topbar /><div className="home-content"><Title />{hasSaved ? <>
    <div className="home-next"><div className="home-next-copy"><Block width="40%" /><Block width="85%" height={64} className="skeleton-next-title" /><Block width="65%" height={14} /><Block width={130} height={48} className="skeleton-action" /></div><Block width={190} height={208} className="skeleton-character skeleton-home-character" /></div>
    <div className="home-saved"><div className="student-section-heading"><Block width={110} height={20} /><Block width={60} height={14} /></div><Rows kind="home" /></div>
  </> : <FirstStep />}</div></div>;
}
function Catalog() {
  return <div className="catalog-browser"><div className="category-gallery">{['institution','exam_board','professional_body'].map(type => <div className="category-group" key={type}><div className="category-header"><div className="category-tile"><span className="skeleton-vector category-art-skeleton"><StudyArt type={type}/></span><span className="category-label"><Block width="min(85%,240px)" height={21.5} /></span><ChevronRight size={17} className="skeleton-vector"/></div></div></div>)}</div></div>;
}
function Preferences({ hasActivity }: { hasActivity: boolean }) {
  return <div className="study-app student-preferences"><div className="study-topbar student-preferences-header"><Block width={125} height={24} /></div><div className="student-preferences-content"><div className="student-identity"><Block width={46} height={46} className="skeleton-circle" /><Copy /></div>
    {hasActivity ? <div className="student-progress"><Block width={130} height={20} /><div className="student-stats">{[0, 1, 2].map(index => <div key={index}><Block width="60%" height={12} /><Block width="65%" height={34} className="skeleton-stat" /></div>)}</div><Block height={180} /></div> : <FirstStep profile />}
    <div className="student-settings-list student-practice-links">{[0, 1].map(index => <div className="skeleton-setting" key={index}><span className="skeleton-vector">{index===0?<History size={20}/>:<Bookmark size={20}/>}</span><Block width={140} height={16} /><Block width={14} height={14} /></div>)}</div>
    <div className="student-settings-list">{[0, 1, 2].map(index => <div className="skeleton-setting" key={index}><Block width={40} height={40} className="skeleton-thumbnail" /><Copy /><Block width={index === 2 ? 40 : 14} height={index === 2 ? 24 : 14} /></div>)}</div>
  </div></div>;
}
function Reminders() {
  return <><div className="reminder-enable"><Copy /><Block width={42} height={24} /></div><div className="reminder-preview"><Block width={76} height={76} className="skeleton-thumbnail" /><Copy /></div><div className="reminder-fieldset"><Block width={60} /><div className="skeleton-timing"><Block height={42} /><Block height={42} /></div><Block width="55%" height={12} /><div className="reminder-days">{[0, 1, 2, 3, 4, 5, 6].map(day => <Block width={36} height={36} className="skeleton-circle" key={day} />)}</div></div><div className="reminder-fieldset"><Block width={90} /><div className="reminder-time-pair">{[0, 1].map(index => <div className="reminder-field" key={index}><Block width={40} height={12} /><Block height={44} /></div>)}</div></div><Block width="65%" height={18} /><Block height={48} className="skeleton-action" /></>;
}
function Builder() {
  return <div className="study-app session-builder"><Topbar className="builder-topbar" /><div className="builder-steps">{[0, 1, 2].map(index => <div className="skeleton-builder-step" key={index}><Block width={22} height={22} className="skeleton-circle builder-step-number" /><span className="builder-step-label"><Block width={60} height={12} /><Block width={55} height={10} /></span></div>)}</div><div className="builder-scroll"><div className="builder-content"><div className="builder-heading"><Title /></div><div className="builder-subjects">{[0, 1, 2, 3].map(index => <div className="builder-subject" key={index}><Block width={16} height={12} /><Copy /><Block width={24} height={24} /></div>)}</div></div></div><div className="builder-footer"><Copy /><Block width={150} height={48} /></div></div>;
}
function Preparation() {
  return <div className="study-app library-screen preparation-library"><Topbar /><div className="library-content"><div className="preparation-heading"><Block width={110} height={12} /><Title /></div><Block height={54} className="preparation-search" /><div className="preparation-environments">{[0, 1].map(index => <div className="preparation-environment" key={index}><Block width={64} height={64} className="skeleton-thumbnail" /><Copy /><Block width={16} height={16} /></div>)}</div></div></div>;
}
function Welcome() {
  return <div className="study-app app-welcome"><div className="app-welcome-brand"><span className="wordmark">past<span>q</span></span></div><div className="app-welcome-greeting"><SkeletonShape shape="scholar-wave" className="welcome-skeleton-shape" /></div><div className="app-welcome-actions"><Block height={54} className="skeleton-action" /><div className="skeleton-signin"><Block width={50} height={14} /></div></div></div>;
}

function Archive({ saved }: { saved: boolean }) {
  return <div className="study-app library-screen archive-screen"><div className="study-topbar archive-topbar"><Block width={44} height={44} className="skeleton-circle" /><Block width={190} height={29} /></div><div className="library-content archive-content">
    {saved && <div className="library-search archive-search"><Block height={18} /></div>}
    <div className="skeleton-rows">{[0, 1, 2].map(index => saved ? <div className="archive-bookmark" key={index}><div className="archive-bookmark-open"><Copy /><Block width={18} height={18} /></div><Block width={40} height={40} /></div> : <div className="material-row" key={index}><Block width={22} height={22} /><Copy /><Block width={40} height={16} /><Block width={17} height={17} /></div>)}</div>
  </div></div>;
}

/** Each placeholder uses its destination's layout classes and responsive rules. */
export default function ContentSkeleton({ kind = 'materials', label = 'Loading content', fullPage = false, hasSaved = false, hasActivity = false }: Props) {
  const content = kind === 'page' ? <Welcome /> : kind === 'home' ? <Home hasSaved={hasSaved} /> : kind === 'catalog' ? <Catalog /> : kind === 'preferences' ? <Preferences hasActivity={hasActivity} /> : kind === 'reminders' ? <Reminders /> : kind === 'builder' ? <Builder /> : kind === 'preparation' ? <Preparation /> : (kind === 'history' || kind === 'saved-questions') ? <Archive saved={kind === 'saved-questions'} /> : <Rows kind={kind} />;
  return <div className={`content-skeleton skeleton-${kind}${fullPage ? ' skeleton-full-page' : ''}`} role="status" aria-label={label} aria-busy="true"><span className="sr-only">{label}</span><div className="skeleton-shapes" aria-hidden="true">{content}</div></div>;
}
