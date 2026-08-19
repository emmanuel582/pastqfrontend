import { useState, useEffect, useRef, lazy, Suspense, type PointerEvent as ReactPointerEvent } from "react";
const Student3DScene = lazy(() => import("./components/Student3D"));
import { motion, AnimatePresence } from "motion/react";
import {
  Camera, Upload, Home, Clock, User, ChevronLeft,
  Flag, Check, X, Eye, RotateCcw, Edit2,
  Bell, LogOut, AlertTriangle, BookOpen,
  ChevronRight, Plus, FileText, Shield, Star, Info, Twitter, Github, Library, Search, Download,
  Calculator, PenLine, Eraser, Trash2, Undo2, Send, ZoomIn, ZoomOut, ChevronDown, ChevronUp,
} from "lucide-react";
import { listenToAuth, registerUser, loginUser, logoutUser, loginWithGoogle } from "../services/auth";

import { getUserHistory, saveExamSession, getUserProfile, createUserProfile, updateUserProfile } from "../services/db";
import { getOfflineLibrary, getGlobalLibrary, downloadBundle, saveBundle, getOfflineBundle } from "../services/libraryService";
import { supabase } from "../services/supabase";
import { apiUrl } from "../services/api";
import {
  createVisionSession,
  uploadSessionPages,
  uploadSessionPdf,
  getVisionSession,
  resumeVisionSession,
  replyVisionFollowUp,
  sortUploadFiles,
  type VisionSession,
  type VisionFollowUp,
} from "../services/vision";

type Screen =
  | "splash" | "signup" | "login" | "forgot-password"
  | "onboard-name" | "onboard-1" | "onboard-2" | "onboard-3" | "onboard-4" | "onboard-5"
  | "home" | "snap" | "processing" | "review-questions"
  | "exam" | "results" | "review-answers" | "preference" | "manual-entry"
  | "profile-edit" | "settings-preferences" | "settings-reminders" | "settings-notifications" | "about" | "support";
type NavTab = "home" | "library" | "lead" | "preference";

