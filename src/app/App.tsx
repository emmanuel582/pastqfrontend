import React, { useState, useEffect, useRef } from "react";
import MathText from "./components/MathText";
import { useAppNavigation } from "./useAppNavigation";
import { AuthScreen } from "./components/auth/AuthScreen";
import QuestionMedia, { type QuestionFigure } from "./components/QuestionMedia";
import ProcessingScreen from "./components/ProcessingScreen";
import SnapScreen, { type UploadDraft } from "./components/upload/SnapScreen";
import { motion, AnimatePresence } from "motion/react";
import {
  Camera, Upload, Home, Clock, User,
  Flag, Check, X, Eye, RotateCcw, Edit2,
  Bell, LogOut, AlertTriangle, BookOpen,
  ChevronRight, Plus, FileText, Shield, Star, Info, Twitter, Github, Library, Search, Download,
  Calculator, PenLine, Eraser, Trash2, Undo2, Send, ZoomIn, ZoomOut, ChevronDown, ChevronUp,
} from "lucide-react";
import { listenToAuth, logoutUser } from "../services/auth";

import { getUserHistory, saveExamSession, savePracticeResult, getUserProfile, createUserProfile, updateUserProfile } from "../services/db";
import { getOfflineLibrary, getGlobalLibrary, getGlobalCatalog, downloadBundle, saveBundle, getOfflineBundle, getBundleFromApi, type LibraryCatalog, type CatalogManufacturer, type CatalogExamType, type CatalogUniversity } from "../services/libraryService";
import { StudyHome, StudyLibrary, StudyWelcome, StudyProgress } from "./components/library/StudyLibrary";
import { StudyWorkspace, StudyResults } from "./components/cbt/StudyWorkspace";
import { answerIndex } from "../utils/examSession";
import { readTheme, applyTheme, THEME_STORAGE_KEY, type StudyTheme } from "../utils/theme";
import { CustomizeCbtScreen } from "./components/cbt/CustomizeCbtScreen";
import { isCbtQuestion, customDurationSeconds } from "../utils/cbtFilters";
import { supabase } from "../services/supabase";
import { rankRecommendationCandidates, recordAnonymousAttemptSummary } from "../services/recommendations";
import {
  extractVisionText,
} from "../services/vision";

type Screen =
  | "splash" | "signup" | "login" | "forgot-password"
  | "onboard-name" | "onboard-1" | "onboard-2" | "onboard-3" | "onboard-4" | "onboard-5"
  | "home" | "snap" | "processing" | "review-questions" | "customize-cbt"
  | "exam" | "results" | "review-answers" | "preference" | "manual-entry"
  | "profile-edit" | "settings-preferences" | "settings-reminders" | "settings-notifications" | "about" | "support";
type NavTab = "home" | "library" | "lead" | "preference";

interface Q {
  id: number;
  practiceKey?: string;
  subject: string;
  question: string;
  options: string[];
  correct: number | null;
  explanation: string;
  year?: string | null;
  paper?: string | null;
  questionNumber?: number | null;
  pageIndex?: number | null;
  orderIndex?: number | null;
  pageOrder?: number | null;
  continuesFromPage?: number | null;
  continuesToPage?: number | null;
  sourceType?: string;
  confidence?: number;
  needsReview?: boolean;
  incomplete?: boolean;
  reviewReasons?: string[];
  qualityFlags?: string[];
  sectionId?: string | null;
  section?: string | null;
  topic?: string | null;
  passage?: string | null;
  figures?: QuestionFigure[];
  answerText?: string | null;
}

/** Keep CBT / review order: page → printed number → extraction sequence. */
function sortQuestions(qs: Q[]): Q[] {
  const list = [...(qs || [])];
  list.sort((a, b) => {
    const pa = a.pageIndex != null ? Number(a.pageIndex) : 1e9;
    const pb = b.pageIndex != null ? Number(b.pageIndex) : 1e9;
    if (pa !== pb) return pa - pb;
    const na = a.questionNumber != null ? Number(a.questionNumber) : null;
    const nb = b.questionNumber != null ? Number(b.questionNumber) : null;
    if (na != null && nb != null && na !== nb) return na - nb;
    const oa = a.orderIndex != null ? Number(a.orderIndex) : Number(a.id) || 0;
    const ob = b.orderIndex != null ? Number(b.orderIndex) : Number(b.id) || 0;
    return oa - ob;
  });
  return list.map((q, i) => ({ ...q, id: i + 1, orderIndex: i + 1 }));
}

function practiceQuestionKey(sourceBundleId: string, question: Q, order: number): string {
  if (question.practiceKey) return question.practiceKey;
  // This is a Hostinger content reference only; it intentionally contains no
  // question wording, option, answer, explanation, image, or OCR payload.
  return [
    sourceBundleId,
    question.sourceType || "question",
    question.year || "-",
    question.paper || "-",
    question.pageIndex ?? "-",
    question.questionNumber ?? question.id,
    order,
  ].join(":");
}

const DEMO_QUESTIONS: Q[] = [
  {
    id: 1,
    subject: "Use of English",
    topic: "Vocabulary",
    question: "Choose the word that is nearest in meaning to the italicized word: The man's *audacity* was quite surprising.",
    options: ["boldness", "foolishness", "cowardice", "cleverness"],
    correct: 0,
    explanation: "Audacity means a willingness to take bold risks, which is synonymous with boldness."
  },
  {
    id: 2,
    subject: "Mathematics",
    topic: "Linear equations",
    question: "If 2x + 3 = 11, what is the value of x?",
    options: ["2", "3", "4", "5"],
    correct: 2,
    explanation: "Subtract 3 from both sides to get 2x = 8. Divide by 2 to get x = 4."
  },
  {
    id: 3,
    subject: "Physics",
    topic: "Scalars and vectors",
    question: "Which of the following is a scalar quantity?",
    options: ["Velocity", "Force", "Speed", "Acceleration"],
    correct: 2,
    explanation: "Speed is a scalar quantity because it only has magnitude, unlike vector quantities which have both magnitude and direction."
  }
];

const SESSIONS = [];



const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const pct = (s: number, t: number) => Math.round((s / t) * 100);
const sColor = (p: number) => p >= 70 ? "#22C55E" : p >= 50 ? "#7A6CB2" : "#EF4444";
const sBadge = (p: number) =>
  p >= 70 ? "bg-[#DCFCE7] text-[#15803D]" : p >= 50 ? "bg-[#FEF3C7] text-[#92400E]" : "bg-[#FEE2E2] text-[#991B1B]";
const sLabel = (p: number) =>
  p >= 80 ? "Excellent" : p >= 70 ? "Good Pass" : p >= 50 ? "Average" : p >= 40 ? "Below Average" : "Needs Work";

const JK = { fontFamily: "'Lora', sans-serif" };
const MONO = { fontFamily: "'JetBrains Mono', monospace" };
const INTER = { fontFamily: "'Outfit', sans-serif" };

// ── Shared Components ─────────────────────────────────────────────────────────

function BottomNav({ tab, onTab, onSnap }: { tab: NavTab; onTab: (t: NavTab) => void; onSnap: () => void }) {
  const items: { id: NavTab; label: string; Icon: React.ElementType }[] = [
    { id: "home", label: "Home", Icon: Home }, { id: "library", label: "Library", Icon: Library },
    { id: "lead", label: "Progress", Icon: Clock }, { id: "preference", label: "Profile", Icon: User },
  ];
  return (
    <nav className="study-bottom-nav" aria-label="Main navigation">
      <div className="nav-curved-background" aria-hidden="true">
        <svg viewBox="0 0 375 72" fill="none" preserveAspectRatio="none">
          <path d="M0 0 L125 0 C140 0 145 38 187.5 38 C230 38 235 0 250 0 L375 0 L375 72 L0 72 Z" fill="currentColor" />
        </svg>
      </div>
      <button className="nav-upload" aria-label="Add material" onClick={onSnap}><Camera size={24} /></button>
      <div className="nav-tabs">
        {items.map((item, index) => (
          <button key={item.id} className={`nav-tab${tab === item.id ? " active" : ""}${index === 1 ? " nav-before-camera" : ""}`} aria-current={tab === item.id ? "page" : undefined} onClick={() => onTab(item.id)}>
            <item.Icon size={24} strokeWidth={tab === item.id ? 2.5 : 2} /><span>{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

function Field({ label, type = "text", placeholder, value, onChange }: {
  label: string; type?: string; placeholder: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[13px] font-semibold text-[#374151]" style={JK}>{label}</label>
      <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-[#FAF6F0] border border-[#EADFD3] rounded-xl px-4 py-3.5 text-[15px] text-[#2E2A27] placeholder:text-[#94A3B8] outline-none focus:border-[#E67468] focus:ring-2 focus:ring-[#E67468]/20 transition-all"
        style={INTER} />
    </div>
  );
}

function PrimaryBtn({ label, onClick, full = true }: { label: string; onClick: () => void; full?: boolean }) {
  return (
    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onClick}
      className={`${full ? "w-full" : ""} bg-[#E67468] text-white py-4 rounded-2xl text-[15px] font-bold shadow-lg shadow-[#E67468]/30`}
      style={JK}>
      {label}
    </motion.button>
  );
}

// ── Splash Illustration ───────────────────────────────────────────────────────

function SplashIllustration() {
  return (
    <svg width="220" height="210" viewBox="0 0 220 210" fill="none" aria-hidden="true">
      {/* Exam paper — slightly tilted */}
      <g transform="rotate(-8 105 115)">
        <rect x="45" y="30" width="112" height="145" rx="6" fill="white" stroke="#EADFD3" strokeWidth="1.5" />
        <rect x="62" y="52" width="78" height="3" rx="1.5" fill="#CBD5E1" />
        <rect x="62" y="62" width="55" height="2.5" rx="1.25" fill="#EADFD3" />
        <rect x="62" y="78" width="24" height="3" rx="1.5" fill="#E67468" opacity="0.65" />
        <rect x="62" y="87" width="78" height="2.5" rx="1.25" fill="#EADFD3" />
        <rect x="62" y="94" width="62" height="2.5" rx="1.25" fill="#EADFD3" />
        <circle cx="68" cy="108" r="4.5" stroke="#CBD5E1" strokeWidth="1.5" />
        <circle cx="88" cy="108" r="4.5" stroke="#CBD5E1" strokeWidth="1.5" />
        <circle cx="88" cy="108" r="2.5" fill="#E67468" />
        <circle cx="108" cy="108" r="4.5" stroke="#CBD5E1" strokeWidth="1.5" />
        <circle cx="128" cy="108" r="4.5" stroke="#CBD5E1" strokeWidth="1.5" />
        <rect x="62" y="122" width="24" height="3" rx="1.5" fill="#E67468" opacity="0.65" />
        <rect x="62" y="131" width="78" height="2.5" rx="1.25" fill="#EADFD3" />
        <rect x="62" y="138" width="50" height="2.5" rx="1.25" fill="#EADFD3" />
      </g>
      {/* Camera frame */}
      <rect x="56" y="44" width="108" height="132" rx="11" fill="none" stroke="#E67468" strokeWidth="2.5" />
      <rect x="67" y="55" width="86" height="110" rx="7" fill="#E67468" fillOpacity="0.04" />
      {/* Amber corner brackets */}
      <path d="M64 42 L64 55 M64 42 L77 42" stroke="#7A6CB2" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M156 42 L156 55 M156 42 L143 42" stroke="#7A6CB2" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M64 176 L64 163 M64 176 L77 176" stroke="#7A6CB2" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M156 176 L156 163 M156 176 L143 176" stroke="#7A6CB2" strokeWidth="2.5" strokeLinecap="round" />
      {/* Scan line */}
      <line x1="67" y1="110" x2="153" y2="110" stroke="#7A6CB2" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.85" />
      {/* Top camera dot */}
      <circle cx="110" cy="49" r="3" fill="#E67468" opacity="0.35" />
      {/* Sparkle star */}
      <path d="M184 50 L186.4 57.6 L194 57.6 L188 62.4 L190.4 70 L184 65.2 L177.6 70 L180 62.4 L174 57.6 L181.6 57.6 Z" fill="#7A6CB2" opacity="0.8" />
      {/* Small decorative dots */}
      <circle cx="35" cy="155" r="5" fill="#7A6CB2" opacity="0.3" />
      <circle cx="192" cy="145" r="3.5" fill="#E67468" opacity="0.22" />
      <circle cx="40" cy="78" r="3" fill="#E67468" opacity="0.18" />
    </svg>
  );
}

// ── Screen Components ─────────────────────────────────────────────────────────

function SplashScreen({ nav, onStartDemo }: { nav: (s: Screen) => void; onStartDemo: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-between px-7 pb-10 bg-[#FAF6F0]">
      <div className="flex-1 flex flex-col items-center justify-center gap-7">
        <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 2 }}>
          <SplashIllustration />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 2, delay: 0.2 }} className="text-center space-y-3">
          <h1 className="text-[52px] font-extrabold text-[#2E2A27] tracking-[-2px] leading-none" style={JK}>PastQ</h1>
          <p className="text-[15px] text-[#8C8681] leading-relaxed" style={INTER}>
            Snap any past question.<br />Practice it like the real exam.
          </p>
        </motion.div>
      </div>
      <div className="w-full space-y-3">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 2, delay: 0.4 }}>
          <PrimaryBtn label="Get Started" onClick={() => nav("signup")} />
        </motion.div>
        <button onClick={onStartDemo} className="w-full py-3 rounded-2xl border border-[#EADFD3] bg-white text-[13px] font-bold text-[#695AA5]" style={JK}>Try the 3-question demo</button>
        <motion.button initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 2, delay: 0.6 }} onClick={() => nav("login")} className="w-full text-center text-[14px] text-[#8C8681]" style={INTER}>
          Already have an account?{" "}
          <span className="text-[#E67468] font-semibold">Sign in</span>
        </motion.button>
      </div>
    </div>
  );
}

