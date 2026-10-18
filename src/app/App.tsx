import React, { useState, useEffect, useRef } from "react";
import MathText from "./components/MathText";
import { useAppNavigation } from "./useAppNavigation";
import { AuthScreen } from "./components/auth/AuthScreen";
import OnboardingScreen from "./components/auth/OnboardingScreen";
import { readStudyPreferences } from "../services/onboarding";
import QuestionMedia, { type QuestionFigure } from "./components/QuestionMedia";
import ProcessingScreen from "./components/ProcessingScreen";
import ScholarMascot from "./components/ScholarMascot";
import ContentSkeleton from "./components/ContentSkeleton";
import AppWelcome from "./components/AppWelcome";
import { PreferencesScreen, ThemeScreen, RemindersScreen } from "./components/preferences/PreferencesScreen";
import { syncStudyHistory, syncReminderDeviceOwner } from "../services/reminders";
import { readPracticeHistory, rememberPractice, cachePracticeHistory, syncPracticeHistory, mergePracticeHistory, type PracticeSummary } from "../services/practiceHistory";
import StudyHome from "./components/home/StudyHome";
import DiscoverScreen from "./components/discover/DiscoverScreen";
import SnapScreen, { type UploadDraft } from "./components/upload/SnapScreen";
import { motion, AnimatePresence } from "motion/react";
import {
  Camera, Upload, Home, Clock, Compass, User, Monitor,
  Flag, Check, X, Eye, RotateCcw, Edit2,
  Bell, LogOut, AlertTriangle, BookOpen,
  ChevronRight, Plus, FileText, Shield, Star, Info, Twitter, Github, Library, Search, Download,
  Calculator, PenLine, Eraser, Trash2, Undo2, Send, ZoomIn, ZoomOut, ChevronDown, ChevronUp,
} from "lucide-react";
import { listenToAuth } from "../services/auth";

import { getUserHistory, savePracticeResult, getUserProfile, createUserProfile, updateUserProfile } from "../services/db";
import { getOfflineLibrary, getGlobalLibrary, getGlobalCatalog, downloadBundle, saveBundle, ensureBundleImages, getOfflineBundle, getBundleFromApi, type LibraryCatalog, type CatalogManufacturer, type CatalogExamType, type CatalogUniversity } from "../services/libraryService";
import { StudyLibrary, StudyProgress } from "./components/library/StudyLibrary";
import PreparationLibrary from './components/library/PreparationLibrary';
import { environmentFor, readPreparation, savePreparation, type Preparation } from '../services/preparation';
import { StudyWorkspace, StudyResults } from "./components/cbt/StudyWorkspace";
import { answerIndex } from "../utils/examSession";
import { readTheme, followTheme, THEME_STORAGE_KEY, type StudyTheme } from "../utils/theme";
import { CustomizeCbtScreen } from "./components/cbt/CustomizeCbtScreen";
import { isCbtQuestion } from "../utils/cbtFilters";
import { isLegacyUtmeBundle } from "../utils/utme";
import { supabase } from "../services/supabase";
import { rankRecommendationCandidates, recordAnonymousAttemptSummary } from "../services/recommendations";
import {
  extractVisionText,
  confirmVisionMaterial, getSavedMaterials, getSavedMaterial,
} from "../services/vision";

type Screen =
  | "splash" | "signup" | "login" | "forgot-password" | "change-password" | "onboarding"
  | "home" | "snap" | "processing" | "review-questions" | "customize-cbt"
  | "exam" | "results" | "review-answers" | "preference" | "manual-entry"
  | "profile-edit" | "practice-history" | "settings-preferences" | "settings-reminders" | "settings-notifications" | "about" | "support";
type NavTab = "home" | "library" | "lead" | "preference";

