import { Card } from "@/components/ui/card";
import type { OutputMode } from "./ModeSelector";

interface PromptOutputProps {
  content: string;
  mode: OutputMode;
}

export function PromptOutput({ content, mode }: PromptOutputProps) {
  return (
    <Card className="w-full max-w-5xl mx-auto p-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Generated Output</h2>
          <div className="text-sm text-muted-foreground">
            {mode === "template" && "Prompt Template"}
            {mode === "agent" && "Prompt Engineer Agent"}
            {mode === "blueprint" && "Media Prompt Blueprint"}
          </div>
        </div>
        
        <div 
          className="font-mono text-sm leading-relaxed max-h-96 overflow-y-auto p-4 rounded-md bg-muted/30 border-l-4 border-primary"
          data-testid="text-prompt-output"
        >
          {content}
        </div>
      </div>
    </Card>
  );
}