function OnboardNameScreen({ nav, onName }: { nav: (s: Screen) => void; onName: (name: string) => void }) {
  const [name, setName] = useState("");
  const canContinue = name.trim().length > 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF6F0]">
      <div className="px-5 pt-2 flex items-center justify-between">
        <OnboardStep step={1} />
        <div className="w-9" />
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        <div>
          <h2 className="text-[28px] font-bold text-[#2E2A27] leading-tight" style={JK}>
            What can we call you?
          </h2>
          <p className="text-[14px] text-[#8C8681] mt-2" style={INTER}>
            This helps us personalise your experience.
          </p>
        </div>
        <div className="space-y-4">
          <Field label="Your name" placeholder="Enter a display name" value={name} onChange={setName} />
        </div>
      </div>
      <div className="px-5 py-4 bg-white border-t border-[#EADFD3]">
        <button onClick={() => {
          if (!canContinue) return;
          onName(name.trim());
          nav("home");
        }}
          className="w-full py-4 rounded-2xl text-[15px] font-bold transition-all"
          style={{ background: canContinue ? "#E67468" : "#EADFD3", color: canContinue ? "white" : "#94A3B8", boxShadow: canContinue ? "0 8px 20px rgba(37,99,235,0.2)" : "none", ...JK }}>
          Continue
        </button>
      </div>
    </div>
  );
}

function HomeScreen({
  nav,
  tab,
  onTab,
  userName,
  sessions,
  offlineLibrary,
  globalLibrary,
  libraryCatalog,
  libraryStatus,
  onRetryLibrary,
  onOpenBundle,
  onDownloadBundle,
  onSelectManufacturer,
  onStartDemo,
}: {
  nav: (s: Screen) => void;
  tab: NavTab;
  onTab: (t: NavTab) => void;
  userName: string;
  sessions: any[];
  offlineLibrary: any[];
  globalLibrary: any[];
  libraryCatalog: LibraryCatalog | null;
  libraryStatus: "loading" | "ready" | "error";
  onRetryLibrary: () => void;
  onOpenBundle: (bundle: any) => void;
  onDownloadBundle: (bundle: any) => void;
  onSelectManufacturer: (mfg: CatalogManufacturer, exam: CatalogExamType, uni: CatalogUniversity) => void;
  onStartDemo: () => void;
}) {
  return (
    <div className="study-shell">
      <div className="study-shell-content">
        {tab === "home" && <StudyHome name={userName} onStart={onStartDemo} onLibrary={() => onTab("library")} onUpload={() => nav("snap")} />}
        {tab === "library" && (
          <StudyLibrary
            globalLibrary={globalLibrary}
            offlineLibrary={offlineLibrary}
            catalog={libraryCatalog}
            status={libraryStatus}
            onRetry={onRetryLibrary}
            onOpen={onOpenBundle}
            onDownload={onDownloadBundle}
            onSelect={onSelectManufacturer}
            onUpload={() => nav("snap")}
          />
        )}
        {tab === "lead" && <StudyProgress sessions={sessions} onStart={onStartDemo} />}
        {tab === "preference" && <div className="p-5 text-[14px] text-[#8C8681]">Opening your study preferences…</div>}
      </div>
      <BottomNav tab={tab} onTab={onTab} onSnap={() => nav("snap")} />
    </div>
  );
}