interface Q {
  id: number;
  type?: string;
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
  questionHtml?: string; optionsHtml?: string[]; explanationHtml?: string;
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
    { id: "lead", label: "Discover", Icon: Compass }, { id: "preference", label: "Preferences", Icon: User },
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

// ── Screens ───────────────────────────────────────────────────────────────────

function HomeScreen({
  nav,
  tab,
  onTab,
  userName,
  ownerId,
  reminderSearch,
  sessions,
  offlineLibrary,
  globalLibrary,
  libraryCatalog,
  libraryStatus,
  offlineReady,
  historyReady,
  onRetryLibrary,
  onOpenBundle,
  onDownloadBundle,
  onSelectManufacturer,
  preparation,
  onPreparation,
}: {
  nav: (s: Screen) => void;
  tab: NavTab;
  onTab: (t: NavTab) => void;
  userName: string;
  ownerId: string;
  reminderSearch: string;
  sessions: any[];
  offlineLibrary: any[];
  globalLibrary: any[];
  libraryCatalog: LibraryCatalog | null;
  libraryStatus: "loading" | "ready" | "error";
  offlineReady: boolean;
  historyReady: boolean;
  onRetryLibrary: () => void;
  onOpenBundle: (bundle: any) => void;
  onDownloadBundle: (bundle: any) => void;
  onSelectManufacturer: (mfg: CatalogManufacturer, exam: CatalogExamType, uni: CatalogUniversity) => void;
  preparation: Preparation;
  onPreparation: (value: Preparation) => void;
}) {
  const focusedMaterials = preparation.enabled ? offlineLibrary.filter(material => environmentFor(material).id === preparation.activeEnvironment) : [];
  const studyMaterials = focusedMaterials.length ? focusedMaterials : offlineLibrary;
  const focusedIds = new Set(focusedMaterials.map(material => material.id));
  const studySessions = focusedMaterials.length ? sessions.filter(session => focusedIds.has(session.source_bundle_id)) : sessions;
  return (
    <div className="study-shell">
      <div className="study-shell-content">
        {tab === "home" && (!offlineReady || !historyReady ? <ContentSkeleton kind="home" hasSaved={studyMaterials.length > 0} label="Loading your study room" fullPage /> : <StudyHome name={userName} materials={studyMaterials} sessions={studySessions} environmentName={focusedMaterials.length ? environmentFor(focusedMaterials[0]).name : undefined} onOpen={onOpenBundle} onLibrary={() => onTab("library")} onUpload={() => nav("snap")} />)}
        {tab === "library" && (
          <PreparationLibrary
            key={reminderSearch}
            initialSearch={reminderSearch}
            preparation={preparation}
            onPreparation={onPreparation}
            globalLibrary={globalLibrary}
            offlineLibrary={offlineLibrary}
            catalog={libraryCatalog}
            status={libraryStatus}
            savedReady={offlineReady}
            onRetry={onRetryLibrary}
            onOpen={onOpenBundle}
            onDownload={onDownloadBundle}
            onSelect={onSelectManufacturer}
            onUpload={() => nav("snap")}
          />
        )}
        {tab === "lead" && <DiscoverScreen key={ownerId} ownerId={ownerId} />}
        {tab === "preference" && <ContentSkeleton kind="preferences" label="Loading preferences" fullPage />}
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
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const sending = useRef(false);

  const confirmUpload = async () => {
    if (!text.trim() || sending.current) return;
    sending.current = true; setPending(true); setError('');
    const name = materialName.trim() || "Manual Entry";
    const icon = "📝";

    try {
      const data = await extractVisionText({ text, name, icon });
      onSessionStarted(data.sessionId || data.jobId);
      nav("processing");
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not prepare your questions. Please try again.');
    } finally { sending.current = false; setPending(false); }
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
          disabled={!text.trim() || pending}
          className="w-full py-4 rounded-2xl text-[16px] font-bold bg-[#E67468] text-white shadow-lg shadow-[#E67468]/20 disabled:opacity-50" 
          style={JK}
        >
          {pending ? 'Preparing…' : 'Prepare questions'}
        </button>
        {error && <p className="selection-error" role="alert">{error}</p>}
      </div>
    </div>
  );
}

function ReviewQuestionsScreen({
  nav,
  questions,
  onUpdateQuestions,
  onSave,
}: {
  nav: (s: Screen) => void;
  questions: Q[];
  onUpdateQuestions: (qs: Q[]) => void;
  onSave: () => Promise<void>;
}) {
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<Q | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const savePending = useRef(false);
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
  const minimumOptions = (q: Q) => q.type && !['single_choice', 'multiple_choice', 'true_false'].includes(q.type) ? 0 : 2;
  const blockingQuestions = questions.filter((q) => !q.question.trim() || q.options.filter((option) => option.trim()).length < minimumOptions(q) || q.incomplete);
  const reviewQuestions = visible.filter((q) => q.needsReview);

  const openEdit = (i: number) => {
    const q = visible[i];
    const realIndex = questions.findIndex((x) => x === q || (x.id === q.id && x.question === q.question));
    setEditIndex(realIndex >= 0 ? realIndex : i);
    setDraft({ ...q, options: [...q.options] });
  };

  const saveEdit = () => {
    if (editIndex === null || !draft) return;
    const keptOptions = draft.options.map((text, index) => ({ text: text.trim(), index })).filter(option => option.text);
    const options = keptOptions.map(option => option.text);
    const correct = draft.correct == null ? null : keptOptions.findIndex(option => option.index === draft.correct);
    const incomplete = !draft.question.trim() || options.length < minimumOptions(draft);
    const reviewReasons = (draft.reviewReasons || []).filter((reason) => reason !== "insufficient_complete_options");
    if (incomplete) reviewReasons.push("insufficient_complete_options");
    const next = questions.map((q, i) => i === editIndex ? {
      ...draft,
      question: draft.question.trim(),
      options,
      incomplete,
      reviewReasons: [...new Set(reviewReasons)],
      needsReview: incomplete || reviewReasons.length > 0 || (draft.qualityFlags || []).length > 0,
      correct: correct != null && correct >= 0 ? correct : null,
    } : q);
    onUpdateQuestions(next);
    setEditIndex(null);
    setDraft(null);
  };

  return (
    <div className="study-app material-review h-full flex flex-col relative" aria-busy={saving}>
      <div className="px-5 pt-2 pb-3 bg-white border-b border-[#EADFD3] flex items-center gap-3">
        <div>
          <h2 className="text-[16px] font-bold text-[#2E2A27]" style={JK}>Check your questions</h2>
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
      <div className="material-review-save px-5 py-4 bg-white border-t border-[#EADFD3]">
        <div className="material-review-scholar"><ScholarMascot state={saving ? 'study' : 'idle'} compact /><span>{saving ? 'Saving your material…' : 'Ready when you are.'}</span></div>
        {saveError && <p className="selection-error" role="alert">{saveError}</p>}
        <button
          disabled={saving || blockingQuestions.length > 0 || !questions.length}
          onClick={async () => {
            if (savePending.current) return;
            savePending.current = true; setSaving(true); setSaveError('');
            try { await onSave(); }
            catch (error) { setSaveError(error instanceof Error ? error.message : 'Could not save. Please try again.'); }
            finally { savePending.current = false; setSaving(false); }
          }}
          className="w-full bg-[#E67468] text-white py-4 rounded-2xl text-[15px] font-bold shadow-lg shadow-[#E67468]/20 disabled:bg-[#EADFD3] disabled:text-[#8C8681] disabled:shadow-none"
          style={JK}
        >
          {blockingQuestions.length > 0
            ? `Fix ${blockingQuestions.length} incomplete question${blockingQuestions.length === 1 ? "" : "s"}`
            : saving ? 'Saving…' : 'Looks good — save'}
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




function PlaceholderScreen({ title, nav, backTo }: { title: string; nav: (s: Screen) => void; backTo: Screen }) {
  return <main className="study-app study-loading">
    <header className="loading-header"><span className="wordmark">past<span>q</span></span></header>
    <div className="unavailable-content"><h1>{title}</h1><button className="study-primary" onClick={() => nav(backTo)}>{backTo === 'preference' ? 'Back to Preferences' : 'Back to library'}<ChevronRight size={18} /></button></div>
  </main>;
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [historyReady, setHistoryReady] = useState(false);
  const [preparation, setPreparation] = useState<Preparation>({ enabled: false, activeEnvironment: null });
  const [theme, setTheme] = useState<StudyTheme>(readTheme);
  useEffect(() => followTheme(theme), [theme]);
  useEffect(() => {
    const syncTheme = (event: StorageEvent) => { if (event.key === THEME_STORAGE_KEY || event.key === null) setTheme(readTheme()); };
    window.addEventListener("storage", syncTheme);
    return () => window.removeEventListener("storage", syncTheme);
  }, []);
  const { screen, setScreen, tab: navTab, setTab: setNavTab } = useAppNavigation<Screen, NavTab>("splash", "home");
  const [activeQuestions, setActiveQuestions] = useState<Q[]>(DEMO_QUESTIONS);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(DEMO_QUESTIONS.length).fill(null));
  const [writtenAnswers, setWrittenAnswers] = useState<string[]>([]);
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
  const [reviewMaterial, setReviewMaterial] = useState<{ id: string; name?: string; groups?: any[] } | null>(null);
  const [uploadDraft, setUploadDraft] = useState<UploadDraft>({ files: [], name: "" });

  const [timeTaken, setTimeTaken] = useState(0);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userAvatar, setUserAvatar] = useState("");
  const [userId, setUserId] = useState("");
  const [reminderSearch, setReminderSearch] = useState('');
  const [reminderIntentVersion, setReminderIntentVersion] = useState(0);
  const pendingReminder = useRef<{ subject: string } | null>(null);
  const [undergraduate, setUndergraduate] = useState<boolean | null>(null);
  const authenticatedUser = useRef<string | null>(null);
  function changePreparation(value: Preparation) {
    setPreparation(value);
    savePreparation(authenticatedUser.current || '', value);
  }
  const [sessions, setSessions] = useState<any[]>([]);
  const [offlineLibrary, setOfflineLibrary] = useState<any[]>([]);
  const [globalLibrary, setGlobalLibrary] = useState<any[]>([]);
  const [libraryCatalog, setLibraryCatalog] = useState<LibraryCatalog | null>(null);
  const [libraryStatus, setLibraryStatus] = useState<"loading" | "ready" | "error">("loading");
  const [customizeBundle, setCustomizeBundle] = useState<any | null>(null);
  const [restoringImages, setRestoringImages] = useState(false);
  const [practiceSource, setPracticeSource] = useState({ bundleId: "demo", version: null as string | null });

  useEffect(() => {
    const flush = () => { const owner = authenticatedUser.current; if (owner && !document.hidden) { void syncStudyHistory([], owner).catch(() => {}); void syncPracticeHistory(owner).catch(() => {}); } };
    window.addEventListener('online', flush); document.addEventListener('visibilitychange', flush);
    return () => { window.removeEventListener('online', flush); document.removeEventListener('visibilitychange', flush); };
  }, []);

  useEffect(() => {
    function acceptReminder(value: string) {
      try {
        const url = new URL(value, window.location.origin);
        if (url.origin !== window.location.origin || url.searchParams.get('reminder') !== 'study') return;
        pendingReminder.current = { subject: (url.searchParams.get('subject') || '').slice(0, 100) };
        setReminderIntentVersion(value => value + 1);
        // A notification never interrupts a timed exam or bypasses onboarding.
        setScreen(current => current === 'home' || current === 'preference' || current === 'settings-reminders' || current === 'settings-preferences' ? 'home' : current);
        setReminderSearch(pendingReminder.current.subject);
      } catch { /* Ignore malformed notification URLs. */ }
    }
    acceptReminder(window.location.href);
    const receive = (event: MessageEvent) => { if (event.data?.type === 'PASTQ_OPEN_STUDY' && typeof event.data.url === 'string') acceptReminder(event.data.url); };
    navigator.serviceWorker?.addEventListener('message', receive);
    return () => navigator.serviceWorker?.removeEventListener('message', receive);
  }, []);
  useEffect(() => {
    if (!userId || screen !== 'home' || !pendingReminder.current) return;
    setReminderSearch(pendingReminder.current.subject); pendingReminder.current = null; setNavTab('library');
    const url = new URL(window.location.href); url.searchParams.delete('reminder'); url.searchParams.delete('subject');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  }, [userId, screen, reminderSearch, reminderIntentVersion]);

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
    setRestoringImages(true);
    try {
      const ownerId = authenticatedUser.current;
      let bundle = await getOfflineBundle(mfg.bundleId, ownerId || undefined);
      if (!bundle?.questions?.length) {
        bundle = await getBundleFromApi(mfg.bundleId);
        await saveBundle(bundle);
        await refreshOfflineLibrary();
      }
      if (!bundle?.questions?.length) {
        alert("This material has no questions yet.");
        return;
      }
      const original = bundle;
      bundle = await ensureBundleImages(bundle, () => setRestoringImages(true));
      if (authenticatedUser.current !== ownerId) return;
      if (bundle !== original) void refreshOfflineLibrary();
      setCustomizeBundle({
        ...bundle,
        examType: bundle.exam?.name || bundle.examType || exam.name,
        university: bundle.organization?.name || bundle.university || uni.name,
        manufacturer: bundle.publisher || bundle.manufacturer || mfg.name,
      });
      if (preparation.enabled) changePreparation({ ...preparation, activeEnvironment: environmentFor(bundle).id });
      setScreen("customize-cbt");
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Could not load this material. Check your connection.");
    } finally { setRestoringImages(false); }
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
    const ownerId = authenticatedUser.current;
    try {
      const lib = await getOfflineLibrary(ownerId || undefined);
      if (authenticatedUser.current !== ownerId) return;
      setOfflineLibrary(lib);
      if (lib.length || !ownerId || !navigator.onLine) setOfflineReady(true);
      if (ownerId && navigator.onLine) {
        const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000);
        let saved;
        try { saved = await getSavedMaterials(controller.signal); } finally { clearTimeout(timer); }
        if (authenticatedUser.current !== ownerId) return;
        const local = new Map(lib.map(item => [item.id, item]));
        const merged = saved.map(item => {
          const cached = local.get(item.id);
          return cached && cached.updatedAt >= item.updatedAt ? cached : { ...item, ownerId };
        });
        setOfflineLibrary([...merged, ...lib.filter(item => !saved.some(remote => remote.id === item.id))]);
      }
    } catch { /* Local materials stay available when the account refresh fails. */ }
    finally { if (authenticatedUser.current === ownerId) setOfflineReady(true); }
  };

