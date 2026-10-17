import { describe, it, expect } from "vitest";
import {
  filterCbtQuestions,
  getAvailableSubjects,
  getAvailableYears,
  getDefaultSelectedSubjects,
  getQuestionCountBySubject,
  yearRangeLabel,
  selectSessionQuestions,
  getQuestionCountByYear,
} from "./cbtFilters";

describe("cbtFilters", () => {
  const questions = [
    { id: 1, subject: "Mathematics", question: "Q1", options: ["A", "B"], year: "2020" },
    { id: 2, subject: "Mathematics", question: "Q2", options: ["A", "B"], year: "2021" },
    { id: 3, subject: "Biology", question: "Q3", options: ["A", "B"], year: "2020" },
    { id: 4, subject: "Biology", question: "Q4", options: ["A", "B"], year: "2022" },
    { id: 5, subject: "Use of English", question: "Q5", options: ["A", "B"], year: "2021" },
  ];

  it("filters by multiple subjects with global year set", () => {
    const filtered = filterCbtQuestions(questions, ["Mathematics", "Biology"], ["2020"]);
    expect(filtered).toHaveLength(2);
    expect(filtered.every((q) => q.year === "2020")).toBe(true);
    expect(filtered.map((q) => q.subject).sort()).toEqual(["Biology", "Mathematics"]);
  });

  it("applies same years to all selected subjects", () => {
    const filtered = filterCbtQuestions(questions, ["Mathematics", "Biology", "Use of English"], ["2021"]);
    expect(filtered).toHaveLength(2);
    expect(filtered.filter((q) => q.subject === "Mathematics")).toHaveLength(1);
    expect(filtered.filter((q) => q.subject === "Biology")).toHaveLength(0);
    expect(filtered.filter((q) => q.subject === "Use of English")).toHaveLength(1);
  });

  it("returns all when no filters", () => {
    expect(filterCbtQuestions(questions, [], [])).toHaveLength(5);
  });

  it("lists available subjects and years", () => {
    expect(getAvailableSubjects({ questions })).toContain("Mathematics");
    expect(getAvailableYears(questions)).toEqual(["2022", "2021", "2020"]);
  });

  it("scopes years to selected subjects", () => {
    expect(getAvailableYears(questions, ["Biology"])).toEqual(["2022", "2020"]);
    expect(getAvailableYears(questions, ["Mathematics"])).toEqual(["2021", "2020"]);
  });

  it("filters single-subject bundle by multiple years", () => {
    const biologyOnly = questions.filter((q) => q.subject === "Biology");
    const filtered = filterCbtQuestions(biologyOnly, ["Biology"], ["2020", "2022"]);
    expect(filtered).toHaveLength(2);
    expect(filtered.map((q) => q.year).sort()).toEqual(["2020", "2022"]);
  });

  it("formats year range label", () => {
    expect(yearRangeLabel(["2020", "2021", "2022"])).toBe("2020–2022");
    expect(yearRangeLabel(["2019"])).toBe("2019");
  });

  it("auto-selects single subject bundles", () => {
    const biologyOnly = questions.filter((q) => q.subject === "Biology");
    expect(getDefaultSelectedSubjects({ questions: biologyOnly })).toEqual(["Biology"]);
  });

  it("selects all subjects by default", () => {
    expect(getDefaultSelectedSubjects({ questions }).sort()).toEqual(
      ["Biology", "Mathematics", "Use of English"].sort()
    );
  });

  it("counts questions per subject", () => {
    expect(getQuestionCountBySubject(questions)).toEqual({
      Mathematics: 2,
      Biology: 2,
      "Use of English": 1,
    });
  });

  it('keeps model papers in their calendar year and includes original written questions', () => {
    const pool = [
      { id: 1, subject: 'Physics', year: '2025', question: 'Past paper', options: ['a', 'b'] },
      { id: 2, subject: 'Physics', year: '2025 Model I', question: 'Model paper', options: ['a', 'b'] },
      { id: 3, subject: 'Use of English', year: '2024 Model II', question: 'English', options: ['a', 'b'] },
      { id: 4, subject: 'Physics', year: null, sourceBank: 'lecture', type: 'short_answer', question: 'Name the unit', options: ['Newton'], answerText: 'Newton' },
    ];
    expect(getAvailableYears(pool)).toEqual(['2025', '2024', 'Topic practice']);
    expect(getQuestionCountByYear(pool, ['Physics'])).toEqual({ '2025': 2, 'Topic practice': 1 });
    expect(selectSessionQuestions(pool, { subjects: ['Physics', 'Use of English'], years: null, topics: null })).toHaveLength(4);
    expect(selectSessionQuestions(pool, { subjects: ['Physics'], years: ['2025'], topics: null }).map(q => q.id)).toEqual([1, 2]);
    expect(selectSessionQuestions(pool, { subjects: ['Physics'], years: ['Topic practice'], topics: null }).map(q => q.id)).toEqual([4]);
    expect(selectSessionQuestions(pool, { subjects: ['Physics'], years: [], topics: null })).toHaveLength(0);
  });
});
