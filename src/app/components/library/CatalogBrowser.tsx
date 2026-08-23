import { ChevronRight, BookOpen } from "lucide-react";
import type { CatalogExamType, CatalogManufacturer, CatalogUniversity } from "../../services/libraryService";

const JK = { fontFamily: "'Josefin Sans', sans-serif" };
const INTER = { fontFamily: "'Inter', sans-serif" };

interface CatalogBrowserProps {
  catalog: { universities: CatalogUniversity[] };
  onSelectManufacturer: (mfg: CatalogManufacturer, exam: CatalogExamType, uni: CatalogUniversity) => void;
  onFlatBrowse?: () => void;
}

export function CatalogBrowser({ catalog, onSelectManufacturer, onFlatBrowse }: CatalogBrowserProps) {
  const universities = catalog?.universities || [];

  if (!universities.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <BookOpen size={32} className="text-[#94A3B8] mb-3" />
        <p className="text-[15px] font-semibold text-[#2E2A27]" style={JK}>No catalog yet</p>
        <p className="text-[12px] text-[#8C8681] mt-1" style={INTER}>
          Upload past questions — AI will organize them by university and manufacturer.
        </p>
        {onFlatBrowse && (
          <button onClick={onFlatBrowse} className="mt-4 text-[13px] font-semibold text-[#E67468]" style={JK}>
            Browse all downloads
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {universities.map((uni) => (
        <div key={uni.id} className="bg-white rounded-2xl border border-[#EADFD3] overflow-hidden">
          <div className="px-4 py-3 bg-[#FAF6F0] border-b border-[#EADFD3]">
            <p className="text-[14px] font-bold text-[#2E2A27]" style={JK}>{uni.name}</p>
            <p className="text-[11px] text-[#8C8681]" style={INTER}>
              {(uni.examTypes || []).length} exam type{(uni.examTypes || []).length !== 1 ? "s" : ""}
            </p>
          </div>
          {(uni.examTypes || []).map((exam) => (
            <div key={exam.id} className="border-b border-[#EADFD3] last:border-b-0">
              <div className="px-4 py-2 bg-white">
                <p className="text-[12px] font-semibold text-[#7A6CB2]" style={JK}>{exam.name}</p>
              </div>
              <div className="px-3 pb-3 space-y-2">
                {(exam.manufacturers || []).map((mfg) => (
                  <ManufacturerRow
                    key={mfg.id}
                    mfg={mfg}
                    onClick={() => onSelectManufacturer(mfg, exam, uni)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ManufacturerRow({ mfg, onClick }: { mfg: CatalogManufacturer; onClick: () => void }) {
  const yearLabel =
    mfg.yearMin && mfg.yearMax
      ? mfg.yearMin === mfg.yearMax
        ? String(mfg.yearMin)
        : `${mfg.yearMin}–${mfg.yearMax}`
      : null;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-[#FAF6F0] border border-[#EADFD3] active:scale-[0.98] transition-transform text-left"
    >
      <div className="w-10 h-10 rounded-lg bg-[#F5E8E7] flex items-center justify-center text-lg flex-shrink-0">
        📚
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[#2E2A27] truncate" style={JK}>{mfg.name}</p>
        <p className="text-[11px] text-[#8C8681]" style={INTER}>
          {mfg.questionCount ?? 0} questions
          {yearLabel ? ` · ${yearLabel}` : ""}
          {mfg.subjects?.length ? ` · ${mfg.subjects.length} subjects` : ""}
        </p>
      </div>
      <ChevronRight size={16} className="text-[#94A3B8] flex-shrink-0" />
    </button>
  );
}
