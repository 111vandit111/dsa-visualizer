import { CaseResults } from "@/components/shared/case-results";
import { MarkdownView } from "@/components/shared/markdown-view";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { RunReport, TestCase } from "@/lib/tracer/types";

interface CaseTabsProps {
  description: string;
  testCases: TestCase[];
  report: RunReport | null;
  isRunning: boolean;
  selectedIndex: number;
  onSelect: (index: number) => void;
}

/** Left zone: the problem statement, and the test cases with pass/fail where one is picked to trace. */
export function CaseTabs({ description, testCases, report, isRunning, selectedIndex, onSelect }: CaseTabsProps) {
  return (
    <Tabs defaultValue="cases" className="gap-3">
      <TabsList className="w-full">
        <TabsTrigger value="description" data-testid="tab-description">
          Description
        </TabsTrigger>
        <TabsTrigger value="cases" data-testid="tab-cases">
          Cases
        </TabsTrigger>
      </TabsList>
      <TabsContent value="description">
        {description.trim() === "" ? (
          <p className="text-sm text-muted-foreground">This question has no description.</p>
        ) : (
          <MarkdownView markdown={description} />
        )}
      </TabsContent>
      <TabsContent value="cases">
        <CaseResults testCases={testCases} report={report} isRunning={isRunning} selectedIndex={selectedIndex} onSelect={onSelect} />
      </TabsContent>
    </Tabs>
  );
}
