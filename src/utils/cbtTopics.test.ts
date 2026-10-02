import { describe, it, expect } from "vitest";
import { filterByTopics, getAvailableTopics, getQuestionCountByTopic, topicOf } from "./cbtFilters";

describe("cbt topic filters", () => {
  // A topic-ordered book: topics in source order, years mixed inside topics.
  const questions = [
    { subject: "Biology", question: "Q1", options: ["A", "B"], topic: "Cell Biology", year: "2015" },
    { subject: "Biology", question: "Q2", options: ["A", "B"], topic: "Cell Biology", year: "2019" },
    { subject: "Biology", question: "Q3", options: ["A", "B"], section: "Genetics" },
    { subject: "Biology", question: "Q4", options: ["A", "B"], topic: "Ecology", year: "2015" },
    { subject: "Chemistry", question: "Q5", options: ["A", "B"], topic: "Atoms" },
  ];

  it("keeps the document's topic order instead of sorting", () => {
    expect(getAvailableTopics(questions, ["Biology"])).toEqual(["Cell Biology", "Genetics", "Ecology"]);
  });

  it("falls back to the section title when no topic is set", () => {
    expect(topicOf(questions[2])).toBe("Genetics");
  });

  it("counts and filters by topic", () => {
    expect(getQuestionCountByTopic(questions, ["Biology"])["Cell Biology"]).toBe(2);
    expect(filterByTopics(questions, ["Genetics", "Ecology"]).map((q) => q.question)).toEqual(["Q3", "Q4"]);
    expect(filterByTopics(questions, [])).toHaveLength(5);
  });
});
