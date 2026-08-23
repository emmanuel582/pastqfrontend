import { useMemo, useState } from "react";
import { Calendar, X, Check, Plus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  filterCbtQuestions,
  getAvailableSubjects,
  getAvailableYears,
  getDefaultSelectedSubjects,
  getQuestionCountBySubject,
  isEnglishSubject,
  isJambStyleExam,
  yearRangeLabel,
  type CbtQuestion,
} from "../../../utils/cbtFilters";

const JK = { fontFamily: "'Josefin Sans', sans-serif" };
const INTER = { fontFamily: "'Inter', sans-serif" };

export interface CustomizeCbtBundle {
  id: string;
  title?: string;
  name?: string;
  examType?: string;
  university?: string;
  manufacturer?: string;
  questions: CbtQuestion[];
}

interface CustomizeCbtScreenProps {
  bundle: CustomizeCbtBundle;
  onBack: () => void;
  onProceed: (opts: {
    questions: CbtQuestion[];
    durationSeconds: number;
    mode: "practice" | "full";
    subjects: string[];
    years: string[];
  }) => void;
}

export function CustomizeCbtScreen({ bundle, onBack, onProceed }: CustomizeCbtScreenProps) {
  const examType = bundle.examType || "";
  const jambStyle = isJambStyleExam(examType);
  const availableSubjects = useMemo(
    () => getAvailableSubjects(bundle, examType),
    [bundle, examType]
  );
  const allYears = useMemo(() => getAvailableYears(bundle.questions), [bundle.questions]);
  const countsBySubject = useMemo(
    () => getQuestionCountBySubject(bundle.questions),
    [bundle.questions]
  );

  const englishSubject = availableSubjects.find(isEnglishSubject);
  const singleSubject = availableSubjects.length === 1;

  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(() =>
    getDefaultSelectedSubjects(bundle, examType)
  );

  const [selectedYears, setSelectedYears] = useState<string[]>(() =>
    allYears.length ? [...allYears] : []
  );

  const [mode, setMode] = useState<"practice" | "full">("practice");
  const [showYearModal, setShowYearModal] = useState(false);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [draftYears, setDraftYears] = useState<string[]>([]);

  const durationSeconds = mode === "practice" ? 35 * 60 : 120 * 60;

  const filteredQuestions = useMemo(
    () => filterCbtQuestions(bundle.questions, selectedSubjects, selectedYears),
    [bundle.questions, selectedSubjects, selectedYears]
  );

  const toggleSubject = (subject: string) => {
    if (jambStyle && subject === englishSubject && selectedSubjects.includes(subject)) {
      return;
    }
    if (singleSubject) return;

    setSelectedSubjects((prev) => {
      if (prev.includes(subject)) {
        const next = prev.filter((s) => s !== subject);
        if (jambStyle && englishSubject && !next.includes(englishSubject)) {
          return [englishSubject, ...next];
        }
        return next.length ? next : prev;
      }
      return [...prev, subject];
    });
  };

  const selectAllSubjects = () => setSelectedSubjects([...availableSubjects]);

  const openYearModal = () => {
    setDraftYears([...selectedYears]);
    setShowYearModal(true);
  };

  const confirmYears = () => {
    setSelectedYears(draftYears.length ? draftYears : allYears);
    setShowYearModal(false);
  };

  const canProceed = selectedSubjects.length > 0 && filteredQuestions.length > 0;

  const subjectHint = singleSubject
    ? `This bundle only has ${availableSubjects[0]} — all ${countsBySubject[availableSubjects[0]] ?? 0} questions included.`
    : jambStyle
      ? "Pick any subjects you want. English stays selected for JAMB-style exams."
      : "Pick one or more subjects — no limit. Years apply to all selected subjects together.";

  return (
    <div className="h-full flex flex-col bg-[#FAF6F0]">
      <div className="px-5 pt-2 pb-3 bg-white border-b border-[#EADFD3] flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-[#FAF6F0] flex items-center justify-center">
          <span className="text-[#2E2A27] text-lg">←</span>
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-[16px] font-bold text-[#2E2A27] truncate" style={JK}>Customize your CBT</h2>
          <p className="text-[11px] text-[#8C8681] truncate" style={INTER}>
            {bundle.manufacturer || bundle.title} · {bundle.university}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-2xl px-4 py-3">
          <p className="text-[12px] text-[#065F46] leading-relaxed" style={INTER}>{subjectHint}</p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[12px] font-semibold text-[#8C8681]" style={INTER}>
              {selectedSubjects.length} of {availableSubjects.length} subject{availableSubjects.length !== 1 ? "s" : ""} selected
            </p>
            {!singleSubject && availableSubjects.length > 1 && (
              <button
                onClick={selectAllSubjects}
                className="text-[11px] font-semibold text-[#E67468]"
                style={JK}
              >
                Select all
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {availableSubjects.map((subject) => {
              const selected = selectedSubjects.includes(subject);
              const locked = jambStyle && subject === englishSubject;
              const count = countsBySubject[subject] ?? 0;
              return (
                <button
                  key={subject}
                  onClick={() => !singleSubject && toggleSubject(subject)}
                  disabled={singleSubject}
                  className={`px-3 py-2 rounded-xl border text-left transition-colors ${
                    selected
                      ? "bg-[#E67468] text-white border-[#E67468]"
                      : "bg-white text-[#2E2A27] border-[#EADFD3]"
                  } ${singleSubject ? "opacity-100 cursor-default" : ""}`}
                >
                  <span className="text-[12px] font-semibold block" style={JK}>
                    {subject}
                    {locked && selected ? " · required" : ""}
                  </span>
                  <span className={`text-[10px] ${selected ? "text-white/80" : "text-[#8C8681]"}`} style={INTER}>
                    {count} Q
                  </span>
                </button>
              );
            })}
          </div>

          {!singleSubject && (
            <button
              onClick={() => setShowSubjectPicker(true)}
              className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-[#CBD5E1] text-[#8C8681] text-[12px] font-medium"
              style={INTER}
            >
              <Plus size={14} /> Browse all subjects
            </button>
          )}
        </div>

        <div>
          <p className="text-[12px] font-semibold text-[#8C8681] mb-2" style={INTER}>Test mode</p>
          <div className="flex gap-2">
            <button
              onClick={() => setMode("practice")}
              className={`flex-1 py-4 rounded-xl border text-center ${
                mode === "practice"
                  ? "bg-[#E67468] text-white border-[#E67468]"
                  : "bg-white text-[#2E2A27] border-[#EADFD3]"
              }`}
            >
              <p className="text-[13px] font-bold" style={JK}>Practice Mode</p>
              <p className="text-[11px] opacity-80" style={INTER}>35 Minutes</p>
            </button>
            <button
              onClick={() => setMode("full")}
              className={`flex-1 py-4 rounded-xl border text-center ${
                mode === "full"
                  ? "bg-[#7A6CB2] text-white border-[#7A6CB2]"
                  : "bg-white text-[#2E2A27] border-[#EADFD3]"
              }`}
            >
              <p className="text-[13px] font-bold" style={JK}>Full Test Mode</p>
              <p className="text-[11px] opacity-80" style={INTER}>120 Minutes</p>
            </button>
          </div>
        </div>

        <div>
          <p className="text-[12px] font-semibold text-[#8C8681] mb-2" style={INTER}>
            Exam years {allYears.length ? "(all subjects)" : "(none tagged — all questions included)"}
          </p>
          {allYears.length > 0 ? (
            <button
              onClick={openYearModal}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white border border-[#EADFD3]"
            >
              <span className="text-[13px] font-medium text-[#2E2A27]" style={JK}>
                {selectedYears.length === allYears.length || !selectedYears.length
                  ? "All Years"
                  : yearRangeLabel(selectedYears)}
              </span>
              <Calendar size={18} className="text-[#E67468]" />
            </button>
          ) : (
            <p className="text-[12px] text-[#8C8681] px-1" style={INTER}>
              No year tags on these questions — your full selection will be used.
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-[#EADFD3] p-4">
          <p className="text-[12px] font-semibold text-[#8C8681] mb-2" style={INTER}>Summary</p>
          <p className="text-[13px] text-[#2E2A27]" style={JK}>
            {filteredQuestions.length} questions · {mode === "practice" ? "35" : "120"} min
          </p>
          <p className="text-[11px] text-[#8C8681] mt-1" style={INTER}>
            Subjects: {selectedSubjects.join(", ") || "None"}
          </p>
        </div>
      </div>

      <div className="px-5 py-4 bg-white border-t border-[#EADFD3]">
        <button
          disabled={!canProceed}
          onClick={() =>
            onProceed({
              questions: filteredQuestions,
              durationSeconds,
              mode,
              subjects: selectedSubjects,
              years: selectedYears,
            })
          }
          className={`w-full py-3.5 rounded-2xl text-[15px] font-bold ${
            canProceed ? "bg-[#E67468] text-white" : "bg-[#EADFD3] text-[#8C8681]"
          }`}
          style={JK}
        >
          Proceed to Test ({filteredQuestions.length} Q)
        </button>
      </div>

      <AnimatePresence>
        {showSubjectPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/40 flex items-end"
            onClick={() => setShowSubjectPicker(false)}
          >
            <motion.div
              initial={{ y: 40 }}
              animate={{ y: 0 }}
              exit={{ y: 40 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-h-[70%] bg-white rounded-t-3xl p-5 overflow-y-auto"
            >
              <h3 className="text-[16px] font-bold mb-1" style={JK}>Subjects in this bundle</h3>
              <p className="text-[11px] text-[#8C8681] mb-3" style={INTER}>Tap to toggle — pick as many as you want</p>
              <div className="space-y-2">
                {availableSubjects.map((s) => {
                  const selected = selectedSubjects.includes(s);
                  const locked = jambStyle && s === englishSubject;
                  return (
                    <button
                      key={s}
                      onClick={() => toggleSubject(s)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border ${
                        selected ? "border-[#E67468] bg-[#F5E8E7]" : "border-[#EADFD3]"
                      }`}
                    >
                      <span className="text-[14px] font-medium" style={JK}>
                        {s}{locked ? " (required)" : ""}
                      </span>
                      <span className="text-[11px] text-[#8C8681]" style={INTER}>
                        {countsBySubject[s] ?? 0} Q
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showYearModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/40 flex items-center justify-center p-6"
            onClick={() => setShowYearModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white rounded-2xl p-5 max-h-[80%] flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[16px] font-bold" style={JK}>Select Years</h3>
                <button onClick={() => setShowYearModal(false)}>
                  <X size={18} />
                </button>
              </div>
              <p className="text-[11px] text-[#8C8681] mb-3" style={INTER}>
                Applies to all selected subjects
              </p>
              <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                {allYears.map((y) => {
                  const checked = draftYears.includes(y);
                  return (
                    <button
                      key={y}
                      onClick={() =>
                        setDraftYears((prev) =>
                          checked ? prev.filter((x) => x !== y) : [...prev, y]
                        )
                      }
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#FAF6F0]"
                    >
                      <div
                        className={`w-5 h-5 rounded border flex items-center justify-center ${
                          checked ? "bg-[#E67468] border-[#E67468]" : "border-[#CBD5E1]"
                        }`}
                      >
                        {checked && <Check size={12} className="text-white" />}
                      </div>
                      <span className="text-[14px]" style={INTER}>{y}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowYearModal(false)} className="text-[#E67468] font-semibold text-[13px]" style={JK}>
                  CANCEL
                </button>
                <button onClick={confirmYears} className="text-[#E67468] font-bold text-[13px]" style={JK}>
                  OK
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