  const openBundle = async (bundle: any) => {
    setRestoringImages(true);
    try {
      const ownerId = authenticatedUser.current;
      const cached = await getOfflineBundle(bundle.id, ownerId || undefined);
      if (authenticatedUser.current !== ownerId) return;
      let fresh = cached && (!bundle.updatedAt || cached.updatedAt >= bundle.updatedAt) ? cached : bundle;
      if (isLegacyUtmeBundle(fresh.id) && navigator.onLine) {
        try {
          const upgraded = await getBundleFromApi(fresh.id);
          if (authenticatedUser.current !== ownerId) return;
          if (upgraded.kind === 'utme-bank') { fresh = await saveBundle(upgraded); void refreshOfflineLibrary(); }
        } catch { /* Existing subject downloads remain usable offline. */ }
      }
      if (fresh.sourceSessionId && !fresh.questions?.length) {
        fresh = { ...await getSavedMaterial(fresh.sourceSessionId), ownerId };
        if (authenticatedUser.current !== ownerId) return;
        try { await saveBundle({ ...fresh, ownerId }); } catch { /* Server copy is saved even when device storage is full. */ }
        if (authenticatedUser.current !== ownerId) return;
      }
      const original = fresh;
      fresh = await ensureBundleImages(fresh, () => setRestoringImages(true));
      if (authenticatedUser.current !== ownerId) return;
      if (fresh !== original) void refreshOfflineLibrary();
      const qs = Array.isArray(fresh?.questions) ? fresh.questions : [];
      if (!qs.length) {
        alert("This download has no saved questions yet. Re-extract or re-download it.");
        return;
      }
      setCustomizeBundle({ ...fresh, questions: qs });
      if (preparation.enabled) changePreparation({ ...preparation, activeEnvironment: environmentFor(fresh).id });
      setScreen("customize-cbt");
      if (fresh === original && navigator.onLine && !fresh.sourceSessionId && (fresh.manufacturer || fresh.university || fresh.examType)) {
        // Background revalidation: offline copy may predate server additions.
        // Refresh newer content even when its question count is unchanged.
        getBundleFromApi(bundle.id)
          .then(async (live: any) => {
            const liveQs = Array.isArray(live?.questions) ? live.questions : [];
            if (liveQs.length > qs.length || Date.parse(live.updatedAt || '') > Date.parse(fresh.updatedAt || '')) {
              const saved = await saveBundle(live);
              await refreshOfflineLibrary();
            }
          })
          .catch(() => {});
      }
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Could not open this material.");
    } finally { setRestoringImages(false); }
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
    let active = true;
    let revision = 0;
    const unsub = listenToAuth(async (user, event) => {
      const request = ++revision;
      const previousUser = authenticatedUser.current;
      authenticatedUser.current = user?.id || null;
      void syncReminderDeviceOwner(user?.id || null).catch(() => {});
      if (!active) return;
      setAuthReady(true);
      if (previousUser && previousUser !== user?.id) {
        setReminderSearch(''); pendingReminder.current = null;
        setActiveQuestions(DEMO_QUESTIONS); setWrittenAnswers([]); setAnswers(Array(DEMO_QUESTIONS.length).fill(null));
        setFlagged(Array(DEMO_QUESTIONS.length).fill(false)); setCurrentQ(0);
        setCustomizeBundle(null); setReviewMaterial(null); setVisionSessionId(null);
        setUploadDraft({ files: [], name: '' }); setOfflineLibrary([]); setSessions([]);
        setScreen(prev => !user && prev === 'change-password' ? prev : user ? 'splash' : 'login');
      }
      if (event === 'PASSWORD_RECOVERY' && user) setScreen('change-password');
      if (user) {
        setUserName(user.user_metadata?.full_name || user.email?.split("@")[0] || "Student");
        setUserEmail(user.email || "");
        setUserAvatar(user.user_metadata?.avatar_url || "");
        setUserId(user.id);
        if (previousUser !== user.id) { setPreparation(readPreparation(user.id)); setOfflineReady(false); setHistoryReady(false); }
        void refreshOfflineLibrary().catch(() => {});
        // Local progress is immediate; a first-time device waits for the account read.
        void (async () => {
          const current = () => active && authenticatedUser.current === user.id && request === revision;
          try {
            const local = await readPracticeHistory(user.id).catch(() => []);
            if (!current()) return;
            setSessions(previous => mergePracticeHistory(previous, local));
            if (local.length || !navigator.onLine) setHistoryReady(true);
            if (navigator.onLine) {
              const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000);
              try {
                const history = await getUserHistory(user.id, controller.signal);
                if (!current()) return;
                const merged = await cachePracticeHistory(user.id, history || []);
                if (!current()) return;
                setSessions(merged);
                void syncStudyHistory(history || [], user.id).catch(() => {});
              } finally { clearTimeout(timer); }
            }
          } catch { /* Keep device progress when the account is unavailable. */ }
          finally { if (current()) setHistoryReady(true); }
        })();
        void syncPracticeHistory(user.id).catch(() => {});
        void syncStudyHistory([], user.id).catch(() => {});
        const preferences = readStudyPreferences(user.user_metadata);
        setUndergraduate(preferences?.undergraduate ?? null);
        setScreen((prev) => {
          if (prev === "splash" || prev === "login" || prev === "signup") {
            // The legacy profile flag predates the personalized study choice.
            // Only a saved choice (including Explore) completes this onboarding.
            return preferences ? "home" : "onboarding";
          }
          return prev;
        });
        let profile = null;
        try { profile = await getUserProfile(user.id); } catch {}
        if (!profile) {
          try { profile = await createUserProfile(user.id, user.email || "", user.user_metadata?.full_name || ""); } catch {}
        }
        if (!active || request !== revision || authenticatedUser.current !== user.id) return;


        // Load offline library from IndexedDB
        try {
          await refreshOfflineLibrary();
          if (!active || request !== revision) return;
        } catch {}
        // Fetch global library from the Hostinger API.
        try {
          await refreshGlobalLibrary();
        } catch {}
      } else {
        setHistoryReady(true);
        setOfflineReady(true);
        setSessions([]);
        setOfflineLibrary([]);
        setUserName("");
        setUserEmail("");
        setUserAvatar("");
        setUserId("");
        setPreparation({ enabled: false, activeEnvironment: null });
        setUndergraduate(null);
        setScreen(prev => prev === "onboarding" ? "login" : prev);
      }
    });
    return () => { active = false; revision++; authenticatedUser.current = null; unsub(); };
  }, []);

  const nav = (s: Screen) => {
    if (s === "exam") {
      submitted.current = false;
      setAnswers(Array(activeQuestions.length).fill(null)); setWrittenAnswers([]);
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
    setReminderSearch('');
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
      const completedAt = new Date().toISOString(), resultId = crypto.randomUUID();
      const title = [...new Set(activeQuestions.map(question => question.subject).filter(Boolean))].slice(0, 3).join(', ') || 'CBT Session';
      const localResult: PracticeSummary = { id: resultId, title, completed_at: completedAt, score: s, total_questions: activeQuestions.length, graded_total: activeQuestions.filter(question => answerIndex(question) !== null).length, answered_count: answers.filter(answer => answer !== null).length, duration_seconds: examDuration - timeLeft, source_bundle_id: practiceSource.bundleId, source_bundle_version: practiceSource.version, pending: true };
      setSessions(previous => mergePracticeHistory(previous, [localResult]));
      void rememberPractice(userId, localResult).then(() => syncPracticeHistory(userId)).catch(error => console.warn('Device progress could not sync:', error.message));
      void syncStudyHistory([{ id: resultId, completed_at: completedAt, total_questions: activeQuestions.filter(question => answerIndex(question) !== null).length, score: s, title, duration_seconds: examDuration - timeLeft }], userId).catch(() => {});
      try {
        const durationSeconds = examDuration - timeLeft;
        const attempts = activeQuestions.map((question, index) => ({
          questionKey: practiceQuestionKey(practiceSource.bundleId, question, index),
          topicKey: question.subject || "general",
          selectedOptionIndex: question.type === 'short_answer' || question.type === 'theory' ? null : answers[index],
          answered: answers[index] !== null,
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
        const history = await getUserHistory(userId);
        if (authenticatedUser.current !== userId) return;
        const merged = await cachePracticeHistory(userId, history || []);
        if (authenticatedUser.current !== userId) return;
        setSessions(merged);
        void syncStudyHistory(history || [], userId).catch(() => {});
      } catch (e) { console.error("Failed to save session:", e); }
    }
  };

  const handleAnswer = (qi: number, opt: number) => {
    setAnswers(prev => { const n = [...prev]; n[qi] = opt; return n; });
  };

  const handleWrittenAnswer = (qi: number, text: string) => {
    setWrittenAnswers(previous => { const next = [...previous]; next[qi] = text; return next; });
    setAnswers(previous => { const next = [...previous]; next[qi] = text.trim() ? 0 : null; return next; });
  };

  const handleFlag = (qi: number) => {
    setFlagged(prev => { const n = [...prev]; n[qi] = !n[qi]; return n; });
  };

  const renderScreen = () => {
    switch (screen) {
      case "splash": return <AppWelcome onSignup={() => nav("signup")} onLogin={() => nav("login")} />;
      case "signup": return <AuthScreen key="signup" mode="signup" nav={nav} />;
      case "login": return <AuthScreen key="login" mode="login" nav={nav} />;
      case "forgot-password": return <AuthScreen key="reset" mode="reset" nav={nav} />;
      case "change-password": return <AuthScreen key="recovery" mode="recovery" nav={nav} />;
      case "onboarding": return <OnboardingScreen key={userId || "pending"} name={userName} undergraduate={undergraduate} onComplete={preferences => { setUndergraduate(preferences.undergraduate); nav("home"); }} />;
      case "home": return (
        <HomeScreen
          nav={nav}
          tab={navTab}
          onTab={handleNavTab}
          userName={userName}
          ownerId={userId}
          reminderSearch={reminderSearch}
          sessions={sessions}
          offlineLibrary={offlineLibrary}
          globalLibrary={globalLibrary}
          libraryCatalog={libraryCatalog}
          libraryStatus={libraryStatus}
          offlineReady={offlineReady}
          historyReady={historyReady}
          onRetryLibrary={() => { void refreshGlobalLibrary(); }}
          onOpenBundle={openBundle}
          onDownloadBundle={handleDownloadBundle}
          onSelectManufacturer={handleSelectManufacturer}
          preparation={preparation}
          onPreparation={changePreparation}
        />
      );
      case "snap": return <SnapScreen nav={nav} draft={uploadDraft} onDraftChange={setUploadDraft} onSessionStarted={(id) => setVisionSessionId(id)} />;
      case "manual-entry": return <ManualEntryScreen nav={nav} onSessionStarted={(id) => setVisionSessionId(id)} />;
      case "processing": return (
        <ProcessingScreen
          nav={nav}
          sessionId={visionSessionId}
          onQuestionsReady={(qs, meta) => {
            setReviewMaterial({ id: meta?.sessionId || visionSessionId || '', name: meta?.name, groups: meta?.groups });
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
          onSave={async () => {
            const ownerId = authenticatedUser.current;
            if (!ownerId || !reviewMaterial?.id) throw new Error('Please sign in again to save this material.');
            const saved = await confirmVisionMaterial(reviewMaterial.id, activeQuestions);
            if (authenticatedUser.current !== ownerId) return;
            const material = { ...saved, ownerId };
            try { await saveBundle(material); } catch { /* The confirmed server copy remains available. */ }
            if (authenticatedUser.current !== ownerId) return;
            setCustomizeBundle(material);
            setScreen('customize-cbt');
            void refreshOfflineLibrary();
          }}
        />
      );
      case "customize-cbt": return customizeBundle ? (
        <CustomizeCbtScreen
          key={String(customizeBundle.id || "bundle")}
          bundle={customizeBundle}
          ownerId={userId}
          onBack={() => { nav('home'); setNavTab('library'); }}
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
            setWrittenAnswers([]);
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
      ) : <PlaceholderScreen title="Material unavailable" nav={nav} backTo="home" />;
      case "exam": return (
        <StudyWorkspace
          questions={activeQuestions}
          answers={answers} onAnswer={handleAnswer}
          writtenAnswers={writtenAnswers} onWrittenAnswer={handleWrittenAnswer} assets={customizeBundle?.assets}
          flagged={flagged} onFlag={handleFlag}
          currentQ={currentQ} onQ={setCurrentQ}
          timeLeft={timeLeft}
          duration={examDuration}
          showModal={showModal} onModal={setShowModal}
          onSubmit={handleSubmit} nav={nav}
          practice={practiceMode}
        />
      );
      case "results": return <StudyResults questions={activeQuestions} timeTaken={timeTaken} answers={answers} nav={destination => {
        if (destination === 'exam') { setCustomizeBundle({ ...customizeBundle, id: practiceSource.bundleId, questions: activeQuestions }); setScreen('customize-cbt'); return; }
        nav(destination); if (destination === "home") setNavTab("library");
      }} onPracticeMissed={() => {
        const missed = activeQuestions.filter((q, i) => answerIndex(q) !== null && answers[i] !== answerIndex(q));
        if (!missed.length) return;
        setCustomizeBundle({ id: practiceSource.bundleId, name: "Questions to revisit", questions: missed, assets: customizeBundle?.assets });
        setScreen("customize-cbt");
      }} />;
      case "review-answers": return <StudyWorkspace writtenAnswers={writtenAnswers} assets={customizeBundle?.assets} questions={activeQuestions} answers={answers} flagged={flagged} currentQ={reviewQ} onQ={setReviewQ} onAnswer={() => {}} onFlag={() => {}} timeLeft={timeLeft} duration={examDuration} showModal={false} onModal={() => {}} onSubmit={() => {}} nav={destination => { nav(destination); if (destination === 'home') setNavTab('library'); }} review />;
      case "preference": return !historyReady ? <ContentSkeleton kind="preferences" hasActivity={sessions.length > 0} label="Loading your progress" fullPage /> : <div className="study-shell"><PreferencesScreen key={userId} ownerId={userId} name={userName} email={userEmail} avatar={userAvatar} sessions={sessions} preparationEnabled={preparation.enabled} onPreparation={enabled => changePreparation({ ...preparation, enabled })} theme={theme} onTheme={() => nav("settings-preferences")} onReminders={() => nav("settings-reminders")} onProgress={() => nav("practice-history")} onStudy={() => handleNavTab('home')} /><BottomNav tab={navTab} onTab={handleNavTab} onSnap={() => nav("snap")} /></div>;
      case "practice-history": return !historyReady ? <ContentSkeleton kind="history" label="Loading past sessions" fullPage /> : <div className="study-shell"><StudyProgress sessions={sessions} onBack={() => nav('preference')} onStart={() => handleNavTab('home')} /><BottomNav tab="preference" onTab={handleNavTab} onSnap={() => nav('snap')} /></div>;
      case "profile-edit": return <EditProfileScreen nav={nav} userName={userName} setUserName={setUserName} userEmail={userEmail} userAvatar={userAvatar} />;
      case "settings-preferences": return <ThemeScreen theme={theme} onTheme={setTheme} onBack={() => nav("preference")} />;
      case "settings-reminders": return <RemindersScreen key={userId} ownerId={userId} sessions={sessions} onBack={() => nav("preference")} />;
      case "settings-notifications": return <PlaceholderScreen title="Page unavailable" nav={nav} backTo="preference" />;
      case "about": return <PlaceholderScreen title="Page unavailable" nav={nav} backTo="preference" />;
      case "support": return <PlaceholderScreen title="Page unavailable" nav={nav} backTo="preference" />;
      default: return <PlaceholderScreen title="Page unavailable" nav={nav} backTo="home" />;
    }
  };

  return (
    <div className="pastq-root h-screen w-full" style={{ background: "var(--study-bg)", height: "100dvh" }}>
      <div className="h-full w-full overflow-hidden">
        {!authReady ? <ContentSkeleton kind="page" label="Opening PastQ" fullPage /> : restoringImages ? <ContentSkeleton kind="builder" label="Loading your material" fullPage /> : renderScreen()}
      </div>
    </div>
  );
}
