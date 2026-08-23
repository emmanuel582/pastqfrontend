import { describe, it, expect } from "vitest";
import {
  filterCbtQuestions,
  getAvailableSubjects,
  getAvailableYears,
  getDefaultSelectedSubjects,
  getQuestionCountBySubject,
  isJambStyleExam,
  yearRangeLabel,
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

  it("detects JAMB-style exams", () => {
    expect(isJambStyleExam("JAMB UTME")).toBe(true);
    expect(isJambStyleExam("UI Post UTME")).toBe(false);
  });

  it("formats year range label", () => {
    expect(yearRangeLabel(["2020", "2021", "2022"])).toBe("2020–2022");
    expect(yearRangeLabel(["2019"])).toBe("2019");
  });

  it("auto-selects single subject bundles", () => {
    const biologyOnly = questions.filter((q) => q.subject === "Biology");
    expect(getDefaultSelectedSubjects({ questions: biologyOnly })).toEqual(["Biology"]);
  });

  it("selects all subjects for non-JAMB multi-subject bundles", () => {
    expect(getDefaultSelectedSubjects({ questions, examType: "Post UTME" }).sort()).toEqual(
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
});
