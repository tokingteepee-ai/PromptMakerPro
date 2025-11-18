import { Button } from "@/components/ui/button";
import { Copy, Pencil, Sparkles, Check, Download } from "lucide-react";
import { useState } from "react";

interface ActionBarProps {
  onCopy: () => void;
  onEdit: () => void;
  onRemix: () => void;
  onDownload?: () => void;
}

export function ActionBar({ onCopy, onEdit, onRemix, onDownload }: ActionBarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="flex flex-wrap gap-3 justify-end">
        <Button
          onClick={handleCopy}
          variant={copied ? "default" : "secondary"}
          data-testid="button-copy"
        >
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </>
          )}
        </Button>
        
        <Button
          onClick={onEdit}
          variant="secondary"
          data-testid="button-edit"
        >
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </Button>
        
        <Button
          onClick={onRemix}
          variant="outline"
          data-testid="button-remix"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Remix
        </Button>
        
        {onDownload && (
          <Button
            onClick={onDownload}
            variant="outline"
            data-testid="button-download"
          >
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        )}
      </div>
    </div>
  );
}
