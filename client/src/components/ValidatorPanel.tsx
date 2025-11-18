import { Card } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

export interface ValidationResult {
  type: "success" | "warning" | "info";
  message: string;
}

interface ValidatorPanelProps {
  results: ValidationResult[];
}

export function ValidatorPanel({ results }: ValidatorPanelProps) {
  if (results.length === 0) return null;

  return (
    <Card className="w-full max-w-5xl mx-auto p-6">
      <h3 className="text-lg font-semibold mb-4">Validation Results</h3>
      <div className="space-y-3">
        {results.map((result, index) => {
          const Icon = result.type === "success" 
            ? CheckCircle2 
            : result.type === "warning" 
            ? AlertCircle 
            : Info;
          
          const colorClass = result.type === "success"
            ? "text-chart-2"
            : result.type === "warning"
            ? "text-chart-3"
            : "text-muted-foreground";

          return (
            <div
              key={index}
              className="flex items-start gap-3 text-sm"
              data-testid={`validation-${result.type}-${index}`}
            >
              <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${colorClass}`} />
              <span>{result.message}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
