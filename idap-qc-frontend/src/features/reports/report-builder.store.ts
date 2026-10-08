import { create } from "zustand";
import type { ReportSection, SectionType } from "@/types/domain";

interface ReportBuilderState {
  sections: ReportSection[];
  addSection: (type: SectionType) => void;
  toggleIssue: (sectionId: string, issueId: string) => void;
  moveIssue: (sectionId: string, issueId: string, direction: -1 | 1) => void;
  reset: (sections: ReportSection[]) => void;
}

export const useReportBuilderStore = create<ReportBuilderState>((set) => ({
  sections: [],
  addSection: (type) =>
    set((state) => ({
      sections: [
        ...state.sections,
        {
          id: crypto.randomUUID(),
          type,
          heading: type === "CRITICAL" ? "Critical Observations" : "General Observations",
          issueIds: [],
        },
      ],
    })),
  toggleIssue: (sectionId, issueId) =>
    set((state) => ({
      sections: state.sections.map((section) =>
        section.id !== sectionId
          ? section
          : {
              ...section,
              issueIds: section.issueIds.includes(issueId)
                ? section.issueIds.filter((id) => id !== issueId)
                : [...section.issueIds, issueId],
            },
      ),
    })),
  moveIssue: (sectionId, issueId, direction) =>
    set((state) => ({
      sections: state.sections.map((section) => {
        if (section.id !== sectionId) return section;
        const from = section.issueIds.indexOf(issueId);
        const to = from + direction;
        if (from < 0 || to < 0 || to >= section.issueIds.length) return section;
        const issueIds = [...section.issueIds];
        [issueIds[from], issueIds[to]] = [issueIds[to], issueIds[from]];
        return { ...section, issueIds };
      }),
    })),
  reset: (sections) => set({ sections }),
}));