interface Q {
  id: number;
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

const DEMO_QUESTIONS: Q[] = [
  {
    id: 1,
    subject: "Use of English",
    question: "Choose the word that is nearest in meaning to the italicized word: The man's *audacity* was quite surprising.",
    options: ["boldness", "foolishness", "cowardice", "cleverness"],
    correct: 0,
    explanation: "Audacity means a willingness to take bold risks, which is synonymous with boldness."
  },
  {
    id: 2,
    subject: "Mathematics",
    question: "If 2x + 3 = 11, what is the value of x?",
    options: ["2", "3", "4", "5"],
    correct: 2,
    explanation: "Subtract 3 from both sides to get 2x = 8. Divide by 2 to get x = 4."
  },
  {
    id: 3,
    subject: "Physics",
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
    { id: "home", label: "Home", Icon: Home },
    { id: "library", label: "Library", Icon: Library },
    { id: "lead", label: "Lead", Icon: Clock }, // Placeholder icon for streak
    { id: "preference", label: "Preference", Icon: User },
  ];

  return (
    <div className="relative pt-6">
      {/* Curved SVG Background */}
      <div className="absolute inset-x-0 bottom-0 h-[72px] pointer-events-none">
        <svg viewBox="0 0 375 72" fill="none" preserveAspectRatio="none" className="w-full h-full drop-shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <path d="M0 0 L125 0 C140 0 145 38 187.5 38 C230 38 235 0 250 0 L375 0 L375 72 L0 72 Z" fill="white" />
        </svg>
      </div>

      {/* FAB (Floating Action Button) */}
      <button
        onClick={onSnap}
        className="absolute left-1/2 -top-1 -translate-x-1/2 w-[52px] h-[52px] rounded-full flex items-center justify-center shadow-[0_8px_16px_rgba(37,99,235,0.25)] z-10 transition-transform active:scale-95"
        style={{ background: "linear-gradient(135deg, #E67468 0%, #D45B4F 100%)" }}
      >
        <Camera size={24} color="white" />
      </button>

      {/* Nav Items */}
      <div className="relative z-0 flex h-[72px] items-end px-2">
        {items.map((item, index) => {
          const isCenter = index === 1; // After the second item, there's the big button
          return (
            <button
              key={item.id}
              onClick={() => onTab(item.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 pb-3 ${isCenter ? "mr-12" : ""}`}
            >
              <item.Icon size={24} color={tab === item.id ? "#E67468" : "#94A3B8"} strokeWidth={tab === item.id ? 2.5 : 2} />
              <span className="text-[10px] font-semibold transition-colors" style={{ color: tab === item.id ? "#E67468" : "#94A3B8" }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BackBtn({ onPress, light = false }: { onPress: () => void; light?: boolean }) {
  return (
    <button onClick={onPress}
      className="w-9 h-9 flex items-center justify-center rounded-xl"
      style={{ background: light ? "rgba(255,255,255,0.12)" : "#FAF6F0", border: light ? "none" : "1px solid #EADFD3" }}>
      <ChevronLeft size={20} color={light ? "white" : "#2E2A27"} />
    </button>
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

function GoogleBtn({ onClick }: { onClick: () => void }) {
  return (
    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onClick} className="w-full bg-white border border-[#EADFD3] py-3.5 rounded-2xl flex items-center justify-center gap-3 text-[15px] font-semibold text-[#2E2A27]" style={INTER}>
      <svg width="20" height="20" viewBox="0 0 20 20">
        <path d="M19.6 10.23c0-.68-.06-1.36-.18-2H10v3.79h5.4c-.23 1.22-.95 2.25-2.01 2.94v2.44h3.26c1.9-1.75 3-4.32 3-7.17z" fill="#4285F4" />
        <path d="M10 20c2.7 0 4.96-.9 6.61-2.43l-3.26-2.44c-.9.6-2.05.96-3.35.96-2.58 0-4.77-1.74-5.55-4.08H1.1v2.52A10 10 0 0 0 10 20z" fill="#34A853" />
        <path d="M4.45 12.01A5.97 5.97 0 0 1 4.14 10c0-.7.12-1.37.31-2.01V5.47H1.1A10 10 0 0 0 0 10c0 1.61.39 3.14 1.1 4.53l3.35-2.52z" fill="#FBBC05" />
        <path d="M10 3.92c1.45 0 2.76.5 3.78 1.48l2.83-2.83A9.97 9.97 0 0 0 10 0 10 10 0 0 0 1.1 5.47l3.35 2.52c.78-2.34 2.97-4.07 5.55-4.07z" fill="#EA4335" />
      </svg>
      Continue with Google
    </motion.button>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-[#EADFD3]" />
      <span className="text-[12px] text-[#94A3B8] font-medium">or continue with</span>
      <div className="flex-1 h-px bg-[#EADFD3]" />
    </div>
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

function SplashScreen({ nav }: { nav: (s: Screen) => void }) {
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
        <motion.button initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 2, delay: 0.6 }} onClick={() => nav("login")} className="w-full text-center text-[14px] text-[#8C8681]" style={INTER}>
          Already have an account?{" "}
          <span className="text-[#E67468] font-semibold">Sign in</span>
        </motion.button>
      </div>
    </div>
  );
}

function SignUpScreen({ nav }: { nav: (s: Screen) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    try {
      setLoading(true);
      await registerUser(email, pass, name);
      nav("onboard-name");
    } catch (err) {
      console.error(err);
      alert("Error signing up");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-white flex flex-col">
      <div className="px-6 py-3 flex-shrink-0 sticky top-0 bg-white z-10"><BackBtn onPress={() => nav("splash")} /></div>
      <div className="px-6 pb-10 flex-1">
        <div className="space-y-5 mt-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div>
              <h2 className="text-[26px] font-bold text-[#2E2A27]" style={JK}>Create account</h2>
              <p className="text-[14px] text-[#8C8681] mt-1" style={INTER}>Join thousands of Nigerian students excelling</p>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }} className="space-y-5">
            <Field label="Full Name" placeholder="Enter your full name" value={name} onChange={setName} />
            <Field label="Email Address" type="email" placeholder="Enter your email" value={email} onChange={setEmail} />
            <Field label="Password" type="password" placeholder="Create a strong password" value={pass} onChange={setPass} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.16 }} className="space-y-4 pt-2">
            <button onClick={handleSignup} disabled={loading} className="w-full py-4 rounded-2xl bg-[#E67468] text-white text-[15px] font-bold shadow-lg shadow-blue-500/20" style={JK}>
              {loading ? "Creating..." : "Create Account"}
            </button>
            <Divider />
            <GoogleBtn onClick={loginWithGoogle} />
            <p className="text-center text-[13px] text-[#8C8681] pb-4" style={INTER}>
              Already have an account? <span onClick={() => nav("login")} className="text-[#E67468] font-semibold cursor-pointer">Sign in</span>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function LoginScreen({ nav }: { nav: (s: Screen) => void }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      await loginUser(email, pass);
      nav("home");
    } catch (err) {
      console.error(err);
      alert("Error logging in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-white flex flex-col">
      <div className="px-6 py-3 flex-shrink-0 sticky top-0 bg-white z-10"><BackBtn onPress={() => nav("splash")} /></div>
      <div className="px-6 pb-10 flex-1">
        <div className="space-y-5 mt-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div>
              <h2 className="text-[26px] font-bold text-[#2E2A27]" style={JK}>Welcome back</h2>
              <p className="text-[14px] text-[#8C8681] mt-1" style={INTER}>Sign in to continue your exam prep</p>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }} className="space-y-5">
            <Field label="Email Address" type="email" placeholder="Enter your email" value={email} onChange={setEmail} />
            <Field label="Password" type="password" placeholder="Your password" value={pass} onChange={setPass} />
            <div className="flex justify-end">
              <button onClick={() => nav("forgot-password")} className="text-[13px] text-[#E67468] font-semibold">Forgot password?</button>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.16 }} className="space-y-4 pt-2">
            <button onClick={handleLogin} disabled={loading} className="w-full py-4 rounded-2xl bg-[#E67468] text-white text-[15px] font-bold shadow-lg shadow-blue-500/20" style={JK}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
            <Divider />
            <GoogleBtn onClick={loginWithGoogle} />
            <p className="text-center text-[14px] text-[#8C8681] pb-4" style={INTER}>
              {"Don't have an account? "}
              <button onClick={() => nav("signup")} className="text-[#E67468] font-semibold cursor-pointer">Sign up</button>
            </p>
          </motion.div>
        </div>
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
        <BackBtn onPress={() => nav("login")} />
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

function ForgotScreen({ nav }: { nav: (s: Screen) => void }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  return (
    <div className="h-full flex flex-col bg-white">
      <div className="px-6 py-3"><BackBtn onPress={() => nav("login")} /></div>
      <div className="flex-1 px-6 pb-8 flex flex-col">
        {!sent ? (
          <>
            <div className="w-14 h-14 rounded-2xl bg-[#F5E8E7] flex items-center justify-center mb-5">
              <svg width="28" height="24" viewBox="0 0 28 24" fill="none">
                <rect x="2" y="4" width="24" height="18" rx="3" stroke="#E67468" strokeWidth="2" />
                <path d="M2 8 L14 16 L26 8" stroke="#E67468" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="text-[24px] font-bold text-[#2E2A27] mb-2" style={JK}>Forgot password?</h2>
            <p className="text-[14px] text-[#8C8681] leading-relaxed mb-6" style={INTER}>
              No worries. Enter your email and {"we'll"} send you a reset link.
            </p>
            <Field label="Email Address" type="email" placeholder="Enter your email" value={email} onChange={setEmail} />
            <div className="flex-1" />
            <PrimaryBtn label="Send Reset Link" onClick={() => setSent(true)} />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-[#DCFCE7] flex items-center justify-center mb-6">
              <Check size={36} color="#22C55E" strokeWidth={2.5} />
            </div>
            <h2 className="text-[22px] font-bold text-[#2E2A27] mb-3" style={JK}>Check your inbox</h2>
            <p className="text-[14px] text-[#8C8681] leading-relaxed mb-8" style={INTER}>
              {"We've"} sent a reset link to{" "}
              <span className="font-semibold text-[#2E2A27]">{email || "your email"}</span>.
            </p>
            <PrimaryBtn label="Back to Sign In" onClick={() => nav("login")} />
          </div>
        )}
      </div>
    </div>
  );
}

function HomeTab({ nav, onTab, userName }: {
  nav: (s: Screen) => void;
  onTab: (t: NavTab) => void;
  userName: string;
}) {
  return (
    <div className="h-full px-5 pt-3 pb-4 relative flex flex-col items-center">
      {/* Top right notification bell */}
      <div className="absolute top-3 right-5">
        <button className="w-10 h-10 rounded-full bg-white border border-[#EADFD3] flex items-center justify-center relative">
          <Bell size={18} color="#8C8681" />
          <div className="absolute top-2 right-2 w-2 h-2 bg-[#EF4444] rounded-full" />
        </button>
      </div>

      {/* Centered Welcome Text */}
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <p className="text-[16px] text-[#8C8681] font-medium mb-1" style={INTER}>Welcome,</p>
        <h2 className="text-[32px] font-bold text-[#2E2A27]" style={JK}>{userName ? userName.split(" ")[0] : "Student"}</h2>
      </div>
    </div>
  );
}

function HistoryTab({ nav, sessions }: { nav: (s: Screen) => void; sessions: any[] }) {
  return (
    <div className="px-5 pt-3 pb-4">
      <h2 className="text-[22px] font-bold text-[#2E2A27] mb-4" style={JK}>History</h2>
      {sessions.length === 0 ? (
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-full max-w-[320px] rounded-3xl border border-dashed border-[#CBD5E1] bg-white p-8 text-center shadow-sm">
            <p className="text-[15px] font-semibold text-[#2E2A27]" style={JK}>No history found</p>
            <p className="text-[12px] text-[#8C8681] mt-2" style={INTER}>You haven't completed any tests yet.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(s => {
            const p = pct(s.score, s.total);
            return (
              <div key={s.id} className="bg-white rounded-2xl border border-[#EADFD3] p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: sColor(p) + "1A" }}>
                  <span className="text-[14px] font-black" style={{ color: sColor(p), ...MONO }}>{p}%</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-[#2E2A27] truncate" style={JK}>{s.title}</p>
                  <p className="text-[11px] text-[#94A3B8] mt-0.5" style={INTER}>{s.date} · {s.duration} · {s.score}/{s.total}</p>
                  <div className="h-1 bg-[#F1F5F9] rounded-full mt-1.5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${p}%`, background: sColor(p) }} />
                  </div>
                </div>
                <button onClick={() => nav("results")} className="w-8 h-8 rounded-lg bg-[#FAF6F0] border border-[#EADFD3] flex items-center justify-center">
                  <Eye size={14} color="#8C8681" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LibraryTab({
  nav,
  globalLibrary,
  offlineLibrary,
  onOpenBundle,
  onDownloadBundle,
}: {
  nav: (s: Screen) => void;
  globalLibrary: any[];
  offlineLibrary: any[];
  onOpenBundle: (bundle: any) => void;
  onDownloadBundle: (bundle: any) => void;
}) {
  const [tab, setTab] = useState<"our" | "downloaded">("our");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const activeList = tab === "our" ? globalLibrary : offlineLibrary;

  const filteredItems = activeList.filter((item: any) => {
    const title = (item.title || item.name || "").toLowerCase();
    if (search && !title.includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="h-full flex flex-col bg-[#FAF6F0]">
      <div className="px-5 pt-3 pb-0 bg-white border-b border-[#EADFD3]">
        <h2 className="text-[22px] font-bold text-[#2E2A27] mb-4" style={JK}>Library</h2>

        <div className="relative mb-4">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <Search size={16} color="#94A3B8" />
          </div>
          <input
            type="text"
            placeholder="Search past questions, topics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#F1F5F9] rounded-2xl pl-11 pr-4 py-3.5 text-[14px] text-[#2E2A27] outline-none border border-transparent focus:border-[#E67468] transition-all"
            style={INTER}
          />
        </div>

        <div className="flex gap-6">
          <button
            onClick={() => setTab("our")}
            className={`pb-3 text-[14px] font-semibold transition-all relative ${tab === "our" ? "text-[#E67468]" : "text-[#8C8681]"}`}
            style={JK}
          >
            Our Library
            {tab === "our" && <motion.div layoutId="libTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E67468] rounded-t-full" />}
          </button>
          <button
            onClick={() => setTab("downloaded")}
            className={`pb-3 text-[14px] font-semibold transition-all relative ${tab === "downloaded" ? "text-[#E67468]" : "text-[#8C8681]"}`}
            style={JK}
          >
            Downloaded
            {tab === "downloaded" && <motion.div layoutId="libTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E67468] rounded-t-full" />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-10">
            <div className="w-16 h-16 rounded-full bg-[#F1F5F9] flex items-center justify-center mb-3">
              <Library size={24} color="#94A3B8" />
            </div>
            <p className="text-[15px] font-semibold text-[#2E2A27]" style={JK}>
              {tab === "downloaded" ? "No downloads yet" : search ? "No items found" : "Library is empty"}
            </p>
            <p className="text-[12px] text-[#8C8681] mt-1 max-w-[220px]" style={INTER}>
              {tab === "downloaded"
                ? "Snap/upload past questions or download bundles to see them here"
                : search
                  ? "Try a different search term"
                  : "Past question bundles will appear here once added"}
            </p>
          </div>
        ) : (
          filteredItems.map((item: any) => {
            const isDownloaded = offlineLibrary.some((o) => o.id === item.id);
            const qCount = Array.isArray(item.questions) ? item.questions.length : item.question_count || 0;
            return (
              <div key={item.id} className="bg-white rounded-2xl border border-[#EADFD3] p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#F5E8E7] flex items-center justify-center text-xl flex-shrink-0">
                  {item.icon || "📚"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-[#2E2A27] truncate" style={JK}>{item.title || item.name}</p>
                  <p className="text-[11px] text-[#8C8681] mt-0.5" style={INTER}>
                    {qCount ? `${qCount} questions · ` : ""}
                    {isDownloaded || tab === "downloaded" ? "Ready offline" : "Available to download"}
                  </p>
                </div>
                {isDownloaded || tab === "downloaded" ? (
                  <button
                    onClick={() => onOpenBundle(item)}
                    className="px-3.5 py-2 rounded-xl bg-[#E67468] text-white text-[12px] font-bold shadow-sm"
                    style={JK}
                  >
                    Start CBT
                  </button>
                ) : (
                  <button
                    disabled={busyId === item.id}
                    onClick={async () => {
                      setBusyId(item.id);
                      try {
                        await onDownloadBundle(item);
                      } finally {
                        setBusyId(null);
                      }
                    }}
                    className="w-9 h-9 rounded-full flex items-center justify-center border bg-white border-[#EADFD3]"
                  >
                    <Download size={14} color="#8C8681" />
                  </button>
                )}
              </div>
            );
          })
        )}
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
  onOpenBundle,
  onDownloadBundle,
}: {
  nav: (s: Screen) => void;
  tab: NavTab;
  onTab: (t: NavTab) => void;
  userName: string;
  sessions: any[];
  offlineLibrary: any[];
  globalLibrary: any[];
  onOpenBundle: (bundle: any) => void;
  onDownloadBundle: (bundle: any) => void;
}) {
  return (
    <div className="h-full flex flex-col bg-[#FAF6F0]">
      <div className="flex-1 overflow-y-auto">
        {tab === "home" && <HomeTab nav={nav} onTab={onTab} userName={userName} />}
        {tab === "library" && (
          <LibraryTab
            nav={nav}
            globalLibrary={globalLibrary}
            offlineLibrary={offlineLibrary}
            onOpenBundle={onOpenBundle}
            onDownloadBundle={onDownloadBundle}
          />
        )}
        {tab === "lead" && <HistoryTab nav={nav} sessions={sessions} />}
        {tab === "preference" && <div className="p-5">Preference Tab Placeholder</div>}
      </div>
      <BottomNav tab={tab} onTab={onTab} onSnap={() => nav("snap")} />
    </div>
  );
}

function SnapScreen({
  nav,
  onSessionStarted,
}: {
  nav: (s: Screen) => void;
  onSessionStarted: (sessionId: string) => void;
}) {
  const [showDialog, setShowDialog] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [materialName, setMaterialName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const confirmUpload = async () => {
    if (!pendingFiles.length || uploading) return;
    const name = materialName.trim() || "New Material";
    setUploading(true);
    try {
      const session = await createVisionSession({ name, icon: "📖" });
      const pdfs = pendingFiles.filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
      const images = sortUploadFiles(
        pendingFiles.filter((f) => !(f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")))
      );
      if (!pdfs.length && !images.length) throw new Error("No supported files");

      if (pdfs.length) {
        await uploadSessionPdf(session.id, pdfs[0]);
      }
      if (images.length) {
        const chunkSize = 40;
        for (let i = 0; i < images.length; i += chunkSize) {
          await uploadSessionPages(session.id, images.slice(i, i + chunkSize));
        }
      }

      onSessionStarted(session.id);
      nav("processing");
    } catch (err) {
      console.error(err);
      alert(`Failed to start extraction: ${err instanceof Error ? err.message : "Please try again."}`);
      nav("snap");
    } finally {
      setUploading(false);
    }
  };

  const handleFiles = (files: FileList | File[]) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    setPendingFiles((prev) => sortUploadFiles([...prev, ...list]));
    setShowDialog(true);
  };

  const removeFile = (idx: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const moveFile = (idx: number, dir: -1 | 1) => {
    setPendingFiles((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  };

  const handleCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setCameraStream(stream);
    } catch (err) {
      console.error("Camera error:", err);
      alert("Could not access the camera. Please check your permissions.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && cameraStream) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `capture_${Date.now()}.jpg`, { type: "image/jpeg" });
            stopCamera();
            handleFiles([file]);
          }
        }, "image/jpeg", 0.9);
      }
    }
  };

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      if (cameraStream) cameraStream.getTracks().forEach((track) => track.stop());
    };
  }, [cameraStream]);

  const handleGallery = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,application/pdf";
    input.multiple = true;
    input.onchange = (e: any) => {
      if (e.target.files?.length) handleFiles(e.target.files);
    };
    input.click();
  };

  return (
    <div className="h-full flex flex-col bg-[#FAF6F0] relative">
      {cameraStream && (
        <div className="absolute inset-0 z-50 bg-black flex flex-col">
          <video ref={videoRef} autoPlay playsInline className="flex-1 w-full h-full object-cover" />
          <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center gap-10">
            <button onClick={stopCamera} className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md text-white">
              <X size={24} />
            </button>
            <button onClick={capturePhoto} className="w-20 h-20 bg-white rounded-full border-4 border-gray-300 flex items-center justify-center shadow-lg">
              <div className="w-16 h-16 bg-white rounded-full border-2 border-black/10" />
            </button>
            <div className="w-12 h-12" />
          </div>
        </div>
      )}
      <div style={{ paddingTop: 52 }} className="px-5 flex items-center justify-between pb-6">
        <BackBtn onPress={() => nav("home")} />
        <span className="text-[#2E2A27] font-bold text-[17px]" style={JK}>Scan Question Paper</span>
        <div className="w-9" />
      </div>

      <div className="flex-1 relative mx-5 mb-6 rounded-[32px] overflow-hidden bg-[#2E2A27] shadow-2xl shadow-[#E67468]/10 ring-4 ring-white/50">
        <div className="absolute inset-0 opacity-40 mix-blend-overlay" style={{ background: "radial-gradient(circle at 50% 50%, #7A6CB2 0%, #2E2A27 100%)" }} />
        <div className="absolute inset-0 flex items-center justify-center opacity-40">
          <div className="w-[220px] space-y-3 p-5 rounded-xl bg-white/5 backdrop-blur-md border border-white/10">
            {[80, 65, 90, 55, 70, 40, 80].map((w, i) => (
              <div key={i} className="h-2.5 bg-white rounded-full" style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
        <div className="absolute inset-6">
          <div className="absolute top-0 left-0 w-10 h-10 border-t-[4px] border-l-[4px] border-[#E67468] rounded-tl-xl" />
          <div className="absolute top-0 right-0 w-10 h-10 border-t-[4px] border-r-[4px] border-[#E67468] rounded-tr-xl" />
          <div className="absolute bottom-0 left-0 w-10 h-10 border-b-[4px] border-l-[4px] border-[#E67468] rounded-bl-xl" />
          <div className="absolute bottom-0 right-0 w-10 h-10 border-b-[4px] border-r-[4px] border-[#E67468] rounded-br-xl" />
          <motion.div
            className="absolute left-0 right-0 h-[3px] rounded-full shadow-[0_0_15px_#E67468]"
            style={{ background: "linear-gradient(90deg, transparent, #E67468 20%, #7A6CB2 50%, #E67468 80%, transparent)" }}
            animate={{ top: ["5%", "95%"] }}
            transition={{ duration: 3, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
          />
        </div>
        <div className="absolute bottom-6 left-0 right-0 flex justify-center">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white/90 backdrop-blur-md rounded-2xl px-4 py-2.5 shadow-lg border border-white/20">
            <p className="text-[#2E2A27] text-[13px] font-medium text-center flex items-center gap-2" style={INTER}>
              <Camera size={14} className="text-[#E67468]" /> Bulk photos or PDF — AI groups by year
            </p>
          </motion.div>
        </div>
      </div>

      <div className="px-8 pb-12">
        <div className="flex items-center justify-between bg-white p-4 rounded-[32px] shadow-xl shadow-[#EADFD3]/50 border border-[#EADFD3]">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleGallery} className="w-14 h-14 rounded-2xl bg-[#F5E8E7] flex flex-col items-center justify-center gap-1">
            <Upload size={20} className="text-[#D45B4F]" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCamera}
            className="rounded-full flex items-center justify-center bg-gradient-to-tr from-[#E67468] to-[#D45B4F] shadow-lg shadow-[#E67468]/30 -mt-12 border-[6px] border-[#FAF6F0]"
            style={{ width: 84, height: 84 }}
          >
            <Camera size={32} color="white" />
          </motion.button>
          <motion.button onClick={() => nav("manual-entry")} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-14 h-14 rounded-2xl bg-[#F5E8E7] flex items-center justify-center">
            <BookOpen size={20} className="text-[#D45B4F]" />
          </motion.button>
        </div>
        <div className="flex items-center justify-between px-2 mt-4">
          <span className="text-[#8C8681] text-[12px] font-medium" style={INTER}>Bulk PDF/Imgs</span>
          <span className="text-[#8C8681] text-[12px] font-medium" style={INTER}>Manual enter</span>
        </div>
      </div>

      {showDialog && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-6">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[32px] p-6 w-full max-w-sm shadow-2xl max-h-[90%] overflow-y-auto">
            <h3 className="text-[20px] font-bold text-[#2E2A27] mb-2" style={JK}>Save Material</h3>
            <p className="text-[#8C8681] text-[13px] mb-4" style={INTER}>
              {pendingFiles.length} page{pendingFiles.length === 1 ? "" : "s"} ready. Reorder if needed — AI keeps year/paper memory across pages.
            </p>
            <input
              type="text"
              placeholder="e.g. Bio 101 Past Q 2000–2026"
              value={materialName}
              onChange={(e) => setMaterialName(e.target.value)}
              className="w-full bg-[#FAF6F0] border border-[#EADFD3] rounded-xl px-4 py-3 text-[15px] text-[#2E2A27] mb-4 outline-none focus:border-[#E67468]"
              style={INTER}
            />
            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {pendingFiles.map((f, i) => (
                <div key={`${f.name}-${i}`} className="flex items-center gap-2 bg-[#FAF6F0] rounded-xl px-3 py-2 border border-[#EADFD3]">
                  <span className="text-[11px] font-bold text-[#E67468] w-5">{i + 1}</span>
                  <span className="flex-1 text-[12px] text-[#2E2A27] truncate" style={INTER}>{f.name}</span>
                  <button onClick={() => moveFile(i, -1)} className="text-[#8C8681] text-[12px] px-1">↑</button>
                  <button onClick={() => moveFile(i, 1)} className="text-[#8C8681] text-[12px] px-1">↓</button>
                  <button onClick={() => removeFile(i)} className="text-[#D45B4F]"><X size={14} /></button>
                </div>
              ))}
            </div>
            <button
              onClick={handleGallery}
              className="w-full mb-3 py-2.5 rounded-xl text-[13px] font-semibold border border-dashed border-[#EADFD3] text-[#8C8681]"
              style={INTER}
            >
              + Add more pages
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDialog(false);
                  setPendingFiles([]);
                }}
                className="flex-1 py-3.5 rounded-2xl text-[14px] font-bold bg-[#FAF6F0] text-[#2E2A27]"
                style={JK}
              >
                Cancel
              </button>
              <button
                onClick={confirmUpload}
                disabled={!pendingFiles.length || uploading}
                className="flex-1 py-3.5 rounded-2xl text-[14px] font-bold bg-[#E67468] text-white shadow-lg shadow-[#E67468]/20 disabled:opacity-50"
                style={JK}
              >
                {uploading ? "Uploading…" : "Extract"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
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
      const response = await fetch(apiUrl("/api/vision/extract-text"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, name, icon }),
      });

      if (!response.ok) throw new Error("Failed to process text");
      const data = await response.json();
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
        <BackBtn onPress={() => nav("snap")} />
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

function ProcessingScreen({
  nav,
  sessionId,
  onQuestionsReady,
}: {
  nav: (s: Screen) => void;
  sessionId: string | null;
  onQuestionsReady: (questions: any[], meta?: { groups?: any[]; name?: string; sessionId?: string }) => void;
}) {
  const [phase, setPhase] = useState(0);
  const [dots, setDots] = useState("");
  const [session, setSession] = useState<VisionSession | null>(null);
  const [busyFu, setBusyFu] = useState<string | null>(null);
  const doneRef = useRef(false);

  const phases = [
    { pose: 0, text: "Scanning your paper", sub: "Identifying text regions" },
    { pose: 1, text: "Reading with Groq vision", sub: "AI is analyzing every page" },
    { pose: 4, text: "Extracting questions", sub: "Grouping by year & paper" },
    { pose: 3, text: "Structuring into CBT format", sub: "Stitching continued pages" },
    { pose: 2, text: "Checking patterns", sub: "Looking for missing pages" },
    { pose: 5, text: "Almost there!", sub: "Polishing your question bank" },
  ];

  const facts = [
    "Smart grouping keeps 2026 Paper A separate from Paper B.",
    "Continued questions across pages are stitched automatically.",
    "Answer keys are matched separately so stems stay clean.",
    "If a year looks short vs the pattern, PastQ will ask you.",
    "Unclear photos pause that page — the rest keeps going.",
    "Failed pages auto-retry so a mid-book glitch won't kill the job.",
  ];

  useEffect(() => {
    const t = setInterval(() => setPhase((p) => (p + 1) % phases.length), 4000);
    const d = setInterval(() => setDots((v) => (v.length >= 3 ? "" : v + ".")), 500);
    return () => {
      clearInterval(t);
      clearInterval(d);
    };
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    doneRef.current = false;

    const finish = async (s: VisionSession) => {
      if (doneRef.current || !active) return;
      doneRef.current = true;
      const qs = s.questions || [];
      const bundle = {
        id: s.id,
        title: s.name || "Extracted Material",
        name: s.name || "Extracted Material",
        icon: "📖",
        questions: qs,
        groups: s.groups || [],
        updatedAt: Date.now(),
        createdAt: Date.now(),
      };
      try {
        await saveBundle(bundle);
      } catch {}
      onQuestionsReady(qs, { groups: s.groups, name: s.name, sessionId: s.id });
    };

    const poll = async () => {
      try {
        const s = await getVisionSession(sessionId);
        if (!active) return;
        setSession(s);
        if (s.status === "completed" || s.status === "completed_with_errors") {
          await finish(s);
          return;
        }
        if (s.status === "failed" && !(s.questions || []).length) {
          alert("Extraction failed. You can retry from Snap.");
          nav("snap");
        }
      } catch (err) {
        console.error(err);
      }
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [sessionId, nav, onQuestionsReady]);

  const progress = session?.progress;
  const total = progress?.total || 0;
  const done = (progress?.done || 0) + (progress?.skipped || 0);
  const pctDone = total ? Math.min(99, Math.round((done / total) * 100)) : 0;
  const followUps = (session?.followUps || []).filter((f) => f.status === "open");

  const handleDismiss = async (fu: VisionFollowUp) => {
    if (!sessionId) return;
    setBusyFu(fu.id);
    try {
      const s = await replyVisionFollowUp(sessionId, { followUpId: fu.id, action: "dismiss" });
      setSession(s);
    } catch (e) {
      console.error(e);
    } finally {
      setBusyFu(null);
    }
  };

  const handleAttachClearer = async (fu: VisionFollowUp) => {
    if (!sessionId) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setBusyFu(fu.id);
      try {
        const s = await replyVisionFollowUp(sessionId, {
          followUpId: fu.id,
          action: "replace_page",
          image: file,
        });
        setSession(s);
      } catch (err) {
        console.error(err);
        alert("Could not upload clearer page.");
      } finally {
        setBusyFu(null);
      }
    };
    input.click();
  };

  const handleResume = async () => {
    if (!sessionId) return;
    try {
      const s = await resumeVisionSession(sessionId);
      setSession(s);
      doneRef.current = false;
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center bg-[#FAF6F0] relative overflow-hidden">
      <motion.div
        animate={{ scale: [1, 1.3, 1], opacity: [0.12, 0.25, 0.12] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-br from-[#E67468] to-[#D45B4F] rounded-full blur-[140px]"
      />
      <motion.div
        animate={{ scale: [1, 1.4, 1], opacity: [0.08, 0.2, 0.08] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -bottom-32 -right-32 w-96 h-96 bg-gradient-to-br from-[#7A6CB2] to-[#5B4E94] rounded-full blur-[140px]"
      />

      <div className="relative z-10 flex flex-col items-center px-6 w-full max-w-sm">
        <motion.div
          key={phase}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 14, stiffness: 100 }}
        >
          <Suspense fallback={<div className="h-[180px]" />}>
            <Student3DScene pose={phases[phase].pose} />
          </Suspense>
        </motion.div>

        <motion.h2
          key={"t" + phase}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[20px] font-bold text-[#2E2A27] text-center mt-2"
          style={JK}
        >
          {session?.status === "needs_input" ? "Needs your input" : phases[phase].text}
          {session?.status !== "needs_input" ? dots : ""}
        </motion.h2>
        <motion.p
          key={"s" + phase}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-[13px] text-[#8C8681] text-center mt-1 mb-3"
          style={INTER}
        >
          {session?.memory?.activeYear
            ? `Reading ${session.memory.activeYear}${session.memory.activePaper ? " · Paper " + session.memory.activePaper : ""}`
            : phases[phase].sub}
        </motion.p>

        <div className="w-full mb-2">
          <div className="flex justify-between text-[11px] text-[#8C8681] mb-1" style={INTER}>
            <span>
              {total ? `${done}/${total} pages` : session ? "Waiting for pages…" : "Connecting to backend…"}
              {progress?.failed ? ` · ${progress.failed} failed` : ""}
            </span>
            <span>{pctDone}%</span>
          </div>
          <div className="w-full h-[5px] bg-[#EADFD3] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pctDone}%`,
                background: "linear-gradient(90deg, #E67468, #7A6CB2)",
              }}
            />
          </div>
        </div>

        {!!(session?.groups || []).length && (
          <p className="text-[11px] text-[#5C5550] mb-3 text-center" style={INTER}>
            {(session!.groups || []).slice(0, 4).map((g) => `${g.year}${g.paper && g.paper !== "Default" ? " " + g.paper : ""} (${g.count})`).join(" · ")}
            {(session!.groups || []).length > 4 ? "…" : ""}
          </p>
        )}

        {followUps.length > 0 && (
          <div className="w-full max-h-40 overflow-y-auto space-y-2 mb-3">
            {followUps.slice(0, 3).map((fu) => (
              <div key={fu.id} className="bg-white/90 border border-[#EADFD3] rounded-2xl p-3">
                <p className="text-[12px] text-[#2E2A27] leading-snug mb-2" style={INTER}>{fu.message}</p>
                <div className="flex gap-2">
                  {(fu.type === "unclear_image" || fu.type === "missing_questions" || fu.type === "count_anomaly") && (
                    <button
                      disabled={busyFu === fu.id}
                      onClick={() => handleAttachClearer(fu)}
                      className="flex-1 py-2 rounded-xl text-[11px] font-bold bg-[#E67468] text-white"
                    >
                      {fu.type === "unclear_image" ? "Upload clearer" : "Add missing page"}
                    </button>
                  )}
                  <button
                    disabled={busyFu === fu.id}
                    onClick={() => handleDismiss(fu)}
                    className="px-3 py-2 rounded-xl text-[11px] font-bold bg-[#FAF6F0] text-[#8C8681]"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {(session?.status === "needs_input" || (progress?.failed || 0) > 0) && (
          <button onClick={handleResume} className="mb-3 px-4 py-2 rounded-xl text-[12px] font-bold bg-[#7A6CB2] text-white">
            Resume / retry failed pages
          </button>
        )}

        {(session?.questions || []).length > 0 && (session?.status === "needs_input" || session?.status === "completed_with_errors") && (
          <button
            onClick={() => onQuestionsReady(session!.questions || [], { groups: session!.groups, name: session!.name, sessionId: session!.id })}
            className="mb-3 px-4 py-2 rounded-xl text-[12px] font-bold border border-[#EADFD3] text-[#2E2A27] bg-white"
          >
            Continue with {(session!.questions || []).length} questions
          </button>
        )}

        <motion.div key={"f" + phase} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-center mb-5">
          <p className="text-[11px] font-semibold text-[#E67468] uppercase tracking-widest mb-1" style={JK}>Did you know?</p>
          <p className="text-[12px] text-[#5C5550] leading-relaxed" style={INTER}>{facts[phase]}</p>
        </motion.div>
      </div>
    </div>
  );
}

function ExamCalculator({ onClose }: { onClose: () => void }) {
  const [display, setDisplay] = useState("0");
  const [expr, setExpr] = useState("");
  const [justEvaluated, setJustEvaluated] = useState(false);

  const evaluate = (raw: string) => {
    const cleaned = raw
      .replace(/×/g, "*")
      .replace(/÷/g, "/")
      .replace(/−/g, "-")
      .replace(/%/g, "/100");
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${cleaned})`)();
    if (!Number.isFinite(result)) throw new Error("Invalid");
    return String(Math.round(result * 1e10) / 1e10);
  };

  const press = (key: string) => {
    if (key === "C") {
      setDisplay("0");
      setExpr("");
      setJustEvaluated(false);
      return;
    }
    if (key === "⌫") {
      if (justEvaluated) {
        setDisplay("0");
        setExpr("");
        setJustEvaluated(false);
        return;
      }
      setDisplay((d) => (d.length <= 1 ? "0" : d.slice(0, -1)));
      return;
    }
    if (key === "=") {
      try {
        const full = (expr ? expr + display : display);
        const out = evaluate(full);
        setDisplay(out);
        setExpr("");
        setJustEvaluated(true);
      } catch {
        setDisplay("Error");
        setExpr("");
        setJustEvaluated(true);
      }
      return;
    }
    if (key === "√") {
      try {
        const n = parseFloat(display);
        if (!Number.isFinite(n) || n < 0) throw new Error("Invalid");
        const out = String(Math.round(Math.sqrt(n) * 1e10) / 1e10);
        setDisplay(out);
        setExpr("");
        setJustEvaluated(true);
      } catch {
        setDisplay("Error");
        setExpr("");
        setJustEvaluated(true);
      }
      return;
    }
    if (key === "±") {
      if (display === "0" || display === "Error") return;
      setDisplay((d) => (d.startsWith("-") ? d.slice(1) : `-${d}`));
      return;
    }

    const isOp = ["+", "−", "×", "÷"].includes(key);
    if (isOp) {
      const base = justEvaluated || !expr ? display : expr + display;
      const trimmed = /[+\−×÷]$/.test(base) ? base.slice(0, -1) + key : base + key;
      setExpr(trimmed);
      setDisplay("0");
      setJustEvaluated(false);
      return;
    }

    if (key === "%") {
      try {
        const out = evaluate(display + "/100");
        setDisplay(out);
        setJustEvaluated(true);
        setExpr("");
      } catch {
        setDisplay("Error");
        setJustEvaluated(true);
      }
      return;
    }

    if (justEvaluated) {
      setDisplay(key === "." ? "0." : key);
      setExpr("");
      setJustEvaluated(false);
      return;
    }

    if (key === ".") {
      setDisplay((d) => (d.includes(".") ? d : d + "."));
      return;
    }

    setDisplay((d) => (d === "0" || d === "Error" ? key : d + key));
  };

  const keys = [
    ["C", "⌫", "%", "÷"],
    ["7", "8", "9", "×"],
    ["4", "5", "6", "−"],
    ["1", "2", "3", "+"],
    ["±", "0", ".", "="],
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[60] bg-black/45 flex items-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40 }}
        animate={{ y: 0 }}
        exit={{ y: 40 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full bg-white rounded-t-[28px] px-4 pt-3 pb-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#F5E8E7] flex items-center justify-center">
              <Calculator size={16} color="#E67468" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-[#2E2A27]" style={JK}>Calculator</p>
              <p className="text-[11px] text-[#8C8681]" style={INTER}>Tap outside or ✕ to close</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-[#FAF6F0] border border-[#EADFD3] flex items-center justify-center">
            <X size={16} color="#2E2A27" />
          </button>
        </div>

        <div className="rounded-2xl bg-[#1C1917] px-4 py-4 mb-3 min-h-[84px] flex flex-col justify-end">
          <p className="text-[12px] text-[#A8A29E] text-right truncate min-h-[16px]" style={MONO}>{expr ? expr + display : " "}</p>
          <p className="text-[32px] font-bold text-white text-right leading-none truncate" style={MONO}>{display}</p>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-2">
          {keys.flat().map((k) => {
            const isOp = ["÷", "×", "−", "+", "="].includes(k);
            const isFn = ["C", "⌫", "%", "±"].includes(k);
            return (
              <button
                key={k}
                onClick={() => press(k)}
                className="h-14 rounded-2xl text-[18px] font-bold active:scale-95 transition-transform"
                style={{
                  background: k === "=" ? "#E67468" : isOp ? "#F5E8E7" : isFn ? "#FAF6F0" : "#F8F4EE",
                  color: k === "=" ? "white" : isOp ? "#E67468" : "#2E2A27",
                  border: `1px solid ${k === "=" ? "#E67468" : "#EADFD3"}`,
                  ...MONO,
                }}
              >
                {k}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => press("√")}
          className="w-full h-12 rounded-2xl border border-[#EADFD3] bg-[#FAF6F0] text-[15px] font-bold text-[#2E2A27]"
          style={JK}
        >
          √ Square root
        </button>
      </motion.div>
    </motion.div>
  );
}

function SolvePad({
  question,
  options,
  selected,
  onSelect,
  onClose,
}: {
  question: string;
  options: string[];
  selected: number | null;
  onSelect: (i: number) => void;
  onClose: () => void;
}) {
  const WORLD_W = 1600;
  const WORLD_H = 2200;
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 3;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState("#2E2A27");
  const [size, setSize] = useState(4);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [qOpen, setQOpen] = useState(true);
  const [canUndo, setCanUndo] = useState(false);

  const strokesRef = useRef<{
    tool: "pen" | "eraser";
    color: string;
    size: number;
    points: { x: number; y: number }[];
  }[]>([]);
  const drawing = useRef(false);
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStart = useRef<{ dist: number; zoom: number; pan: { x: number; y: number }; mid: { x: number; y: number } } | null>(null);
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const sizeRef = useRef(size);
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);

  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { sizeRef.current = size; }, [size]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panRef.current = pan; }, [pan]);

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = "#FFFEFB";
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    ctx.strokeStyle = "#EEE8DF";
    ctx.lineWidth = 1;
    for (let x = 0; x <= WORLD_W; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, WORLD_H);
      ctx.stroke();
    }
    for (let y = 0; y <= WORLD_H; y += 28) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WORLD_W, y);
      ctx.stroke();
    }
    // stronger every 5th line — helpful for physics sketches
    ctx.strokeStyle = "#E2D9CC";
    for (let x = 0; x <= WORLD_W; x += 140) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, WORLD_H);
      ctx.stroke();
    }
    for (let y = 0; y <= WORLD_H; y += 140) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WORLD_W, y);
      ctx.stroke();
    }
  };

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawGrid(ctx);
    for (const stroke of strokesRef.current) {
      if (stroke.points.length < 1) continue;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalCompositeOperation = "source-over";
      if (stroke.tool === "eraser") {
        ctx.strokeStyle = "#FFFEFB";
        ctx.lineWidth = stroke.size * 5;
      } else {
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size;
      }
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      if (stroke.points.length === 1) {
        ctx.lineTo(stroke.points[0].x + 0.01, stroke.points[0].y);
      }
      ctx.stroke();
    }
    setCanUndo(strokesRef.current.length > 0);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(WORLD_W * dpr);
    canvas.height = Math.floor(WORLD_H * dpr);
    canvas.style.width = `${WORLD_W}px`;
    canvas.style.height = `${WORLD_H}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();

    // Fit canvas to viewport width on open
    const vp = viewportRef.current;
    if (vp && vp.clientWidth > 0) {
      const fit = Math.min(1, (vp.clientWidth - 16) / WORLD_W);
      const z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, fit));
      setZoom(z);
      setPan({ x: (vp.clientWidth - WORLD_W * z) / 2, y: 8 });
    }
  }, []);

  const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

  const setZoomAround = (nextZoom: number, anchorX: number, anchorY: number) => {
    const z0 = zoomRef.current;
    const z1 = clampZoom(nextZoom);
    if (z1 === z0) return;
    const p = panRef.current;
    // Keep the world point under the anchor stable
    const worldX = (anchorX - p.x) / z0;
    const worldY = (anchorY - p.y) / z0;
    const nextPan = {
      x: anchorX - worldX * z1,
      y: anchorY - worldY * z1,
    };
    setZoom(z1);
    setPan(nextPan);
  };

  const zoomBy = (factor: number) => {
    const vp = viewportRef.current;
    if (!vp) {
      setZoom((z) => clampZoom(z * factor));
      return;
    }
    const ax = vp.clientWidth / 2;
    const ay = vp.clientHeight / 2;
    setZoomAround(zoomRef.current * factor, ax, ay);
  };

  const resetView = () => {
    const vp = viewportRef.current;
    if (!vp) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }
    const fit = Math.min(1, (vp.clientWidth - 16) / WORLD_W);
    const z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, fit));
    setZoom(z);
    setPan({ x: (vp.clientWidth - WORLD_W * z) / 2, y: 8 });
  };

  const worldPos = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * WORLD_W;
    const y = ((clientY - rect.top) / rect.height) * WORLD_H;
    return {
      x: Math.max(0, Math.min(WORLD_W, x)),
      y: Math.max(0, Math.min(WORLD_H, y)),
    };
  };

  const pointerDist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.current.size === 2) {
      drawing.current = false;
      const pts = [...activePointers.current.values()];
      const dist = pointerDist(pts[0], pts[1]);
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const vp = viewportRef.current?.getBoundingClientRect();
      pinchStart.current = {
        dist: Math.max(dist, 1),
        zoom: zoomRef.current,
        pan: { ...panRef.current },
        mid: vp ? { x: mid.x - vp.left, y: mid.y - vp.top } : mid,
      };
      return;
    }

    if (activePointers.current.size === 1) {
      drawing.current = true;
      const p = worldPos(e.clientX, e.clientY);
      strokesRef.current.push({
        tool: toolRef.current,
        color: colorRef.current,
        size: sizeRef.current,
        points: [p],
      });
      redraw();
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!activePointers.current.has(e.pointerId)) return;
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.current.size >= 2 && pinchStart.current) {
      drawing.current = false;
      const pts = [...activePointers.current.values()];
      const dist = pointerDist(pts[0], pts[1]);
      const scale = dist / pinchStart.current.dist;
      const nextZoom = clampZoom(pinchStart.current.zoom * scale);
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const vp = viewportRef.current?.getBoundingClientRect();
      const localMid = vp ? { x: mid.x - vp.left, y: mid.y - vp.top } : mid;
      const worldX = (pinchStart.current.mid.x - pinchStart.current.pan.x) / pinchStart.current.zoom;
      const worldY = (pinchStart.current.mid.y - pinchStart.current.pan.y) / pinchStart.current.zoom;
      setZoom(nextZoom);
      setPan({
        x: localMid.x - worldX * nextZoom,
        y: localMid.y - worldY * nextZoom,
      });
      // update pinch mid for next move so panning feels continuous
      pinchStart.current = {
        ...pinchStart.current,
        mid: localMid,
        pan: { x: localMid.x - worldX * nextZoom, y: localMid.y - worldY * nextZoom },
        zoom: nextZoom,
        dist: Math.max(dist, 1),
      };
      return;
    }

    if (!drawing.current || activePointers.current.size !== 1) return;
    const stroke = strokesRef.current[strokesRef.current.length - 1];
    if (!stroke) return;
    const p = worldPos(e.clientX, e.clientY);
    const last = stroke.points[stroke.points.length - 1];
    if (last && Math.hypot(p.x - last.x, p.y - last.y) < 1.2) return;
    stroke.points.push(p);
    redraw();
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size < 2) pinchStart.current = null;
    if (activePointers.current.size === 0) drawing.current = false;
  };

  const undo = () => {
    if (strokesRef.current.length === 0) return;
    strokesRef.current.pop();
    redraw();
  };

  const clearPad = () => {
    strokesRef.current = [];
    redraw();
  };

  const colors = ["#2E2A27", "#E67468", "#2563EB", "#16A34A", "#7A6CB2"];
  const zoomPct = Math.round(zoom * 100);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[70] bg-[#FAF6F0] flex flex-col"
    >
      {/* Header */}
      <div className="px-3 sm:px-4 pt-3 pb-2 bg-white border-b border-[#EADFD3] flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-[#2E2A27]" style={JK}>Solve Pad</p>
          <p className="text-[11px] text-[#8C8681] truncate" style={INTER}>Draw workings · pinch to zoom</p>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 flex-shrink-0 rounded-full bg-[#F5E8E7] flex items-center justify-center active:scale-95"
          aria-label="Close solve pad"
        >
          <X size={18} color="#E67468" />
        </button>
      </div>

      {/* Question (collapsible for more canvas space) */}
      <div className="bg-white border-b border-[#EADFD3]">
        <button
          onClick={() => setQOpen((v) => !v)}
          className="w-full px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 text-left"
        >
          <span className="text-[12px] font-bold text-[#8C8681]" style={JK}>
            {qOpen ? "Hide question" : "Show question & options"}
          </span>
          {qOpen ? <ChevronUp size={16} color="#8C8681" /> : <ChevronDown size={16} color="#8C8681" />}
        </button>
        {qOpen && (
          <div className="px-3 sm:px-4 pb-3 max-h-[32vh] overflow-y-auto">
            <p className="text-[13px] sm:text-[14px] font-semibold text-[#2E2A27] leading-snug mb-2.5" style={INTER}>
              {question}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {options.map((opt, i) => {
                const sel = selected === i;
                return (
                  <button
                    key={i}
                    onClick={() => onSelect(i)}
                    className="flex items-center gap-2 p-2.5 rounded-xl border text-left active:scale-[0.99]"
                    style={{ background: sel ? "#F5E8E7" : "#FAF6F0", borderColor: sel ? "#E67468" : "#EADFD3" }}
                  >
                    <span
                      className="w-7 h-7 rounded-lg text-[12px] font-bold flex items-center justify-center flex-shrink-0"
                      style={{ background: sel ? "#E67468" : "white", color: sel ? "white" : "#8C8681", ...JK }}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="text-[12px] sm:text-[13px] text-[#2E2A27] leading-snug" style={INTER}>{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Tools — pen/eraser first and obvious */}
      <div className="px-3 sm:px-4 py-2.5 bg-white border-b border-[#EADFD3] space-y-2.5">
        <div className="flex p-1 rounded-2xl bg-[#FAF6F0] border border-[#EADFD3]">
          <button
            onClick={() => setTool("pen")}
            className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-[13px] font-bold transition-all"
            style={{
              background: tool === "pen" ? "#E67468" : "transparent",
              color: tool === "pen" ? "white" : "#8C8681",
              boxShadow: tool === "pen" ? "0 4px 12px rgba(230,116,104,0.28)" : "none",
            }}
          >
            <PenLine size={16} /> Pencil
          </button>
          <button
            onClick={() => setTool("eraser")}
            className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-[13px] font-bold transition-all"
            style={{
              background: tool === "eraser" ? "#2E2A27" : "transparent",
              color: tool === "eraser" ? "white" : "#8C8681",
              boxShadow: tool === "eraser" ? "0 4px 12px rgba(46,42,39,0.2)" : "none",
            }}
          >
            <Eraser size={16} /> Eraser
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          {tool === "pen" && colors.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-8 h-8 rounded-full flex-shrink-0 border-2"
              style={{
                background: c,
                borderColor: color === c ? "#E67468" : "white",
                boxShadow: color === c ? "0 0 0 2px #F5E8E7" : "0 0 0 1px #EADFD3",
              }}
              aria-label={`Color ${c}`}
            />
          ))}
          {tool === "pen" && <div className="w-px h-6 bg-[#EADFD3] flex-shrink-0" />}
          {[3, 5, 8].map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              className="w-9 h-9 rounded-full border flex items-center justify-center flex-shrink-0"
              style={{ borderColor: size === s ? "#E67468" : "#EADFD3", background: size === s ? "#F5E8E7" : "white" }}
              aria-label={`Size ${s}`}
            >
              <span
                className="rounded-full"
                style={{
                  width: s + 2,
                  height: s + 2,
                  background: tool === "eraser" ? "#A8A29E" : color,
                }}
              />
            </button>
          ))}
          <div className="flex-1 min-w-2" />
          <button
            onClick={undo}
            disabled={!canUndo}
            className="w-10 h-10 rounded-xl bg-[#FAF6F0] border border-[#EADFD3] flex items-center justify-center disabled:opacity-35 active:scale-95"
            aria-label="Undo"
          >
            <Undo2 size={16} color="#8C8681" />
          </button>
          <button
            onClick={clearPad}
            className="w-10 h-10 rounded-xl bg-[#FAF6F0] border border-[#EADFD3] flex items-center justify-center active:scale-95"
            aria-label="Clear"
          >
            <Trash2 size={16} color="#EF4444" />
          </button>
        </div>
      </div>

      {/* Canvas viewport */}
      <div ref={viewportRef} className="flex-1 relative min-h-0 overflow-hidden bg-[#F3EEE6]">
        <div
          ref={wrapRef}
          className="absolute inset-0 touch-none"
          style={{ cursor: tool === "eraser" ? "cell" : "crosshair" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
              width: WORLD_W,
              height: WORLD_H,
            }}
          >
            <canvas ref={canvasRef} className="block rounded-sm shadow-sm" />
          </div>
        </div>

        {/* Floating zoom controls */}
        <div className="absolute right-3 bottom-3 flex flex-col gap-2">
          <button
            onClick={() => zoomBy(1.25)}
            className="w-11 h-11 rounded-2xl bg-white border border-[#EADFD3] shadow-md flex items-center justify-center active:scale-95"
            aria-label="Zoom in"
          >
            <ZoomIn size={18} color="#2E2A27" />
          </button>
          <button
            onClick={() => zoomBy(0.8)}
            className="w-11 h-11 rounded-2xl bg-white border border-[#EADFD3] shadow-md flex items-center justify-center active:scale-95"
            aria-label="Zoom out"
          >
            <ZoomOut size={18} color="#2E2A27" />
          </button>
          <button
            onClick={resetView}
            className="h-11 px-2.5 rounded-2xl bg-white border border-[#EADFD3] shadow-md flex items-center justify-center text-[12px] font-bold text-[#2E2A27] active:scale-95"
            style={MONO}
            aria-label="Reset zoom"
          >
            {zoomPct}%
          </button>
        </div>

        <div className="absolute left-3 bottom-3 px-2.5 py-1.5 rounded-full bg-white/90 border border-[#EADFD3] text-[10px] font-semibold text-[#8C8681]" style={INTER}>
          {tool === "pen" ? "Pencil" : "Eraser"} · pinch zoom
        </div>
      </div>

      <div className="px-3 sm:px-4 py-3 bg-white border-t border-[#EADFD3] safe-pb">
        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-2xl bg-[#E67468] text-white text-[15px] font-bold active:scale-[0.99]"
          style={JK}
        >
          Done — Back to Test
        </button>
      </div>
    </motion.div>
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
  const [examDuration, setExamDuration] = useState(30 * 60);
  const [selectedGroup, setSelectedGroup] = useState<string>("all");

  const groups = (() => {
    const map = new Map<string, { key: string; year: string; paper: string; items: Q[] }>();
    for (const q of sortQuestions(questions)) {
      const year = q.year || "Unknown";
      const paper = q.paper || "Default";
      const key = `${year}::${paper}`;
      if (!map.has(key)) map.set(key, { key, year, paper, items: [] });
      map.get(key)!.items.push(q);
    }
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

  const openEdit = (i: number) => {
    const q = visible[i];
    const realIndex = questions.findIndex((x) => x === q || (x.id === q.id && x.question === q.question));
    setEditIndex(realIndex >= 0 ? realIndex : i);
    setDraft({ ...q, options: [...q.options] });
  };

  const saveEdit = () => {
    if (editIndex === null || !draft) return;
    const next = questions.map((q, i) => (i === editIndex ? { ...draft, options: draft.options.map((o) => o.trim()) } : q));
    onUpdateQuestions(next);
    setEditIndex(null);
    setDraft(null);
  };

  return (
    <div className="h-full flex flex-col bg-[#FAF6F0] relative">
      <div className="px-5 pt-2 pb-3 bg-white border-b border-[#EADFD3] flex items-center gap-3">
        <BackBtn onPress={() => nav("home")} />
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
              {g.year}{g.paper !== "Default" ? ` ${g.paper}` : ""} ({g.items.length})
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
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
                </div>
                <p className="text-[13px] text-[#2E2A27] leading-snug line-clamp-2" style={INTER}>{q.question}</p>
                <div className="flex gap-2 mt-1.5 flex-wrap">
                  {q.options.slice(0, 2).map((opt, j) => (
                    <span key={j} className="text-[10px] text-[#94A3B8]">
                      {String.fromCharCode(65 + j)}. {opt.slice(0, 28)}{opt.length > 28 ? "…" : ""}
                    </span>
                  ))}
                </div>
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
          <label className="text-[12px] font-semibold text-[#8C8681]" style={INTER}>Exam Duration</label>
          <div className="flex gap-2">
            {[10, 20, 30, 60].map((m) => (
              <button
                key={m}
                onClick={() => setExamDuration(m * 60)}
                className={`flex-1 py-2 rounded-lg text-[13px] font-medium border ${examDuration === m * 60 ? "bg-[#E67468] text-white border-[#E67468]" : "bg-[#FAF6F0] text-[#2E2A27] border-[#EADFD3]"}`}
              >
                {m}m
              </button>
            ))}
          </div>
        </div>
        <PrimaryBtn
          label={selectedGroup === "all" ? "Looks good — Start Test" : `Start ${visible.length}-Q group`}
          onClick={() => onStartTest(examDuration, visible)}
        />
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

function ExamScreen({
  questions, answers, onAnswer, flagged, onFlag,
  currentQ, onQ, timeLeft, showModal, onModal, onSubmit,
}: {
  questions: Q[];
  answers: (number | null)[];
  onAnswer: (qi: number, opt: number) => void;
  flagged: boolean[];
  onFlag: (qi: number) => void;
  currentQ: number;
  onQ: (qi: number) => void;
  timeLeft: number;
  showModal: boolean;
  onModal: (v: boolean) => void;
  onSubmit: () => void;
  nav: (s: Screen) => void;
}) {
  const q = questions[currentQ];
  const answered = answers.filter(a => a !== null).length;
  const unanswered = questions.length - answered;
  const flaggedCount = flagged.filter(Boolean).length;
  const isLow = timeLeft < 300;
  const isMid = timeLeft < 600 && !isLow;
  const [showCalc, setShowCalc] = useState(false);
  const [showPad, setShowPad] = useState(false);

  if (!q) return null;

  return (
    <div className="h-full flex flex-col bg-[#FAF6F0] relative">
      {/* Header — no X; timer + tools */}
      <div style={{ paddingTop: 48 }} className="px-4 pb-3 bg-white border-b border-[#EADFD3]">
        <div className="flex items-center gap-2 mb-3">
          <div
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border"
            style={{
              borderColor: isLow ? "#FCA5A5" : isMid ? "#DDD6FE" : "#EADFD3",
              background: isLow ? "#FEF2F2" : isMid ? "#F5F3FF" : "linear-gradient(135deg, #FFFBF7 0%, #FAF6F0 100%)",
            }}
          >
            <Clock size={15} color={isLow ? "#EF4444" : isMid ? "#7A6CB2" : "#E67468"} />
            <span
              className="text-[20px] font-bold tracking-wide"
              style={{ color: isLow ? "#EF4444" : isMid ? "#7A6CB2" : "#2E2A27", ...MONO }}
            >
              {fmt(timeLeft)}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: isLow ? "#EF4444" : "#8C8681" }}>
              left
            </span>
          </div>

          <button
            onClick={() => setShowCalc(true)}
            className="w-11 h-11 rounded-2xl bg-[#F5E8E7] border border-[#F0D4D0] flex items-center justify-center active:scale-95"
            aria-label="Calculator"
          >
            <Calculator size={18} color="#E67468" />
          </button>
          <button
            onClick={() => setShowPad(true)}
            className="w-11 h-11 rounded-2xl bg-[#EEF2FF] border border-[#E0E7FF] flex items-center justify-center active:scale-95"
            aria-label="Solve pad"
          >
            <PenLine size={18} color="#4F46E5" />
          </button>
          <button
            onClick={() => onFlag(currentQ)}
            className="w-11 h-11 rounded-2xl border flex items-center justify-center active:scale-95"
            style={{ background: flagged[currentQ] ? "#FFFBEB" : "#FAF6F0", borderColor: flagged[currentQ] ? "#FDE68A" : "#EADFD3" }}
            aria-label="Flag question"
          >
            <Flag size={16} color={flagged[currentQ] ? "#7A6CB2" : "#94A3B8"} fill={flagged[currentQ] ? "#7A6CB2" : "none"} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold text-[#2E2A27]" style={JK}>Q{currentQ + 1}<span className="text-[#8C8681] font-semibold"> / {questions.length}</span></span>
          <div className="flex-1 h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
            <div className="h-full bg-[#E67468] rounded-full transition-all" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} />
          </div>
          <span className="text-[10px] font-semibold text-[#64748B] bg-[#F1F5F9] px-2.5 py-1 rounded-full">{q.subject}</span>
        </div>
      </div>

      {/* Question + Options */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <p className="text-[16px] font-semibold text-[#2E2A27] leading-relaxed mb-5" style={INTER}>{q.question}</p>
        <div className="space-y-2.5">
          {q.options.map((opt, i) => {
            const sel = answers[currentQ] === i;
            const lbl = String.fromCharCode(65 + i);
            return (
              <button key={i} onClick={() => onAnswer(currentQ, i)}
                className="w-full flex items-center gap-3.5 p-4 rounded-2xl border text-left transition-all active:scale-[0.99]"
                style={{ background: sel ? "#F5E8E7" : "white", borderColor: sel ? "#E67468" : "#EADFD3" }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[14px] font-bold"
                  style={{ background: sel ? "#E67468" : "#FAF6F0", color: sel ? "white" : "#8C8681", border: sel ? "none" : "1px solid #EADFD3", ...JK }}>
                  {lbl}
                </div>
                <p className="text-[14px] text-[#2E2A27] leading-snug flex-1" style={INTER}>{opt}</p>
                {sel && (
                  <div className="w-5 h-5 rounded-full bg-[#E67468] flex items-center justify-center flex-shrink-0">
                    <Check size={11} color="white" strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Nav */}
      <div className="px-4 py-3 bg-white border-t border-[#EADFD3] space-y-3">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {questions.map((_, i) => {
            const isAns = answers[i] !== null;
            const isFl = flagged[i];
            const isCur = currentQ === i;
            return (
              <button key={i} onClick={() => onQ(i)}
                className="w-8 h-8 flex-shrink-0 rounded-xl text-[11px] font-bold transition-all"
                style={{
                  background: isCur ? "#E67468" : isFl ? "#FFFBEB" : isAns ? "#DCFCE7" : "#F1F5F9",
                  color: isCur ? "white" : isFl ? "#92400E" : isAns ? "#15803D" : "#94A3B8",
                  border: isFl && !isCur ? "1px solid #FDE68A" : "none",
                  ...MONO,
                }}>
                {i + 1}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          <button onClick={() => onQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0}
            className="flex-1 py-3.5 rounded-2xl border border-[#EADFD3] text-[14px] font-semibold text-[#8C8681] disabled:opacity-40 flex items-center justify-center gap-1.5" style={JK}>
            <ChevronLeft size={16} /> Previous
          </button>
          {currentQ === questions.length - 1 ? (
            <button onClick={() => onModal(true)}
              className="flex-1 py-3.5 rounded-2xl bg-[#E67468] text-white text-[14px] font-bold flex items-center justify-center gap-1.5" style={JK}>
              <Send size={15} /> Submit
            </button>
          ) : (
            <button onClick={() => onQ(currentQ + 1)}
              className="flex-1 py-3.5 rounded-2xl bg-[#E67468] text-white text-[14px] font-bold flex items-center justify-center gap-1.5" style={JK}>
              Next
              <ChevronRight size={16} />
            </button>
          )}
        </div>
        <button
          onClick={() => onModal(true)}
          className="w-full text-center text-[12px] font-semibold text-[#8C8681] py-1"
          style={INTER}
        >
          End test early
        </button>
      </div>

      {/* Submit Modal */}
      {showModal && (
        <div className="absolute inset-0 bg-black/40 flex items-end z-50">
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="w-full bg-white rounded-t-3xl p-6 space-y-4">
            <div className="w-10 h-1.5 bg-[#EADFD3] rounded-full mx-auto" />
            <h3 className="text-[20px] font-bold text-[#2E2A27] text-center" style={JK}>Submit Test?</h3>

            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: "Answered", count: answered, bg: "#DCFCE7", fg: "#15803D" },
                { label: "Unanswered", count: unanswered, bg: "#FEE2E2", fg: "#991B1B" },
                { label: "Flagged", count: flaggedCount, bg: "#FFFBEB", fg: "#92400E" },
              ].map(({ label, count, bg, fg }) => (
                <div key={label} className="rounded-2xl p-3 text-center" style={{ background: bg }}>
                  <p className="text-[22px] font-bold" style={{ color: fg, ...MONO }}>{count}</p>
                  <p className="text-[11px] font-semibold mt-0.5" style={{ color: fg }}>{label}</p>
                </div>
              ))}
            </div>

            {unanswered > 0 && (
              <div className="flex items-center gap-2 bg-[#FEF3C7] rounded-xl p-3">
                <AlertTriangle size={15} color="#92400E" />
                <p className="text-[12px] text-[#92400E]" style={INTER}>
                  {unanswered} question{unanswered > 1 ? "s" : ""} unanswered.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <PrimaryBtn label="Submit Test" onClick={onSubmit} />
              <button onClick={() => onModal(false)}
                className="w-full border border-[#EADFD3] py-3.5 rounded-2xl text-[15px] font-semibold text-[#8C8681]" style={JK}>
                Continue Test
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {showCalc && <ExamCalculator onClose={() => setShowCalc(false)} />}
        {showPad && (
          <SolvePad
            question={q.question}
            options={q.options}
            selected={answers[currentQ]}
            onSelect={(i) => onAnswer(currentQ, i)}
            onClose={() => setShowPad(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ResultsScreen({ questions, score, timeTaken, answers, nav }: {
  questions: Q[]; score: number; timeTaken: number; answers: (number | null)[]; nav: (s: Screen) => void;
}) {
  const total = questions.length;
  const percent = pct(score, total);
  const color = sColor(percent);
  const circumference = 2 * Math.PI * 52;
  const dash = (percent / 100) * circumference;

  return (
    <div className="h-full flex flex-col bg-[#FAF6F0]">
      <div className="px-5 pt-2 pb-3 bg-white border-b border-[#EADFD3] flex items-center gap-3">
        <BackBtn onPress={() => nav("home")} />
        <h2 className="text-[16px] font-bold text-[#2E2A27]" style={JK}>Test Results</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {/* Score circle */}
        <div className="bg-white rounded-3xl border border-[#EADFD3] p-6 flex flex-col items-center">
          <svg width="144" height="144" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#F1F5F9" strokeWidth="10" />
            <circle cx="60" cy="60" r="52" fill="none" stroke={color} strokeWidth="10"
              strokeDasharray={`${dash} ${circumference}`} strokeLinecap="round"
              transform="rotate(-90 60 60)" style={{ transition: "stroke-dasharray 1s ease" }} />
            <text x="60" y="53" textAnchor="middle" fill="#2E2A27" fontSize="24" fontWeight="800" fontFamily="Lora, sans-serif">{percent}%</text>
            <text x="60" y="69" textAnchor="middle" fill="#94A3B8" fontSize="12" fontFamily="Outfit, sans-serif">{score} / {total}</text>
          </svg>
          <span className="text-[13px] font-bold px-4 py-1.5 rounded-full mt-3" style={{ background: color + "1A", color }}>
            {sLabel(percent)}
          </span>
          <p className="text-[14px] text-[#8C8681] mt-2 text-center" style={INTER}>
            {percent >= 70 ? "Great performance! Keep it up." : percent >= 50 ? "Good effort. Review your weak areas." : "Keep practicing — you'll improve!"}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: "Correct", val: String(score), bg: "#DCFCE7", fg: "#15803D" },
            { label: "Wrong", val: String(total - score), bg: "#FEE2E2", fg: "#EF4444" },
            { label: "Time", val: fmt(timeTaken), bg: "#F5E8E7", fg: "#E67468" },
          ].map(({ label, val, bg, fg }) => (
            <div key={label} className="bg-white rounded-2xl border border-[#EADFD3] p-3 text-center">
              <div className="w-10 h-10 rounded-xl mx-auto mb-1.5 flex items-center justify-center" style={{ background: bg }}>
                <span className="text-[14px] font-black" style={{ color: fg, ...MONO }}>{val}</span>
              </div>
              <p className="text-[11px] text-[#94A3B8] font-medium">{label}</p>
            </div>
          ))}
        </div>

        {/* Subject breakdown */}
        <div className="bg-white rounded-2xl border border-[#EADFD3] p-4">
          <h3 className="text-[14px] font-bold text-[#2E2A27] mb-3" style={JK}>By Subject</h3>
          {Array.from(new Set(questions.map(q => q.subject))).map(subject => {
            const qs = questions.filter(q => q.subject === subject);
            const correct = qs.filter(q => answers[questions.indexOf(q)] === q.correct).length;
            const p = pct(correct, qs.length);
            return (
              <div key={subject} className="flex items-center gap-3 py-2 border-b border-[#F1F5F9] last:border-0">
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-[12px] font-semibold text-[#374151]" style={INTER}>{subject}</span>
                    <span className="text-[12px] font-bold" style={{ color: sColor(p), ...MONO }}>{correct}/{qs.length}</span>
                  </div>
                  <div className="h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${p}%`, background: sColor(p) }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="space-y-2.5">
          <button onClick={() => nav("review-answers")}
            className="w-full border border-[#E67468] text-[#E67468] py-4 rounded-2xl text-[15px] font-bold flex items-center justify-center gap-2" style={JK}>
            <Eye size={18} /> Review Answers
          </button>
          <button onClick={() => nav("exam")}
            className="w-full bg-[#E67468] text-white py-4 rounded-2xl text-[15px] font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20" style={JK}>
            <RotateCcw size={18} /> Retake Test
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewAnswersScreen({ questions, answers, nav }: { questions: Q[]; answers: (number | null)[]; nav: (s: Screen) => void }) {
  return (
    <div className="h-full flex flex-col bg-[#FAF6F0]">
      <div className="px-5 pt-2 pb-3 bg-white border-b border-[#EADFD3] flex items-center gap-3">
        <BackBtn onPress={() => nav("results")} />
        <div>
          <h2 className="text-[16px] font-bold text-[#2E2A27]" style={JK}>Review Answers</h2>
          <p className="text-[12px] text-[#8C8681]" style={INTER}>{questions.length} questions</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {questions.map((q, i) => {
          const ua = answers[i];
          const correct = ua === q.correct;
          const skipped = ua === null;
          return (
            <div key={q.id} className="bg-white rounded-2xl border border-[#EADFD3] overflow-hidden">
              <div className="px-4 pt-4 pb-2 flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-[11px] text-[#94A3B8] font-semibold">Q{i + 1}</span>
                    <span className="text-[10px] text-[#8C8681] px-2 py-0.5 bg-[#FAF6F0] rounded-full border border-[#EADFD3]">{q.subject}</span>
                  </div>
                  <p className="text-[13px] text-[#2E2A27] font-medium leading-snug" style={INTER}>{q.question}</p>
                </div>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${skipped ? "bg-[#F1F5F9]" : correct ? "bg-[#DCFCE7]" : "bg-[#FEE2E2]"}`}>
                  {skipped ? <span className="text-[10px] text-[#94A3B8] font-bold">–</span>
                    : correct ? <Check size={13} color="#15803D" strokeWidth={2.5} />
                      : <X size={13} color="#991B1B" strokeWidth={2.5} />}
                </div>
              </div>

              <div className="px-4 pb-2 space-y-1.5">
                {q.options.map((opt, j) => {
                  const isUser = ua === j;
                  const isRight = q.correct === j;
                  const bg = isRight ? "#DCFCE7" : isUser ? "#FEE2E2" : "transparent";
                  const bd = isRight ? "#86EFAC" : isUser ? "#FCA5A5" : "#F1F5F9";
                  const fg = isRight ? "#15803D" : isUser ? "#991B1B" : "#8C8681";
                  return (
                    <div key={j} className="flex items-center gap-2.5 p-2.5 rounded-xl border"
                      style={{ background: bg, borderColor: bd }}>
                      <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                        style={{ background: isRight ? "#22C55E" : isUser ? "#EF4444" : "#FAF6F0", color: (isRight || isUser) ? "white" : "#94A3B8", ...JK }}>
                        {String.fromCharCode(65 + j)}
                      </span>
                      <p className="text-[12px] leading-snug flex-1" style={{ color: fg, ...INTER }}>{opt}</p>
                      {isRight && <Check size={12} color="#15803D" strokeWidth={2.5} />}
                      {isUser && !isRight && <X size={12} color="#991B1B" strokeWidth={2.5} />}
                    </div>
                  );
                })}
              </div>

              <div className="mx-4 mb-4 p-3 bg-[#FFFBEB] rounded-xl border border-[#FDE68A]">
                <p className="text-[10px] font-bold text-[#92400E] mb-1 uppercase tracking-wide">Explanation</p>
                <p className="text-[12px] text-[#78350F] leading-relaxed" style={INTER}>{q.explanation}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
                <p className="mt-0.5 text-[12px] text-[#8C8681]" style={INTER}>Adjust your study plan and goals</p>
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

          <p className="text-center text-[11px] text-[#CBD5E1]" style={INTER}>PastQ v1.0.0 · Built for Nigerian students</p>
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
          <BackBtn onPress={() => nav("preference")} />
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

function StudyPreferencesScreen({ nav }: { nav: (s: Screen) => void }) {
  const [focus, setFocus] = useState("JAMB / UTME");
  const [time, setTime] = useState("1-2");

  return (
    <div className="h-full flex flex-col bg-[#FAF6F0]">
      <div className="px-5 pt-2 flex items-center gap-3 border-b border-[#EADFD3] bg-white py-3">
        <BackBtn onPress={() => nav("preference")} />
        <div>
          <h2 className="text-[16px] font-bold text-[#2E2A27]" style={JK}>Study Preferences</h2>
          <p className="text-[12px] text-[#8C8681]" style={INTER}>Set your study plan</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
        <div className="space-y-3">
          <h3 className="text-[14px] font-bold text-[#2E2A27]" style={JK}>Exam Focus</h3>
          {["JAMB / UTME", "Post-UTME", "WAEC / NECO"].map(opt => {
            const active = focus === opt;
            return (
              <button key={opt} onClick={() => setFocus(opt)}
                className="w-full p-4 rounded-2xl border-[1.5px] flex items-center justify-between transition-all"
                style={{ background: active ? "#F5E8E7" : "white", borderColor: active ? "#E67468" : "#EADFD3" }}>
                <span className="text-[14px] font-semibold text-[#2E2A27]" style={JK}>{opt}</span>
                <div className="w-5 h-5 rounded-full flex items-center justify-center transition-all"
                  style={{ background: active ? "#E67468" : "#F1F5F9", border: active ? "none" : "1.5px solid #EADFD3" }}>
                  {active && <Check size={10} color="white" strokeWidth={3} />}
                </div>
              </button>
            )
          })}
        </div>
        <div className="space-y-3">
          <h3 className="text-[14px] font-bold text-[#2E2A27]" style={JK}>Daily Study Goal</h3>
          {[
            { id: "lt1", label: "Less than 1 hour", sub: "Short daily bursts" },
            { id: "1-2", label: "1–2 hours", sub: "Consistent practice" },
            { id: "3-4", label: "3–4 hours", sub: "Deep study sessions" }
          ].map(({ id, label, sub }) => {
            const active = time === id;
            return (
              <button key={id} onClick={() => setTime(id)}
                className="w-full p-4 rounded-2xl border-[1.5px] text-left transition-all"
                style={{ background: active ? "#F5E8E7" : "white", borderColor: active ? "#E67468" : "#EADFD3" }}>
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-semibold text-[#2E2A27]" style={JK}>{label}</span>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center transition-all"
                    style={{ background: active ? "#E67468" : "#F1F5F9", border: active ? "none" : "1.5px solid #EADFD3" }}>
                    {active && <Check size={10} color="white" strokeWidth={3} />}
                  </div>
                </div>
                <p className="mt-1 text-[12px] text-[#8C8681]" style={INTER}>{sub}</p>
              </button>
            )
          })}
        </div>
      </div>
    </div>
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
        <BackBtn onPress={() => nav("preference")} />
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
        <BackBtn onPress={() => nav("preference")} />
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
        <BackBtn onPress={() => nav(backTo)} />
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
  { id: "jamb", label: "JAMB / UTME", icon: "🎯" },
  { id: "post-utme", label: "Post-UTME", icon: "🏛️" },
  { id: "waec", label: "WAEC / NECO", icon: "📋" },
  { id: "university", label: "University exams", icon: "🎓" },
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
        <BackBtn onPress={() => nav("splash")} />
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
        <BackBtn onPress={() => nav("onboard-2")} />
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
  const [screen, setScreen] = useState<Screen>("splash");
  const [navTab, setNavTab] = useState<NavTab>("home");
  const [activeQuestions, setActiveQuestions] = useState<Q[]>(DEMO_QUESTIONS);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(DEMO_QUESTIONS.length).fill(null));
  const [flagged, setFlagged] = useState<boolean[]>(Array(DEMO_QUESTIONS.length).fill(false));
  const [currentQ, setCurrentQ] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const [examDuration, setExamDuration] = useState(30 * 60);
  const [visionSessionId, setVisionSessionId] = useState<string | null>(null);

  const [score, setScore] = useState(0);
  const [timeTaken, setTimeTaken] = useState(0);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userAvatar, setUserAvatar] = useState("");
  const [userId, setUserId] = useState("");
  const [sessions, setSessions] = useState<any[]>([]);
  const [offlineLibrary, setOfflineLibrary] = useState<any[]>([]);
  const [globalLibrary, setGlobalLibrary] = useState<any[]>([]);

  const loadQuestions = (qs: Q[], nextScreen: Screen = "exam") => {
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
        // Fetch global library from Supabase (silently fail if table missing)
        try {
          const globalLib = await getGlobalLibrary();
          setGlobalLibrary(globalLib || []);
        } catch {}
      } else {
        setSessions([]);
        setOfflineLibrary([]);
        setGlobalLibrary([]);
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
      setAnswers(Array(activeQuestions.length).fill(null));
      setFlagged(Array(activeQuestions.length).fill(false));
      setCurrentQ(0);
      setShowModal(false);
    }
    if (s === "home") setNavTab("home");
    if (s === "preference") setNavTab("preference");
    setScreen(s);
  };

  const handleNavTab = (t: NavTab) => {
    setNavTab(t);
    if (t === "preference") setScreen("preference");
    else setScreen("home");
  };

  // Timer
  useEffect(() => {
    if (screen !== "exam" || timeLeft <= 0) return;
    const id = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [screen, timeLeft]);

  useEffect(() => {
    if (screen === "exam" && timeLeft === 0) handleSubmit();
  }, [timeLeft]);


  const handleSubmit = async () => {
    const s = activeQuestions.filter((q, i) => q.correct != null && answers[i] === q.correct).length;
    setScore(s);
    setTimeTaken(examDuration - timeLeft);
    setShowModal(false);
    setScreen("results");
    // Save to Supabase if user is logged in
    if (userId) {
      try {
        await saveExamSession({
          user_id: userId,
          title: "CBT Session",
          score: s,
          total_questions: activeQuestions.length,
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
      case "splash": return <SplashScreen nav={nav} />;
      case "signup": return <SignUpScreen nav={nav} />;
      case "login": return <LoginScreen nav={nav} />;
      case "forgot-password": return <ForgotScreen nav={nav} />;
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
          onOpenBundle={openBundle}
          onDownloadBundle={handleDownloadBundle}
        />
      );
      case "snap": return <SnapScreen nav={nav} onSessionStarted={(id) => setVisionSessionId(id)} />;
      case "manual-entry": return <ManualEntryScreen nav={nav} onSessionStarted={(id) => setVisionSessionId(id)} />;
      case "processing": return (
        <ProcessingScreen
          nav={nav}
          sessionId={visionSessionId}
          onQuestionsReady={async (qs) => {
            await refreshOfflineLibrary();
            loadQuestions(qs as Q[], "review-questions");
          }}
        />
      );
      case "review-questions": return (
        <ReviewQuestionsScreen
          nav={nav}
          questions={activeQuestions}
          onUpdateQuestions={setActiveQuestions}
          onStartTest={(duration, selected) => {
            const ordered = sortQuestions(selected && selected.length ? selected : activeQuestions);
            setActiveQuestions(ordered);
            setAnswers(Array(ordered.length).fill(null));
            setFlagged(Array(ordered.length).fill(false));
            setCurrentQ(0);
            setExamDuration(duration);
            setTimeLeft(duration);
            nav("exam");
          }}
        />
      );
      case "exam": return (
        <ExamScreen
          questions={activeQuestions}
          answers={answers} onAnswer={handleAnswer}
          flagged={flagged} onFlag={handleFlag}
          currentQ={currentQ} onQ={setCurrentQ}
          timeLeft={timeLeft}
          showModal={showModal} onModal={setShowModal}
          onSubmit={handleSubmit} nav={nav}
        />
      );
      case "results": return <ResultsScreen questions={activeQuestions} score={score} timeTaken={timeTaken} answers={answers} nav={nav} />;
      case "review-answers": return <ReviewAnswersScreen questions={activeQuestions} answers={answers} nav={nav} />;
      case "preference": return <ProfileScreen nav={nav} tab={navTab} onTab={handleNavTab} userName={userName} userEmail={userEmail} userAvatar={userAvatar} sessions={sessions} />;
      case "profile-edit": return <EditProfileScreen nav={nav} userName={userName} setUserName={setUserName} userEmail={userEmail} userAvatar={userAvatar} />;
      case "settings-preferences": return <StudyPreferencesScreen nav={nav} />;
      case "settings-reminders": return <ExamRemindersScreen nav={nav} />;
      case "settings-notifications": return <PlaceholderScreen title="Notifications" subtitle="Control app alerts" nav={nav} backTo="preference" />;
      case "about": return <AboutScreen nav={nav} />;
      case "support": return <PlaceholderScreen title="Help & Support" subtitle="Get help anytime" nav={nav} backTo="preference" />;
      default: return null;
    }
  };

  return (
    <div className="h-screen w-full"
      style={{ background: "linear-gradient(160deg, #1a2f5a 0%, #0f1f42 50%, #111827 100%)" }}>
      <div className="h-screen w-full overflow-hidden bg-[#0F172A]">
        {renderScreen()}
      </div>
    </div>
  );
}