function ManualEntryScreen({
  nav,
  onSessionStarted,
}: {
  nav: (s: Screen) => void;
  onSessionStarted: (sessionId: string) => void;
}) {
  const [text, setText] = useState("");
  const [materialName, setMaterialName] = useState("");

  const confirmUpload = async () => {
    if (!text.trim()) return;
    const name = materialName.trim() || "Manual Entry";
    const icon = "📝";

    try {
      const data = await extractVisionText({ text, name, icon });
      onSessionStarted(data.sessionId || data.jobId);
      nav("processing");
    } catch (err) {
      console.error(err);
      alert("Failed to process text. Please try again.");
      nav("manual-entry");
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#FAF6F0] relative">
      <div style={{ paddingTop: 52 }} className="px-5 flex items-center justify-between pb-6">
        <span className="text-[#2E2A27] font-bold text-[17px]" style={JK}>Manual Entry</span>
        <div className="w-9" />
      </div>

      <div className="flex-1 flex flex-col px-5 pb-6">
        <p className="text-[#8C8681] text-[14px] mb-2" style={INTER}>Material Name</p>
        <input 
          type="text" 
          placeholder="e.g. Physics 2018 Past Q" 
          value={materialName} 
          onChange={e => setMaterialName(e.target.value)} 
          className="w-full bg-white border border-[#EADFD3] rounded-xl px-4 py-3 text-[15px] text-[#2E2A27] mb-4 outline-none focus:border-[#E67468]" 
          style={INTER} 
        />
        
        <p className="text-[#8C8681] text-[14px] mb-2" style={INTER}>Paste Questions Here</p>
        <textarea 
          placeholder="Paste your raw text questions and options here..." 
          value={text} 
          onChange={e => setText(e.target.value)} 
          className="flex-1 w-full bg-white border border-[#EADFD3] rounded-xl px-4 py-3 text-[15px] text-[#2E2A27] mb-6 outline-none focus:border-[#E67468] resize-none" 
          style={INTER} 
        />
        
        <button 
          onClick={confirmUpload} 
          disabled={!text.trim()}
          className="w-full py-4 rounded-2xl text-[16px] font-bold bg-[#E67468] text-white shadow-lg shadow-[#E67468]/20 disabled:opacity-50" 
          style={JK}
        >
          Process Questions
        </button>
      </div>
    </div>
  );
}

function ReviewQuestionsScreen({
  nav,
  questions,
  onUpdateQuestions,
  onStartTest,
}: {
  nav: (s: Screen) => void;
  questions: Q[];
  onUpdateQuestions: (qs: Q[]) => void;
  onStartTest: (durationSeconds: number, selected?: Q[]) => void;
}) {
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<Q | null>(null);
  const [durationMinutes, setDurationMinutes] = useState('30');
  const uploadDuration = customDurationSeconds(durationMinutes);
  const [selectedGroup, setSelectedGroup] = useState<string>("all");

  const groups = (() => {
    const map = new Map<string, { key: string; year: string; paper: string; items: Q[] }>();
    // Sectioned (v2) extractions follow the document's own structure and order
    // (topic-by-topic stays topic-by-topic); older ones fall back to year/paper.
    const sectioned = questions.some((q) => q.section);
    for (const q of sortQuestions(questions)) {
      if (sectioned) {
        const key = q.sectionId || q.section || "unsectioned";
        if (!map.has(key)) map.set(key, { key, year: "", paper: q.section || "Unsectioned", items: [] });
        map.get(key)!.items.push(q);
        continue;
      }
      const year = q.year || "Unknown";
      const paper = q.paper || "Default";
      const key = `${year}::${paper}`;
      if (!map.has(key)) map.set(key, { key, year, paper, items: [] });
      map.get(key)!.items.push(q);
    }
    if (sectioned) return Array.from(map.values());
    return Array.from(map.values()).sort((a, b) => {
      const ay = parseInt(a.year, 10) || 0;
      const by = parseInt(b.year, 10) || 0;
      if (by !== ay) return by - ay;
      return a.paper.localeCompare(b.paper);
    });
  })();

  const visible =
    selectedGroup === "all"
      ? sortQuestions(questions)
      : sortQuestions(groups.find((g) => g.key === selectedGroup)?.items || questions);
  const blockingQuestions = visible.filter((q) => !q.question.trim() || q.options.filter((option) => option.trim()).length < 2 || q.incomplete);
  const reviewQuestions = visible.filter((q) => q.needsReview);

  const openEdit = (i: number) => {
    const q = visible[i];
    const realIndex = questions.findIndex((x) => x === q || (x.id === q.id && x.question === q.question));
    setEditIndex(realIndex >= 0 ? realIndex : i);
    setDraft({ ...q, options: [...q.options] });
  };

  const saveEdit = () => {
    if (editIndex === null || !draft) return;
    const options = draft.options.map((o) => o.trim()).filter(Boolean);
    const incomplete = !draft.question.trim() || options.length < 2;
    const reviewReasons = (draft.reviewReasons || []).filter((reason) => reason !== "insufficient_complete_options");
    if (incomplete) reviewReasons.push("insufficient_complete_options");
    const next = questions.map((q, i) => i === editIndex ? {
      ...draft,
      question: draft.question.trim(),
      options,
      incomplete,
      reviewReasons: [...new Set(reviewReasons)],
      needsReview: incomplete || reviewReasons.length > 0 || (draft.qualityFlags || []).length > 0,
      correct: draft.correct != null && draft.correct < options.length ? draft.correct : null,
    } : q);
    onUpdateQuestions(next);
    setEditIndex(null);
    setDraft(null);
  };

  return (
    <div className="h-full flex flex-col bg-[#FAF6F0] relative">
      <div className="px-5 pt-2 pb-3 bg-white border-b border-[#EADFD3] flex items-center gap-3">
        <div>
          <h2 className="text-[16px] font-bold text-[#2E2A27]" style={JK}>Review Questions</h2>
          <p className="text-[12px] text-[#8C8681]" style={INTER}>
            {questions.length} extracted · viewing {visible.length}
          </p>
        </div>
      </div>

      {groups.length > 1 && (
        <div className="px-5 py-3 flex gap-2 overflow-x-auto border-b border-[#EADFD3] bg-white">
          <button
            onClick={() => setSelectedGroup("all")}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap border ${selectedGroup === "all" ? "bg-[#E67468] text-white border-[#E67468]" : "bg-[#FAF6F0] text-[#2E2A27] border-[#EADFD3]"}`}
          >
            All ({questions.length})
          </button>
          {groups.map((g) => (
            <button
              key={g.key}
              onClick={() => setSelectedGroup(g.key)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap border ${selectedGroup === g.key ? "bg-[#E67468] text-white border-[#E67468]" : "bg-[#FAF6F0] text-[#2E2A27] border-[#EADFD3]"}`}
            >
              {[g.year, g.paper !== "Default" ? g.paper : ""].filter(Boolean).join(" ")} ({g.items.length})
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {(blockingQuestions.length > 0 || reviewQuestions.length > 0) && (
          <div className="rounded-2xl border border-[#FCD34D] bg-[#FFFBEB] p-3">
            <p className="text-[12px] font-bold text-[#92400E]" style={JK}>Quality review required</p>
            <p className="mt-1 text-[11px] text-[#92400E]" style={INTER}>
              {blockingQuestions.length} blocking · {reviewQuestions.length} flagged. Open each marked question and compare it with the source page.
            </p>
          </div>
        )}
        {visible.map((q, i) => (
          <div key={`${q.id}-${i}`} className="bg-white rounded-2xl border border-[#EADFD3] p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="w-6 h-6 rounded-lg bg-[#F5E8E7] text-[#E67468] text-[11px] font-bold flex items-center justify-center" style={JK}>
                    {q.questionNumber ?? i + 1}
                  </span>
                  <span className="text-[10px] text-[#8C8681] font-medium bg-[#FAF6F0] px-2 py-0.5 rounded-full border border-[#EADFD3]">{q.subject}</span>
                  {q.year && (
                    <span className="text-[10px] text-[#7A6CB2] font-medium bg-[#F3F0FA] px-2 py-0.5 rounded-full border border-[#E8E0F5]">
                      {q.year}{q.paper && q.paper !== "Default" ? ` · ${q.paper}` : ""}
                    </span>
                  )}
                  {q.needsReview && (
                    <span className="text-[10px] text-[#92400E] font-medium bg-[#FEF3C7] px-2 py-0.5 rounded-full">Review</span>
                  )}
                  {q.correct == null && (
                    <span className="text-[10px] text-[#8C8681] font-medium bg-[#FAF6F0] px-2 py-0.5 rounded-full">No key</span>
                  )}
                  {typeof q.confidence === "number" && (
                    <span className="text-[10px] text-[#5C5550] bg-white px-2 py-0.5 rounded-full border border-[#EADFD3]">
                      {Math.round(q.confidence * 100)}% confidence
                    </span>
                  )}
                  {q.topic && (
                    <span className="text-[10px] text-[#2563EB] font-medium bg-[#EFF6FF] px-2 py-0.5 rounded-full border border-[#DBEAFE]">{q.topic}</span>
                  )}
                </div>
                <QuestionMedia figures={q.figures} />
                <p className="text-[13px] text-[#2E2A27] leading-snug line-clamp-2" style={INTER}>{q.question}</p>
                <div className="flex gap-2 mt-1.5 flex-wrap">
                  {q.options.slice(0, 2).map((opt, j) => (
                    <span key={j} className="text-[10px] text-[#94A3B8]">
                      {String.fromCharCode(65 + j)}. {opt.slice(0, 28)}{opt.length > 28 ? "…" : ""}
                    </span>
                  ))}
                </div>
                {!![...(q.reviewReasons || []), ...(q.qualityFlags || [])].length && (
                  <p className="mt-2 text-[10px] text-[#B45309]">
                    {[...new Set([...(q.reviewReasons || []), ...(q.qualityFlags || [])])].join(" · ").replaceAll("_", " ")}
                  </p>
                )}
              </div>
              <button
                onClick={() => openEdit(i)}
                className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl bg-[#FAF6F0] border border-[#EADFD3] active:scale-95"
                aria-label="Edit question"
              >
                <Edit2 size={14} color="#E67468" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="px-5 py-4 bg-white border-t border-[#EADFD3]">
        <div className="flex flex-col gap-2 mb-4">
          <label htmlFor="upload-exam-time" className="text-[12px] font-semibold text-[#8C8681]" style={INTER}>Exam duration</label>
          <div className="duration-input"><Clock size={17} /><input id="upload-exam-time" aria-label="Exam duration in minutes" type="number" min="0" step="any" inputMode="decimal" value={durationMinutes} onChange={event => setDurationMinutes(event.target.value)} aria-invalid={uploadDuration === null} /><span>min</span></div>
          {uploadDuration === null && <p className="selection-error" role="alert">Enter a time greater than zero.</p>}
        </div>
        <button
          disabled={blockingQuestions.length > 0 || !visible.some(isCbtQuestion) || uploadDuration === null}
          onClick={() => { if (uploadDuration !== null) onStartTest(uploadDuration, visible.filter(isCbtQuestion)); }}
          className="w-full bg-[#E67468] text-white py-4 rounded-2xl text-[15px] font-bold shadow-lg shadow-[#E67468]/20 disabled:bg-[#EADFD3] disabled:text-[#8C8681] disabled:shadow-none"
          style={JK}
        >
          {blockingQuestions.length > 0
            ? `Fix ${blockingQuestions.length} incomplete question${blockingQuestions.length === 1 ? "" : "s"}`
            : selectedGroup === "all" ? "Looks good — Start Test" : `Start ${visible.length}-Q group`}
        </button>
      </div>
      <AnimatePresence>
        {editIndex !== null && draft && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/40 flex items-end"
          >
            <motion.div
              initial={{ y: 50 }}
              animate={{ y: 0 }}
              exit={{ y: 50 }}
              className="w-full max-h-[90%] bg-white rounded-t-3xl p-5 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[18px] font-bold text-[#2E2A27]" style={JK}>Edit Question {editIndex + 1}</h3>
                <button onClick={() => { setEditIndex(null); setDraft(null); }} className="w-9 h-9 rounded-full bg-[#FAF6F0] flex items-center justify-center">
                  <X size={16} />
                </button>
              </div>

              <label className="text-[12px] font-semibold text-[#8C8681] mb-1 block">Subject</label>
              <input
                value={draft.subject}
                onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                className="w-full mb-3 px-3 py-2.5 rounded-xl border border-[#EADFD3] bg-[#FAF6F0] text-[14px] outline-none focus:border-[#E67468]"
                style={INTER}
              />

              <div className="flex gap-2 mb-3">
                <div className="flex-1">
                  <label className="text-[12px] font-semibold text-[#8C8681] mb-1 block">Year</label>
                  <input
                    value={draft.year || ""}
                    onChange={(e) => setDraft({ ...draft, year: e.target.value || null })}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#EADFD3] bg-[#FAF6F0] text-[14px] outline-none focus:border-[#E67468]"
                    style={INTER}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[12px] font-semibold text-[#8C8681] mb-1 block">Paper</label>
                  <input
                    value={draft.paper || ""}
                    onChange={(e) => setDraft({ ...draft, paper: e.target.value || null })}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#EADFD3] bg-[#FAF6F0] text-[14px] outline-none focus:border-[#E67468]"
                    style={INTER}
                  />
                </div>
              </div>

              <label className="text-[12px] font-semibold text-[#8C8681] mb-1 block">Question</label>
              <textarea
                value={draft.question}
                onChange={(e) => setDraft({ ...draft, question: e.target.value })}
                rows={4}
                className="w-full mb-3 px-3 py-2.5 rounded-xl border border-[#EADFD3] bg-[#FAF6F0] text-[14px] outline-none focus:border-[#E67468] resize-none"
                style={INTER}
              />

              {draft.options.map((opt, i) => (
                <div key={i} className="mb-2">
                  <label className="text-[12px] font-semibold text-[#8C8681] mb-1 block">Option {String.fromCharCode(65 + i)}</label>
                  <div className="flex gap-2">
                    <input
                      value={opt}
                      onChange={(e) => {
                        const options = [...draft.options];
                        options[i] = e.target.value;
                        setDraft({ ...draft, options });
                      }}
                      className="flex-1 px-3 py-2.5 rounded-xl border border-[#EADFD3] bg-[#FAF6F0] text-[14px] outline-none focus:border-[#E67468]"
                      style={INTER}
                    />
                    <button
                      onClick={() => setDraft({ ...draft, correct: i })}
                      className="px-3 rounded-xl border text-[12px] font-bold"
                      style={{
                        background: draft.correct === i ? "#DCFCE7" : "#FAF6F0",
                        borderColor: draft.correct === i ? "#86EFAC" : "#EADFD3",
                        color: draft.correct === i ? "#15803D" : "#8C8681",
                      }}
                    >
                      {draft.correct === i ? "✓ Key" : "Set key"}
                    </button>
                  </div>
                </div>
              ))}

              {draft.options.length < 6 && (
                <button
                  onClick={() => setDraft({ ...draft, options: [...draft.options, ""] })}
                  className="w-full mb-3 py-2.5 rounded-xl border border-dashed border-[#CBD5E1] text-[12px] font-semibold text-[#7A6CB2]"
                >
                  + Add option
                </button>
              )}

              <label className="text-[12px] font-semibold text-[#8C8681] mb-1 mt-2 block">Explanation</label>
              <textarea
                value={draft.explanation}
                onChange={(e) => setDraft({ ...draft, explanation: e.target.value })}
                rows={3}
                className="w-full mb-4 px-3 py-2.5 rounded-xl border border-[#EADFD3] bg-[#FAF6F0] text-[14px] outline-none focus:border-[#E67468] resize-none"
                style={INTER}
              />

              <PrimaryBtn label="Save changes" onClick={saveEdit} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * What the book says about a question, in whatever form it gives it: an answer
 * with an explanation, an answer only, or nothing at all.
 */
function ProfileScreen({ nav, tab, onTab, userName, userEmail, userAvatar, sessions }: {
  nav: (s: Screen) => void;
  tab: NavTab;
  onTab: (t: NavTab) => void;
  userName: string;
  userEmail: string;
  userAvatar: string;
  sessions: any[];
}) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("08:00");
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const displayName = userName || "User Profile";
  const initials = displayName.split(" ").map((word: string) => word[0]).join("").slice(0, 2).toUpperCase();
  const completedTests = sessions.length;
  const avgScore = completedTests ? Math.round(sessions.reduce((sum: number, s: any) => sum + pct(s.score, s.total_questions), 0) / completedTests) : null;
  const bestScore = completedTests ? Math.max(...sessions.map((s: any) => pct(s.score, s.total_questions))) : null;

  return (
    <div className="h-full flex flex-col bg-[#FAF6F0] relative">
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 pt-4 pb-6 space-y-4">
          <div className="overflow-hidden rounded-[28px] border border-[#EADFD3] bg-white shadow-sm mb-4">
            <div className="px-5 pt-6 pb-5">
              <div className="flex items-center gap-4">
                {userAvatar ? (
                  <img src={userAvatar} alt="Profile" className="h-[52px] w-[52px] rounded-[18px] object-cover flex-shrink-0" />
                ) : (
                  <div className="flex h-[52px] w-[52px] items-center justify-center rounded-[18px] bg-[#E67468] text-[20px] font-bold text-white flex-shrink-0" style={JK}>
                    {initials || "U"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[16px] font-bold text-[#2E2A27] truncate" style={JK}>{displayName}</p>
                    <p className="text-[13px] text-[#8C8681] truncate" style={INTER}>{userEmail || ""}</p>
                  </div>
                  <div className="mt-1.5">
                    <span className="inline-flex rounded-md bg-[#F5E8E7] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#E67468]">Candidate</span>
                  </div>
                </div>
                <button onClick={() => nav("profile-edit")} className="flex h-9 w-9 items-center justify-center rounded-full border border-[#EADFD3] bg-[#FAF6F0] flex-shrink-0">
                  <Edit2 size={15} color="#8C8681" />
                </button>
              </div>
            </div>

            <div className="mx-5 mb-6 grid grid-cols-3 gap-2.5">
              {[{ label: "Tests Taken", value: completedTests ? completedTests.toString() : "—" }, { label: "Avg. Score", value: avgScore !== null ? `${avgScore}%` : "—" }, { label: "Best Score", value: bestScore !== null ? `${bestScore}%` : "—" }].map(({ label, value }) => (
                <div key={label} className="rounded-[16px] border border-[#EADFD3] bg-white py-3 px-2 text-center shadow-sm">
                  <p className="text-[16px] font-bold text-[#2E2A27]" style={JK}>{value}</p>
                  <p className="mt-1 text-[10px] text-[#8C8681] font-medium" style={INTER}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-[#EADFD3] bg-white p-5 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-[#2E2A27]" style={JK}>History</h3>
              <button onClick={() => { onTab("lead"); nav("home"); }} className="text-[12px] font-semibold text-[#E67468]">View all</button>
            </div>
            {sessions.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-[13px] font-medium text-[#8C8681]" style={INTER}>No history found</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {sessions.slice(0, 3).map((s: any) => {
                  const p = pct(s.score, s.total_questions);
                  return (
                    <div key={s.id} className="rounded-2xl border border-[#EADFD3] bg-[#FAF6F0] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold text-[#2E2A27]" style={JK}>{s.title}</p>
                          <p className="mt-1 text-[11px] text-[#94A3B8]" style={INTER}>{new Date(s.completed_at).toLocaleDateString()}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${sBadge(p)}`}>{p}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-[24px] border border-[#EADFD3] bg-white shadow-sm overflow-hidden">
            <div className="w-full px-4 py-3.5 flex items-center gap-3 border-b border-[#F1F5F9]">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F5E8E7]">
                <Bell size={16} color="#E67468" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-[#2E2A27]" style={INTER}>Notifications</p>
                <p className="mt-0.5 text-[12px] text-[#8C8681]" style={INTER}>Turn app alerts on or off</p>
              </div>
              <button onClick={() => setNotificationsEnabled(value => !value)} className="h-7 w-12 rounded-full p-[3px] transition-all" style={{ background: notificationsEnabled ? "#E67468" : "#E5E7EB" }}>
                <span className="block h-5 w-5 rounded-full bg-white shadow-sm transition-transform" style={{ transform: notificationsEnabled ? "translateX(100%)" : "translateX(0)" }} />
              </button>
            </div>
            <button onClick={() => nav("settings-preferences")} className="w-full px-4 py-3.5 flex items-center gap-3 border-b border-[#F1F5F9] text-left">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F5E8E7]">
                <BookOpen size={16} color="#E67468" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-[#2E2A27]" style={INTER}>Study Preferences</p>
                <p className="mt-0.5 text-[12px] text-[#8C8681]" style={INTER}>Appearance, study plan and goals</p>
              </div>
              <ChevronRight size={16} color="#94A3B8" />
            </button>
            <button onClick={() => nav("settings-reminders")} className="w-full px-4 py-3.5 flex items-center gap-3 text-left">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F5E8E7]">
                <Clock size={16} color="#E67468" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-[#2E2A27]" style={INTER}>Exam Reminders</p>
                <p className="mt-0.5 text-[12px] text-[#8C8681]" style={INTER}>Manage your exam alerts</p>
              </div>
              <ChevronRight size={16} color="#94A3B8" />
            </button>
          </div>

          <div className="rounded-[24px] border border-[#EADFD3] bg-white shadow-sm overflow-hidden">
            <button onClick={() => nav("about")} className="w-full px-4 py-3.5 flex items-center gap-3 border-b border-[#F1F5F9] text-left">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F5E8E7]">
                <User size={16} color="#E67468" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-[#2E2A27]" style={INTER}>About PastQ</p>
                <p className="mt-0.5 text-[12px] text-[#8C8681]" style={INTER}>Learn more about the app</p>
              </div>
              <ChevronRight size={16} color="#94A3B8" />
            </button>
            <button onClick={() => nav("support")} className="w-full px-4 py-3.5 flex items-center gap-3 text-left">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F5E8E7]">
                <AlertTriangle size={16} color="#E67468" />
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-[#2E2A27]" style={INTER}>Help & Support</p>
                <p className="mt-0.5 text-[12px] text-[#8C8681]" style={INTER}>Get help with your account</p>
              </div>
              <ChevronRight size={16} color="#94A3B8" />
            </button>
          </div>

          <button onClick={() => setShowSignOutConfirm(true)} className="w-full rounded-2xl border border-[#FECACA] bg-white py-4 flex items-center justify-center gap-2 shadow-sm">
            <LogOut size={17} color="#EF4444" />
            <span className="text-[15px] font-semibold text-[#EF4444]" style={JK}>Sign Out</span>
          </button>

          <p className="text-center text-[11px] text-[#CBD5E1]" style={INTER}>PastQ v1.0.0</p>
        </div>
      </div>

      {showSignOutConfirm && (
        <div className="absolute inset-0 z-20 flex items-end bg-black/35 px-4 pb-4">
          <div className="w-full rounded-[24px] border border-[#EADFD3] bg-white p-5 shadow-2xl">
            <p className="text-[16px] font-bold text-[#2E2A27]" style={JK}>Sign out?</p>
            <p className="mt-2 text-[13px] text-[#8C8681]" style={INTER}>You’ll need to sign in again to continue using PastQ.</p>
            <div className="mt-4 flex gap-3">
              <button onClick={() => setShowSignOutConfirm(false)} className="flex-1 rounded-2xl border border-[#EADFD3] bg-[#FAF6F0] px-4 py-3 text-[14px] font-semibold text-[#2E2A27]">Cancel</button>
              <button onClick={async () => { setShowSignOutConfirm(false); await logoutUser(); nav("login"); }} className="flex-1 rounded-2xl bg-[#EF4444] px-4 py-3 text-[14px] font-semibold text-white">Yes, Sign Out</button>
            </div>
          </div>
        </div>
      )}

      <BottomNav tab={tab} onTab={onTab} onSnap={() => nav("snap")} />
    </div>
  );
}

function EditProfileScreen({ nav, userName, setUserName, userEmail, userAvatar }: { nav: (s: Screen) => void; userName: string; setUserName: (n: string) => void; userEmail: string; userAvatar: string }) {
  const [name, setName] = useState(userName || "I");
  const [phone, setPhone] = useState("");

  const handleSave = () => {
    setUserName(name);
    nav("preference");
  };

  return (
    <div className="h-full flex flex-col bg-[#FAF6F0]">
      <div className="px-5 pt-2 flex items-center justify-between border-b border-[#EADFD3] bg-white py-3">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-[16px] font-bold text-[#2E2A27]" style={JK}>Edit Profile</h2>
            <p className="text-[12px] text-[#8C8681]" style={INTER}>Update your details</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
        <div className="flex flex-col items-center">
          <div className="relative">
            {userAvatar ? (
              <img src={userAvatar} alt="Profile" className="h-[88px] w-[88px] rounded-[28px] object-cover shadow-md shadow-blue-500/20" />
            ) : (
              <div className="flex h-[88px] w-[88px] items-center justify-center rounded-[28px] bg-[#E67468] text-[36px] font-bold text-white shadow-md shadow-blue-500/20" style={JK}>
                {name ? name.charAt(0).toUpperCase() : "U"}
              </div>
            )}
            <button className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-xl border border-[#EADFD3] bg-white shadow-sm">
              <Camera size={16} color="#8C8681" />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-[#374151]" style={JK}>Full Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-white rounded-xl px-4 py-3.5 text-[15px] text-[#2E2A27] border border-[#EADFD3] focus:border-[#E67468] focus:ring-[3px] focus:ring-[#E67468]/10 outline-none transition-all"
              style={INTER}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-[#374151]" style={JK}>Email Address</label>
            <input
              type="email"
              value={userEmail || "user@example.com"}
              disabled
              className="w-full bg-[#F1F5F9] rounded-xl px-4 py-3.5 text-[15px] text-[#94A3B8] border border-[#EADFD3] outline-none"
              style={INTER}
            />
            <p className="text-[11px] text-[#94A3B8]" style={INTER}>Email address cannot be changed.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-[#374151]" style={JK}>Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="e.g. +234 800 000 0000"
              className="w-full bg-white rounded-xl px-4 py-3.5 text-[15px] text-[#2E2A27] border border-[#EADFD3] focus:border-[#E67468] focus:ring-[3px] focus:ring-[#E67468]/10 outline-none transition-all"
              style={INTER}
            />
          </div>
        </div>
      </div>

      <div className="px-5 py-4 bg-white border-t border-[#EADFD3]">
        <button onClick={handleSave} className="w-full py-4 rounded-2xl bg-[#E67468] text-white text-[15px] font-bold shadow-lg shadow-blue-500/20" style={JK}>
          Save Changes
        </button>
      </div>
    </div>
  );
}

function StudyPreferencesScreen({ nav, theme, onTheme }: { nav: (s: Screen) => void; theme: StudyTheme; onTheme: (theme: StudyTheme) => void }) {
  const [focus, setFocus] = useState("Entrance exams");
  const [time, setTime] = useState("1-2");

  return (
    <main className="study-app preferences-screen">
      <header className="study-topbar preferences-header">
        <h1>Preferences</h1>
      </header>
      <div className="preferences-content">
        <section className="preference-section">
          <h2>Appearance</h2>
          <p>Make this space feel right for you.</p>
          <div className="theme-choices" role="radiogroup" aria-label="Colour theme" onKeyDown={event => {
            if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const next = event.key === "Home" ? "light" : event.key === "End" ? "dark" : theme === "light" ? "dark" : "light";
            onTheme(next);
            event.currentTarget.querySelectorAll<HTMLButtonElement>("button")[next === "light" ? 0 : 1]?.focus();
          }}>
            {(["light", "dark"] as const).map(mode => (
              <button key={mode} role="radio" tabIndex={theme === mode ? 0 : -1} aria-checked={theme === mode} className={`theme-choice ${theme === mode ? "selected" : ""}`} onClick={() => onTheme(mode)}>
                <span className={`theme-preview theme-preview-${mode}`} aria-hidden="true"><span className="preview-heading" /><span className="preview-line" /><span className="preview-paper"><i /><i /><b /></span></span>
                <span className="theme-choice-label"><strong>{mode === "light" ? "Light" : "Dark"}</strong><span className="theme-radio">{theme === mode && <Check size={13} strokeWidth={3} />}</span></span>
              </button>
            ))}
          </div>
          <span className="preference-note">Saved automatically on this device.</span>
        </section>
        <section className="preference-section">
          <h2>Exam focus</h2>
          <div className="preference-options" role="radiogroup" aria-label="Exam focus">
            {["Entrance exams", "Secondary school exams", "University exams", "Professional exams"].map(opt => <button key={opt} role="radio" aria-checked={focus === opt} onClick={() => setFocus(opt)}><span>{opt}</span><span className={`theme-radio ${focus === opt ? "selected" : ""}`}>{focus === opt && <Check size={13} strokeWidth={3} />}</span></button>)}
          </div>
        </section>
        <section className="preference-section">
          <h2>Daily study goal</h2>
          <div className="preference-options" role="radiogroup" aria-label="Daily study goal">
            {[{ id: "lt1", label: "Less than 1 hour" }, { id: "1-2", label: "1–2 hours" }, { id: "3-4", label: "3–4 hours" }].map(opt => <button key={opt.id} role="radio" aria-checked={time === opt.id} onClick={() => setTime(opt.id)}><span>{opt.label}</span><span className={`theme-radio ${time === opt.id ? "selected" : ""}`}>{time === opt.id && <Check size={13} strokeWidth={3} />}</span></button>)}
          </div>
        </section>
      </div>
    </main>
  );
}

function ExamRemindersScreen({ nav }: { nav: (s: Screen) => void }) {
  const [reminders, setReminders] = useState<{ id: string; time: string; enabled: boolean }[]>([
    { id: "1", time: "08:00", enabled: true }
  ]);

  const addReminder = () => {
    setReminders([...reminders, { id: Date.now().toString(), time: "12:00", enabled: true }]);
  };

  const toggleReminder = (id: string) => {
    setReminders(reminders.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const updateTime = (id: string, time: string) => {
    setReminders(reminders.map(r => r.id === id ? { ...r, time } : r));
  };

  const deleteReminder = (id: string) => {
    setReminders(reminders.filter(r => r.id !== id));
  };

  return (
    <div className="h-full flex flex-col bg-[#FAF6F0]">
      <div className="px-5 pt-2 flex items-center gap-3 border-b border-[#EADFD3] bg-white py-3">
        <div>
          <h2 className="text-[16px] font-bold text-[#2E2A27]" style={JK}>Exam Reminders</h2>
          <p className="text-[12px] text-[#8C8681]" style={INTER}>Manage reminder settings</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {reminders.map(r => (
          <div key={r.id} className="bg-white rounded-[20px] border border-[#EADFD3] p-4 shadow-sm flex items-center gap-4">
            <div className="flex-1">
              <input type="time" value={r.time} onChange={(e) => updateTime(r.id, e.target.value)}
                className="text-[24px] font-bold text-[#2E2A27] bg-transparent outline-none w-full" style={MONO} />
              <p className="text-[12px] text-[#8C8681] mt-1" style={INTER}>Daily reminder</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => toggleReminder(r.id)} className="h-7 w-12 rounded-full p-[3px] transition-all" style={{ background: r.enabled ? "#E67468" : "#E5E7EB" }}>
                <span className="block h-5 w-5 rounded-full bg-white shadow-sm transition-transform" style={{ transform: r.enabled ? "translateX(100%)" : "translateX(0)" }} />
              </button>
              <button onClick={() => deleteReminder(r.id)} className="w-9 h-9 flex items-center justify-center rounded-full bg-[#FEF2F2] hover:bg-[#FEE2E2] transition-colors">
                <X size={16} color="#EF4444" />
              </button>
            </div>
          </div>
        ))}

        <button onClick={addReminder} className="w-full py-4 rounded-[20px] border-[1.5px] border-dashed border-[#E67468] text-[#E67468] text-[15px] font-bold flex items-center justify-center gap-2 bg-[#F5E8E7]/50 hover:bg-[#F5E8E7] transition-all" style={JK}>
          <Plus size={18} strokeWidth={2.5} /> Add Another Reminder
        </button>
      </div>
    </div>
  );
}

function AboutScreen({ nav }: { nav: (s: Screen) => void }) {
  return (
    <div className="h-full flex flex-col bg-[#FAF6F0]">
      <div className="px-5 pt-2 flex items-center gap-3 border-b border-[#EADFD3] bg-white py-3">
        <div>
          <h2 className="text-[16px] font-bold text-[#2E2A27]" style={JK}>About PastQ</h2>
          <p className="text-[12px] text-[#8C8681]" style={INTER}>Learn more about the app</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-[#E67468] to-[#D45B4F] rounded-[24px] flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4">
            <BookOpen size={32} color="white" />
          </div>
          <h1 className="text-[22px] font-bold text-[#2E2A27]" style={JK}>PastQ</h1>
          <p className="text-[14px] text-[#E67468] font-bold mt-1" style={MONO}>v1.0.2</p>
          <p className="text-[13px] text-[#8C8681] mt-3 leading-relaxed px-4" style={INTER}>
            Your ultimate study companion. We make exam preparation simple, fast, and effective for students everywhere.
          </p>
        </div>

        <div className="bg-white rounded-[24px] border border-[#EADFD3] shadow-sm overflow-hidden">
          {[
            { icon: <Star size={16} color="#7A6CB2" />, label: "Rate PastQ", sub: "Love the app? Let us know!" },
            { icon: <FileText size={16} color="#E67468" />, label: "Terms of Service", sub: "Read our terms" },
            { icon: <Shield size={16} color="#10B981" />, label: "Privacy Policy", sub: "How we protect your data" },
          ].map((item, i, arr) => (
            <button key={item.label} className={`w-full px-4 py-4 flex items-center gap-3 text-left ${i !== arr.length - 1 ? "border-b border-[#F1F5F9]" : ""}`}>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FAF6F0] border border-[#EADFD3]">
                {item.icon}
              </div>
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-[#2E2A27]" style={INTER}>{item.label}</p>
                <p className="text-[12px] text-[#8C8681] mt-0.5" style={INTER}>{item.sub}</p>
              </div>
              <ChevronRight size={16} color="#94A3B8" />
            </button>
          ))}
        </div>

        <div className="flex justify-center gap-4 pt-2">
          <button className="w-12 h-12 flex items-center justify-center rounded-full bg-white border border-[#EADFD3] shadow-sm text-[#1DA1F2]">
            <Twitter size={20} />
          </button>
          <button className="w-12 h-12 flex items-center justify-center rounded-full bg-white border border-[#EADFD3] shadow-sm text-[#181717]">
            <Github size={20} />
          </button>
        </div>

        <p className="text-center text-[12px] text-[#94A3B8] pt-4" style={INTER}>
          © 2026 PastQ App. All rights reserved.
        </p>
      </div>
    </div>
  );
}

function PlaceholderScreen({ title, subtitle, nav, backTo }: { title: string; subtitle: string; nav: (s: Screen) => void; backTo: Screen }) {
  return (
    <div className="h-full flex flex-col bg-[#FAF6F0]">
      <div className="px-5 pt-2 flex items-center gap-3 border-b border-[#EADFD3] bg-white py-3">
        <div>
          <h2 className="text-[16px] font-bold text-[#2E2A27]" style={JK}>{title}</h2>
          <p className="text-[12px] text-[#8C8681]" style={INTER}>{subtitle}</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-[320px] rounded-[24px] border border-[#EADFD3] bg-white p-6 text-center shadow-sm">
          <p className="text-[14px] font-semibold text-[#2E2A27]" style={JK}>{title}</p>
          <p className="mt-2 text-[12px] text-[#8C8681] leading-relaxed" style={INTER}>This screen is ready for your next detail. Add content here when you want to expand the experience.</p>
        </div>
      </div>
    </div>
  );
}

// ── Onboarding Screens ───────────────────────────────────────────────────────

function OnboardStep({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-1 rounded-full transition-all duration-300"
          style={{ width: i === step ? 24 : 8, background: i <= step ? "#E67468" : "#EADFD3" }} />
      ))}
    </div>
  );
}

const EXAM_TYPES = [
  { id: "entrance", label: "Entrance exams", icon: "🎯" },
  { id: "secondary", label: "Secondary school exams", icon: "📋" },
  { id: "university", label: "University exams", icon: "🎓" },
  { id: "professional", label: "Professional exams", icon: "🏛️" },
  { id: "other", label: "Other exam", icon: "✏️" },
];

function Onboard1Screen({ nav }: { nav: (s: Screen) => void }) {
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (selected) {
      const timer = setTimeout(() => nav("onboard-3"), 600);
      return () => clearTimeout(timer);
    }
  }, [selected, nav]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF6F0]">
      <div className="px-5 pt-2 flex items-center justify-between">
        <OnboardStep step={1} />
        <div className="w-9" />
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h2 className="text-[28px] font-bold text-[#2E2A27] leading-tight" style={JK}>
            What are you<br />preparing for?
          </h2>
          <p className="text-[14px] text-[#8C8681] mt-2" style={INTER}>
            This helps us personalise your experience
          </p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }} className="space-y-2.5">
          {EXAM_TYPES.map(({ id, label, icon }) => {
            const active = selected === id;
            return (
              <button key={id} onClick={() => setSelected(id)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-[1.5px] text-left transition-all"
                style={{ background: active ? "#F5E8E7" : "white", borderColor: active ? "#E67468" : "#EADFD3" }}>
                <span className="text-[20px] w-7 text-center leading-none">{icon}</span>
                <span className="flex-1 text-[15px] font-semibold text-[#2E2A27]" style={JK}>{label}</span>
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                  style={{ background: active ? "#E67468" : "#F1F5F9", border: active ? "none" : "1.5px solid #EADFD3" }}>
                  {active && <Check size={12} color="white" strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </motion.div>
      </div>
      <div className="px-5 py-4 bg-white border-t border-[#EADFD3]">
        <button onClick={() => selected && nav("onboard-3")}
          className="w-full py-4 rounded-2xl text-[15px] font-bold transition-all"
          style={{ background: selected ? "#E67468" : "#EADFD3", color: selected ? "white" : "#94A3B8", boxShadow: selected ? "0 8px 20px rgba(37,99,235,0.2)" : "none", ...JK }}>
          Continue
        </button>
      </div>
    </div>
  );
}

// Onboard2Screen removed — exam name/date step no longer required

const STUDY_OPTS = [
  { id: "lt1", label: "Less than 1 hour", sub: "Short daily bursts" },
  { id: "1-2", label: "1–2 hours", sub: "Consistent practice" },
  { id: "3-4", label: "3–4 hours", sub: "Deep study sessions" },
  { id: "all", label: "More than 4 hours", sub: "Full preparation mode" },
];

function Onboard3Screen({ nav }: { nav: (s: Screen) => void }) {
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (selected) {
      const timer = setTimeout(() => nav("onboard-4"), 600);
      return () => clearTimeout(timer);
    }
  }, [selected, nav]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF6F0]">
      <div className="px-5 pt-2 flex items-center justify-between">
        <OnboardStep step={3} />
        <div className="w-9" />
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h2 className="text-[28px] font-bold text-[#2E2A27] leading-tight" style={JK}>
            How much time do<br />you have daily?
          </h2>
          <p className="text-[14px] text-[#8C8681] mt-2" style={INTER}>
            {"We'll"} plan your practice sessions around this
          </p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }} className="space-y-3">
          {STUDY_OPTS.map(({ id, label, sub }) => {
            const active = selected === id;
            return (
              <button key={id} onClick={() => setSelected(id)}
                className="w-full p-4 rounded-2xl border-[1.5px] text-left transition-all"
                style={{ background: active ? "#E67468" : "white", borderColor: active ? "#E67468" : "#EADFD3", boxShadow: active ? "0 8px 24px rgba(37,99,235,0.25)" : "none" }}>
                <p className="text-[17px] font-bold leading-tight" style={{ color: active ? "white" : "#2E2A27", ...JK }}>{label}</p>
                <p className="text-[12px] mt-1" style={{ color: active ? "rgba(255,255,255,0.72)" : "#94A3B8", ...INTER }}>{sub}</p>
              </button>
            );
          })}
        </motion.div>
      </div>
      <div className="px-5 py-4 bg-white border-t border-[#EADFD3]">
        <button onClick={() => selected && nav("onboard-4")}
          className="w-full py-4 rounded-2xl text-[15px] font-bold transition-all"
          style={{ background: selected ? "#E67468" : "#EADFD3", color: selected ? "white" : "#94A3B8", boxShadow: selected ? "0 8px 20px rgba(37,99,235,0.2)" : "none", ...JK }}>
          Continue
        </button>
      </div>
    </div>
  );
}

const BUILD_ITEMS = [
  "Choose your exam focus",
  "Set personal study goals",
  "Prepare your practice routine",
];

function Onboard4Screen({ nav }: { nav: (s: Screen) => void }) {
  const [ticked, setTicked] = useState(0);
  const [barW, setBarW] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setTicked(1), 500);
    const t2 = setTimeout(() => setTicked(2), 1000);
    const t3 = setTimeout(() => setTicked(3), 1500);
    const tb = setTimeout(() => setBarW(70), 300);
    const tn = setTimeout(() => nav("onboard-5"), 2000);
    return () => [t1, t2, t3, tb, tn].forEach(clearTimeout);
  }, []);

  return (
    <div className="h-full flex flex-col items-center justify-center bg-[#FAF6F0] px-8">
      {/* Spinner */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative w-20 h-20 mb-8">
        <div className="absolute inset-0 rounded-full border-[6px] border-[#EADFD3]" />
        <div className="absolute inset-0 rounded-full border-[6px] border-transparent border-t-[#E67468] animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-9 h-9 rounded-xl bg-[#F5E8E7] flex items-center justify-center">
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
              <path d="M1 7 L6 12 L17 1" stroke="#E67468" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}>
        <h2 className="text-[22px] font-bold text-[#2E2A27] text-center mb-1.5" style={JK}>
          Setting up your<br />PastQ experience
        </h2>
        <p className="text-[14px] text-[#94A3B8] text-center mb-8" style={INTER}>Just a moment…</p>
      </motion.div>

      {/* Animated checklist */}
      <div className="w-full space-y-3 mb-8">
        {BUILD_ITEMS.map((item, i) => {
          const done = ticked > i;
          return (
            <div key={item}
              className="flex items-center gap-3 p-3.5 rounded-2xl border transition-all duration-500"
              style={{ background: done ? "#F0FDF4" : "white", borderColor: done ? "#86EFAC" : "#EADFD3" }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300"
                style={{ background: done ? "#22C55E" : "#F1F5F9" }}>
                {done
                  ? <Check size={14} color="white" strokeWidth={2.5} />
                  : <div className="w-2 h-2 rounded-full bg-[#CBD5E1]" />}
              </div>
              <span className="text-[14px] font-medium transition-colors duration-300"
                style={{ color: done ? "#15803D" : "#94A3B8", ...INTER }}>
                {item}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="w-full">
        <div className="h-2.5 bg-[#EADFD3] rounded-full overflow-hidden">
          <div className="h-full bg-[#E67468] rounded-full transition-all duration-[2000ms] ease-out"
            style={{ width: `${barW}%` }} />
        </div>
        <p className="text-[12px] text-[#94A3B8] text-center mt-2" style={INTER}>{barW}% complete</p>
      </div>
    </div>
  );
}

function PayoffIllustration() {
  return (
    <svg width="240" height="212" viewBox="0 0 240 212" fill="none" aria-hidden="true">
      {/* Burst rays */}
      <line x1="120" y1="20" x2="120" y2="7" stroke="#7A6CB2" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="172" y1="36" x2="180" y2="25" stroke="#7A6CB2" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="203" y1="82" x2="215" y2="76" stroke="#7A6CB2" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="203" y1="128" x2="215" y2="134" stroke="#7A6CB2" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="172" y1="170" x2="180" y2="181" stroke="#7A6CB2" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="68" y1="170" x2="60" y2="181" stroke="#7A6CB2" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="37" y1="128" x2="25" y2="134" stroke="#7A6CB2" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="37" y1="82" x2="25" y2="76" stroke="#7A6CB2" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="68" y1="36" x2="60" y2="25" stroke="#7A6CB2" strokeWidth="3.5" strokeLinecap="round" />
      {/* Background glow circle */}
      <circle cx="120" cy="105" r="68" fill="#F5E8E7" />
      {/* Student — head */}
      <circle cx="120" cy="72" r="19" fill="#E67468" />
      <circle cx="113" cy="70" r="2.5" fill="white" />
      <circle cx="127" cy="70" r="2.5" fill="white" />
      <path d="M114 79 Q120 84 126 79" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      {/* Body */}
      <rect x="100" y="93" width="40" height="35" rx="8" fill="#E67468" />
      {/* Left arm raised */}
      <path d="M100 100 L85 79" stroke="#E67468" strokeWidth="7" strokeLinecap="round" />
      <circle cx="83" cy="77" r="5.5" fill="#E67468" />
      {/* Right arm with phone */}
      <path d="M140 98 L156 82" stroke="#E67468" strokeWidth="7" strokeLinecap="round" />
      {/* Phone */}
      <rect x="152" y="68" width="21" height="30" rx="4" fill="white" stroke="#E67468" strokeWidth="2" />
      <rect x="156" y="73" width="13" height="18" rx="2" fill="#60A5FA" />
      <path d="M157 82 L160 85 L167 78" stroke="#22C55E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="162.5" cy="93.5" r="1.5" fill="#CBD5E1" />
      {/* Confetti */}
      <rect x="40" y="46" width="11" height="11" rx="3" fill="#7A6CB2" transform="rotate(22 45 51)" />
      <rect x="184" y="42" width="10" height="10" rx="2.5" fill="#E67468" opacity="0.7" transform="rotate(-16 189 47)" />
      <rect x="33" y="118" width="9" height="9" rx="2" fill="#60A5FA" transform="rotate(28 37 122)" />
      <rect x="192" y="116" width="10" height="10" rx="2.5" fill="#7A6CB2" transform="rotate(-24 197 121)" />
      <circle cx="62" cy="162" r="6" fill="#7A6CB2" opacity="0.6" />
      <circle cx="182" cy="164" r="5" fill="#E67468" opacity="0.5" />
      <circle cx="48" cy="82" r="4.5" fill="#E67468" opacity="0.22" />
      <circle cx="197" cy="78" r="5" fill="#7A6CB2" opacity="0.38" />
      {/* Stars */}
      <path d="M60 56 L62.5 63.5 L70.5 63.5 L64.5 68.4 L67 76 L60 71.1 L53 76 L55.5 68.4 L49.5 63.5 L57.5 63.5 Z" fill="#7A6CB2" opacity="0.9" />
      <path d="M183 52 L185 57.5 L191 57.5 L186.5 61 L188.5 66.5 L183 63 L177.5 66.5 L179.5 61 L175 57.5 L181 57.5 Z" fill="#7A6CB2" opacity="0.65" />
    </svg>
  );
}

function Onboard5Screen({ nav, onComplete }: { nav: (s: Screen) => void; onComplete: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-between bg-[#FAF6F0] px-7 pb-10">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="flex-1 flex flex-col items-center justify-center gap-7">
        <PayoffIllustration />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }} className="text-center space-y-3">
          <h2 className="text-[34px] font-extrabold text-[#2E2A27] tracking-tight leading-tight" style={JK}>
            {"You're"} all set!
          </h2>
          <p className="text-[15px] text-[#8C8681] leading-relaxed max-w-[256px]" style={INTER}>
            Snap your first past question and start your CBT simulation today
          </p>
        </motion.div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="w-full space-y-3">
        <PrimaryBtn label="Take Me to PastQ" onClick={() => { onComplete(); nav("home"); }} />
        <p className="text-center text-[13px] text-[#94A3B8]" style={INTER}>Your exam simulator is ready</p>
      </motion.div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [theme, setTheme] = useState<StudyTheme>(readTheme);
  useEffect(() => { applyTheme(theme); }, [theme]);
  useEffect(() => {
    const syncTheme = (event: StorageEvent) => { if (event.key === THEME_STORAGE_KEY || event.key === null) setTheme(readTheme()); };
    window.addEventListener("storage", syncTheme);
    return () => window.removeEventListener("storage", syncTheme);
  }, []);
  const { screen, setScreen, tab: navTab, setTab: setNavTab } = useAppNavigation<Screen, NavTab>("splash", "home");
  const [activeQuestions, setActiveQuestions] = useState<Q[]>(DEMO_QUESTIONS);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(DEMO_QUESTIONS.length).fill(null));
  const [flagged, setFlagged] = useState<boolean[]>(Array(DEMO_QUESTIONS.length).fill(false));
  const [currentQ, setCurrentQ] = useState(0);
  const [reviewQ, setReviewQ] = useState(0);
  const submitted = useRef(false);
  const examDeadline = useRef<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const [examDuration, setExamDuration] = useState(30 * 60);
  // Answers remain hidden until the session is submitted.
  const [practiceMode, setPracticeMode] = useState(false);
  const [visionSessionId, setVisionSessionId] = useState<string | null>(null);
  const [uploadDraft, setUploadDraft] = useState<UploadDraft>({ files: [], name: "" });

  const [timeTaken, setTimeTaken] = useState(0);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userAvatar, setUserAvatar] = useState("");
  const [userId, setUserId] = useState("");
  const [sessions, setSessions] = useState<any[]>([]);
  const [offlineLibrary, setOfflineLibrary] = useState<any[]>([]);
  const [globalLibrary, setGlobalLibrary] = useState<any[]>([]);
  const [libraryCatalog, setLibraryCatalog] = useState<LibraryCatalog | null>(null);
  const [libraryStatus, setLibraryStatus] = useState<"loading" | "ready" | "error">("loading");
  const [customizeBundle, setCustomizeBundle] = useState<any | null>(null);
  const [practiceSource, setPracticeSource] = useState({ bundleId: "demo", version: null as string | null });

  const refreshGlobalLibrary = async () => {
    setLibraryStatus("loading");
    try {
      const [globalLib, catalog] = await Promise.all([
        getGlobalLibrary(),
        getGlobalCatalog(),
      ]);
      setGlobalLibrary(globalLib || []);
      setLibraryCatalog(catalog);
      setLibraryStatus("ready");
    } catch (e) {
      console.warn("Library refresh failed", e);
      setLibraryStatus("error");
    }
  };

  const handleSelectManufacturer = async (
    mfg: CatalogManufacturer,
    exam: CatalogExamType,
    uni: CatalogUniversity
  ) => {
    try {
      let bundle = await getOfflineBundle(mfg.bundleId);
      if (!bundle?.questions?.length) {
        bundle = await getBundleFromApi(mfg.bundleId);
        await saveBundle(bundle);
        await refreshOfflineLibrary();
      }
      if (!bundle?.questions?.length) {
        alert("This material has no questions yet.");
        return;
      }
      setCustomizeBundle({
        ...bundle,
        examType: bundle.exam?.name || bundle.examType || exam.name,
        university: bundle.organization?.name || bundle.university || uni.name,
        manufacturer: bundle.publisher || bundle.manufacturer || mfg.name,
      });
      setScreen("customize-cbt");
    } catch (e) {
      console.error(e);
      alert("Could not load this material. Check your connection.");
    }
  };

  const loadQuestions = (qs: Q[], nextScreen: Screen = "exam") => {
    submitted.current = false;
    if (!Array.isArray(qs) || qs.length === 0) {
      alert("No questions found in this material.");
      return;
    }
    const list = sortQuestions(qs);
    setActiveQuestions(list);
    setAnswers(Array(list.length).fill(null));
    setFlagged(Array(list.length).fill(false));
    setCurrentQ(0);
    setTimeLeft(examDuration);
    setShowModal(false);
    setScreen(nextScreen);
  };

  const startDemo = () => {
    submitted.current = false;
    const questions = sortQuestions(DEMO_QUESTIONS);
    setPracticeSource({ bundleId: "demo", version: "guided-v1" });
    setActiveQuestions(questions);
    setAnswers(Array(questions.length).fill(null));
    setFlagged(Array(questions.length).fill(false));
    setCurrentQ(0);
    setExamDuration(5 * 60);
    setTimeLeft(5 * 60);
    setShowModal(false);
    setCustomizeBundle({ id: "demo", name: "Study sampler", questions });
    setScreen("customize-cbt");
  };

  const refreshOfflineLibrary = async () => {
    try {
      const lib = await getOfflineLibrary();
      setOfflineLibrary(lib || []);
    } catch {}
  };

  const openBundle = async (bundle: any) => {
    try {
      const fresh = (await getOfflineBundle(bundle.id)) || bundle;
      const qs = Array.isArray(fresh?.questions) ? fresh.questions : [];
      if (!qs.length) {
        alert("This download has no saved questions yet. Re-extract or re-download it.");
        return;
      }
      if (fresh.manufacturer || fresh.university || fresh.examType) {
        setCustomizeBundle({
          ...fresh,
          questions: qs,
        });
        setScreen("customize-cbt");
        // Background revalidation: offline copy may predate server additions.
        // Silently upgrade if the API bundle has more questions.
        getBundleFromApi(bundle.id)
          .then(async (live: any) => {
            const liveQs = Array.isArray(live?.questions) ? live.questions : [];
            if (liveQs.length > qs.length) {
              const saved = await saveBundle(live);
              setCustomizeBundle({ ...saved, questions: saved.questions });
              await refreshOfflineLibrary();
            }
          })
          .catch(() => {});
        return;
      }
      setPracticeSource({ bundleId: String(fresh.id || bundle.id), version: fresh.updatedAt || fresh.updated_at || null });
      loadQuestions(qs as Q[], "review-questions");
    } catch (e) {
      console.error(e);
      alert("Could not open this material.");
    }
  };

  const handleDownloadBundle = async (bundle: any) => {
    try {
      await downloadBundle(bundle.id);
      await refreshOfflineLibrary();
      alert("Downloaded for offline use.");
    } catch (e) {
      console.error(e);
      alert("Download failed. Check your connection.");
    }
  };

  useEffect(() => {
    refreshGlobalLibrary().catch(() => {});
    refreshOfflineLibrary().catch(() => {});
  }, []);

  useEffect(() => {
    const unsub = listenToAuth(async (user) => {
      if (user) {
        setUserName(user.user_metadata?.full_name || user.email?.split("@")[0] || "Student");
        setUserEmail(user.email || "");
        setUserAvatar(user.user_metadata?.avatar_url || "");
        setUserId(user.id);
        let profile = null;
        try { profile = await getUserProfile(user.id); } catch {}
        if (!profile) {
          try { profile = await createUserProfile(user.id, user.email || "", user.user_metadata?.full_name || ""); } catch {}
        }

        setScreen((prev) => {
          if (prev === "splash" || prev === "login" || prev === "signup") {
            return "home";
          }
          return prev;
        });
        // Fetch real sessions from Supabase (silently fail if table missing)
        try {
          const history = await getUserHistory(user.id);
          setSessions(history || []);
        } catch {}
        // Load offline library from IndexedDB
        try {
          const lib = await getOfflineLibrary();
          setOfflineLibrary(lib || []);
        } catch {}
        // Fetch global library from the Hostinger API.
        try {
          await refreshGlobalLibrary();
        } catch {}
      } else {
        setSessions([]);
        setOfflineLibrary([]);
        setUserName("");
        setUserEmail("");
        setUserAvatar("");
        setUserId("");
      }
    });
    return () => unsub();
  }, []);

  const nav = (s: Screen) => {
    if (s === "exam") {
      submitted.current = false;
      setAnswers(Array(activeQuestions.length).fill(null));
      setFlagged(Array(activeQuestions.length).fill(false));
      setCurrentQ(0);
      setShowModal(false);
      setTimeLeft(examDuration);
    }
    if (s === "review-answers") setReviewQ(0);
    if (s === "home") setNavTab("home");
    if (s === "preference") setNavTab("preference");
    setScreen(s);
  };

  const handleNavTab = (t: NavTab) => {
    setNavTab(t);
    if (t === "preference") setScreen("preference");
    else setScreen("home");
  };

  // A wall-clock deadline stays accurate when a phone suspends its browser tab.
  useEffect(() => {
    if (screen !== "exam") { examDeadline.current = null; return; }
    examDeadline.current = Date.now() + timeLeft * 1000;
    const updateTimer = () => setTimeLeft(Math.max(0, Math.ceil(((examDeadline.current || Date.now()) - Date.now()) / 1000)));
    const id = setInterval(updateTimer, 1000);
    document.addEventListener("visibilitychange", updateTimer);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", updateTimer); };
  }, [screen]);

  useEffect(() => {
    if (screen === "exam" && timeLeft === 0) handleSubmit();
  }, [screen, timeLeft]);


  const handleSubmit = async () => {
    if (submitted.current) return;
    submitted.current = true;
    const s = activeQuestions.filter((q, i) => answerIndex(q) !== null && answers[i] === answerIndex(q)).length;
    setTimeTaken(examDuration - timeLeft);
    setShowModal(false);
    setScreen("results");
    // Save to Supabase if user is logged in
    if (userId) {
      try {
        const durationSeconds = examDuration - timeLeft;
        const attempts = activeQuestions.map((question, index) => ({
          questionKey: practiceQuestionKey(practiceSource.bundleId, question, index),
          topicKey: question.subject || "general",
          selectedOptionIndex: answers[index],
          isCorrect: answerIndex(question) === null || answers[index] == null ? null : answers[index] === answerIndex(question),
          attemptOrder: index,
        }));
        await savePracticeResult({
          userId,
          sourceBundleId: practiceSource.bundleId,
          sourceBundleVersion: practiceSource.version,
          durationSeconds,
          score: s,
          attempts,
        });
        // Best-effort anonymous cohort signal. Student progress is already
        // durably stored in Supabase above; this request holds no user id.
        void recordAnonymousAttemptSummary(attempts.map(({ questionKey, isCorrect }) => ({ questionKey, isCorrect })))
          .catch((error) => console.warn("Anonymous recommendation summary was not recorded", error));
        await saveExamSession({
          user_id: userId,
          title: "CBT Session",
          score: s,
          total_questions: activeQuestions.length,
          answered_count: attempts.filter((attempt) => attempt.selectedOptionIndex != null).length,
          duration_seconds: durationSeconds,
          source_bundle_id: practiceSource.bundleId,
          source_bundle_version: practiceSource.version,
        });
        const history = await getUserHistory(userId);
        setSessions(history || []);
      } catch (e) { console.error("Failed to save session:", e); }
    }
  };

  const handleAnswer = (qi: number, opt: number) => {
    setAnswers(prev => { const n = [...prev]; n[qi] = opt; return n; });
  };

  const handleFlag = (qi: number) => {
    setFlagged(prev => { const n = [...prev]; n[qi] = !n[qi]; return n; });
  };

  const renderScreen = () => {
    switch (screen) {
      case "splash": return <StudyWelcome onStart={startDemo} onBrowse={() => { setScreen("home"); setNavTab("library"); }} onSignup={() => nav("signup")} onLogin={() => nav("login")} />;
      case "signup": return <AuthScreen key="signup" mode="signup" nav={nav} />;
      case "login": return <AuthScreen key="login" mode="login" nav={nav} />;
      case "forgot-password": return <AuthScreen key="reset" mode="reset" nav={nav} />;
      // onboarding screens removed — users go directly to home after signup
      // case "onboard-name", "onboard-1" ... "onboard-5" all removed
      case "home": return (
        <HomeScreen
          nav={nav}
          tab={navTab}
          onTab={handleNavTab}
          userName={userName}
          sessions={sessions}
          offlineLibrary={offlineLibrary}
          globalLibrary={globalLibrary}
          libraryCatalog={libraryCatalog}
          libraryStatus={libraryStatus}
          onRetryLibrary={() => { void refreshGlobalLibrary(); }}
          onOpenBundle={openBundle}
          onDownloadBundle={handleDownloadBundle}
          onSelectManufacturer={handleSelectManufacturer}
          onStartDemo={startDemo}
        />
      );
      case "snap": return <SnapScreen nav={nav} draft={uploadDraft} onDraftChange={setUploadDraft} onSessionStarted={(id) => setVisionSessionId(id)} />;
      case "manual-entry": return <ManualEntryScreen nav={nav} onSessionStarted={(id) => setVisionSessionId(id)} />;
      case "processing": return (
        <ProcessingScreen
          nav={nav}
          sessionId={visionSessionId}
          onQuestionsReady={(qs) => {
            setPracticeSource({ bundleId: `vision:${visionSessionId || "draft"}`, version: null });
            loadQuestions(qs as Q[], "review-questions");
            // Open the prepared material immediately while the library refreshes.
            void Promise.all([refreshOfflineLibrary(), refreshGlobalLibrary()]);
          }}
        />
      );
      case "review-questions": return (
        <ReviewQuestionsScreen
          nav={nav}
          questions={activeQuestions}
          onUpdateQuestions={setActiveQuestions}
          onStartTest={(duration, selected) => {
            const ordered = sortQuestions(selected ?? activeQuestions);
            if (!ordered.length) return;
            setPracticeMode(false);
            setActiveQuestions(ordered);
            setAnswers(Array(ordered.length).fill(null));
            setFlagged(Array(ordered.length).fill(false));
            setCurrentQ(0);
            setExamDuration(duration);
            setTimeLeft(duration);
            submitted.current = false;
            setShowModal(false);
            setScreen("exam");
          }}
        />
      );
      case "customize-cbt": return customizeBundle ? (
        <CustomizeCbtScreen
          key={String(customizeBundle.id || "bundle")}
          bundle={customizeBundle}
          onProceed={async ({ questions, durationSeconds, mode }) => {
            setPracticeMode(mode === "practice");
            const sourceBundleId = String(customizeBundle.id || "library");
            // Keep the source identity through filtering, shuffling, ranking,
            // and focused retries so progress stays attached to the question.
            const ordered = questions.map((question, index) => {
              const sourceIndex = customizeBundle.questions.indexOf(question);
              return {
                ...question,
                practiceKey: practiceQuestionKey(sourceBundleId, question as unknown as Q, sourceIndex >= 0 ? sourceIndex : index),
              };
            }) as unknown as Q[];
            let recommended = ordered;
            if (userId && mode === "practice") {
              try {
                const ranked = await rankRecommendationCandidates(userId, ordered.map((question, index) => ({
                  question,
                  questionKey: practiceQuestionKey(sourceBundleId, question, index),
                  topicKey: question.subject || "general",
                })));
                recommended = ranked.map((item) => item.question);
              } catch (error) {
                console.warn("Could not personalise question order", error);
              }
            }
            setActiveQuestions(recommended);
            setAnswers(Array(recommended.length).fill(null));
            setFlagged(Array(recommended.length).fill(false));
            setCurrentQ(0);
            setExamDuration(durationSeconds);
            setTimeLeft(durationSeconds);
            setPracticeSource({
              bundleId: sourceBundleId,
              version: customizeBundle.updatedAt || customizeBundle.updated_at || null,
            });
            submitted.current = false;
            setShowModal(false);
            setScreen("exam");
          }}
        />
      ) : <PlaceholderScreen title="Material unavailable" subtitle="Return to the library and select the material again." nav={nav} backTo="home" />;
      case "exam": return (
        <StudyWorkspace
          questions={activeQuestions}
          answers={answers} onAnswer={handleAnswer}
          flagged={flagged} onFlag={handleFlag}
          currentQ={currentQ} onQ={setCurrentQ}
          timeLeft={timeLeft}
          duration={examDuration}
          showModal={showModal} onModal={setShowModal}
          onSubmit={handleSubmit} nav={nav}
          practice={practiceMode}
        />
      );
      case "results": return <StudyResults questions={activeQuestions} timeTaken={timeTaken} answers={answers} nav={destination => { nav(destination); if (destination === "home") setNavTab("library"); }} onPracticeMissed={() => {
        const missed = activeQuestions.filter((q, i) => answerIndex(q) !== null && answers[i] !== answerIndex(q));
        if (!missed.length) return;
        setCustomizeBundle({ id: practiceSource.bundleId, name: "Questions to revisit", questions: missed });
        setScreen("customize-cbt");
      }} />;
      case "review-answers": return <StudyWorkspace questions={activeQuestions} answers={answers} flagged={flagged} currentQ={reviewQ} onQ={setReviewQ} onAnswer={() => {}} onFlag={() => {}} timeLeft={timeLeft} duration={examDuration} showModal={false} onModal={() => {}} onSubmit={() => {}} nav={nav} review />;
      case "preference": return <ProfileScreen nav={nav} tab={navTab} onTab={handleNavTab} userName={userName} userEmail={userEmail} userAvatar={userAvatar} sessions={sessions} />;
      case "profile-edit": return <EditProfileScreen nav={nav} userName={userName} setUserName={setUserName} userEmail={userEmail} userAvatar={userAvatar} />;
      case "settings-preferences": return <StudyPreferencesScreen nav={nav} theme={theme} onTheme={setTheme} />;
      case "settings-reminders": return <ExamRemindersScreen nav={nav} />;
      case "settings-notifications": return <PlaceholderScreen title="Notifications" subtitle="Control app alerts" nav={nav} backTo="preference" />;
      case "about": return <AboutScreen nav={nav} />;
      case "support": return <PlaceholderScreen title="Help & Support" subtitle="Get help anytime" nav={nav} backTo="preference" />;
      default: return <PlaceholderScreen title="Page unavailable" subtitle="This screen could not be restored safely." nav={nav} backTo="home" />;
    }
  };

  return (
    <div className="pastq-root h-screen w-full" style={{ background: "var(--study-bg)", height: "100dvh" }}>
      <div className="h-full w-full overflow-hidden">
        {renderScreen()}
      </div>
    </div>
  );
}
