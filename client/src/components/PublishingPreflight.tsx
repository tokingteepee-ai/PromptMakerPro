import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Rocket, FileText, Globe, AlertCircle, CheckCircle2, BookOpen, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { OutputMode } from "./ModeSelector";
import { usePromptinator, useModelGate } from "@/stores/promptinator";

interface PublishingPreflightProps {
  mode: OutputMode;
  formData?: Record<string, any>;
  trustScore?: number;
}

interface PreflightResult {
  success: boolean;
  title: string;
  slug: string;
  termsResult: {
    created: string[];
    existing: string[];
  };
  payload: any;
  state: string;
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

export function PublishingPreflight({ 
  mode, 
  formData,
  trustScore = 0
}: PublishingPreflightProps) {
  const { promptText } = usePromptinator();
  const { available, reason } = useModelGate();
  const [isRunning, setIsRunning] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [preflightResult, setPreflightResult] = useState<PreflightResult | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  
  // WordPress publishing state
  const [isWpSaving, setIsWpSaving] = useState(false);
  const [wpSuccess, setWpSuccess] = useState(false);
  const [wpUrl, setWpUrl] = useState<string | null>(null);
  const [wpTitle, setWpTitle] = useState("");
  const [wpTemplateMode, setWpTemplateMode] = useState("general_prompt");
  
  const { toast } = useToast();
  
  const hasPrompt = Boolean(promptText?.trim());
  const runTestDisabled = !available || !hasPrompt;
  const publishDisabled = !available || !hasPrompt;
  
  // Initialize WordPress title when formData changes
  useEffect(() => {
    const defaultTitle = formData?.title || formData?.templateName || formData?.agentName || 
                        `${mode} prompt - ${new Date().toLocaleDateString()}`;
    setWpTitle(defaultTitle);
  }, [formData, mode]);

  const runTestFromPreflight = async () => {
    if (runTestDisabled) return; // hard guard
    
    if (!promptText) {
      toast({
        title: "No prompt to publish",
        description: "Please generate a prompt first before running preflight.",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    try {
      // Extract categories and tags from form data or use defaults
      const categories = formData?.categories || 
                        formData?.industry ? [formData.industry] : 
                        ['general-purpose'];
      const tags = formData?.tags || 
                  [mode, formData?.tone, formData?.platform].filter(Boolean);
      
      // Add more tags to meet minimum requirement
      if (tags.length < 3) {
        tags.push('ai-generated', 'prompt', 'template');
      }

      const response = await fetch('/api/preflight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData?.title || formData?.templateName || formData?.agentName,
          content: promptText,
          categories,
          tags: tags.slice(0, 5), // Limit to 5 tags
          mode,
          metadata: {
            ...formData,
            trustScore,
            generatedAt: new Date().toISOString()
          }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setPreflightResult(result);
        setShowResults(true);
      } else {
        throw new Error(result.error || 'Preflight failed');
      }
    } catch (error: any) {
      console.error('Preflight error:', error);
      toast({
        title: "Preflight failed",
        description: error.message || "An error occurred during preflight.",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleCreateDraft = async () => {
    if (!preflightResult?.payload) return;
    
    setIsDrafting(true);
    try {
      const response = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: preflightResult.payload
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Draft created",
          description: `Your prompt has been saved as a draft (ID: ${result.draftId})`,
        });
        setShowResults(false);
      } else {
        throw new Error(result.error || 'Failed to create draft');
      }
    } catch (error: any) {
      console.error('Draft error:', error);
      toast({
        title: "Draft creation failed",
        description: error.message || "Failed to create draft.",
        variant: "destructive",
      });
    } finally {
      setIsDrafting(false);
    }
  };

  const publishFromPreflight = async () => {
    if (publishDisabled) return; // hard guard
    if (!preflightResult?.payload || !preflightResult?.validation?.isValid) return;
    
    setIsPublishing(true);
    try {
      const response = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: preflightResult.payload,
          validation: preflightResult.validation
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Published successfully!",
          description: `Your prompt is now live at ${result.url}`,
        });
        setShowResults(false);
      } else {
        throw new Error(result.error || 'Failed to publish');
      }
    } catch (error: any) {
      console.error('Publish error:', error);
      toast({
        title: "Publishing failed",
        description: error.message || "Failed to publish prompt.",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const saveToWordPress = async () => {
    if (!promptText || !wpTitle.trim()) {
      toast({
        title: "Validation error",
        description: "Please provide a title for your prompt.",
        variant: "destructive",
      });
      return;
    }

    if (wpTitle.length > 200) {
      toast({
        title: "Title too long",
        description: "Title must be less than 200 characters.",
        variant: "destructive",
      });
      return;
    }

    console.log('=== WordPress Save Debug (Client) ===');
    console.log('Title:', wpTitle);
    console.log('Template Mode:', wpTemplateMode);
    console.log('Content Length:', promptText.length);
    console.log('Content Preview:', promptText.substring(0, 100) + '...');

    setIsWpSaving(true);
    try {
      const requestBody = {
        title: wpTitle,
        content: promptText,
        templateMode: wpTemplateMode
      };
      
      console.log('Request Body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch('/api/wordpress/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      console.log('Response Status:', response.status, response.statusText);
      
      const result = await response.json();
      console.log('Response Body:', JSON.stringify(result, null, 2));
      
      if (result.success) {
        setWpSuccess(true);
        setWpUrl(result.url || null);
        toast({
          title: "✓ Saved to library!",
          description: "Your prompt has been published to the AI First Movers community.",
        });
      } else {
        console.error('WordPress returned error:', result.error);
        console.error('Full error details:', result.details);
        throw new Error(result.error || 'Failed to save to WordPress');
      }
    } catch (error: any) {
      console.error('WordPress save error:', error);
      toast({
        title: "Save failed",
        description: error.message || "Could not save to community library. Please try again.",
        variant: "destructive",
        duration: 10000, // Show error for 10 seconds
      });
    } finally {
      setIsWpSaving(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Publishing
          </CardTitle>
          <CardDescription>
            Run preflight checks and publish your prompt
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!available && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {reason}
              </AlertDescription>
            </Alert>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-full">
                  <Button 
                    onClick={runTestFromPreflight}
                    aria-disabled={runTestDisabled}
                    className="w-full"
                    size="lg"
                    data-testid="btn-preflight-run-test"
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Running Test...
                      </>
                    ) : (
                      <>
                        <Rocket className="mr-2 h-4 w-4" />
                        Run Test
                      </>
                    )}
                  </Button>
                </div>
              </TooltipTrigger>
              {runTestDisabled && (
                <TooltipContent>
                  <p>{!available ? reason : "Generate a prompt first to enable this action."}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          {!promptText && (
            <p className="text-sm text-muted-foreground mt-2">
              Generate a prompt first to enable publishing
            </p>
          )}
          {promptText && !available && (
            <p className="text-sm text-muted-foreground mt-2">
              Testing and publishing disabled until valid model selected
            </p>
          )}
        </CardContent>
      </Card>

      {/* WordPress Community Library Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Community Library
          </CardTitle>
          <CardDescription>
            Share your prompt with the AI First Movers community
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {wpSuccess && wpUrl ? (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>✓ Saved to library!</span>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="h-auto p-0"
                  data-testid="link-view-prompt"
                >
                  <a href={wpUrl} target="_blank" rel="noopener noreferrer">
                    View prompt <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="wp-title">Prompt Title</Label>
                <Input
                  id="wp-title"
                  value={wpTitle}
                  onChange={(e) => setWpTitle(e.target.value)}
                  placeholder="Enter a descriptive title..."
                  maxLength={200}
                  disabled={isWpSaving || wpSuccess}
                  data-testid="input-wp-title"
                />
                <p className="text-xs text-muted-foreground">
                  {wpTitle.length}/200 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wp-template">Template Mode</Label>
                <select
                  id="wp-template"
                  value={wpTemplateMode}
                  onChange={(e) => setWpTemplateMode(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isWpSaving || wpSuccess}
                  data-testid="select-wp-template"
                >
                  <option value="general_prompt">General Purpose</option>
                  <option value="task_execution">Task Execution</option>
                  <option value="business_strategy">Business Strategy</option>
                  <option value="marketing_copy">Marketing Copy</option>
                  <option value="book_longform">Book/Longform Writing</option>
                  <option value="solopreneur_workflow">Solopreneur Workflow</option>
                  <option value="persona_simulation">Persona Simulation</option>
                  <option value="prompt_engineer">Prompt Engineer</option>
                  <option value="system_prompt_architect">System Prompt Architect</option>
                  <option value="multi_agent_coordinator">Multi-Agent Coordinator</option>
                  <option value="claude_specific">Claude-Specific</option>
                  <option value="schema_diff_auditor">Schema Diff Auditor</option>
                  <option value="promptinator_architect">Prompt Maker Architect</option>
                  <option value="remy_replit">Remy Replit</option>
                  <option value="image_blueprint">Image Generation</option>
                  <option value="video_blueprint">Video Generation</option>
                  <option value="music_blueprint">Music Generation</option>
                  <option value="sound_effects_blueprint">Sound Effects</option>
                  <option value="multimodal_blueprint">Multimodal</option>
                </select>
              </div>

              <Button
                onClick={saveToWordPress}
                disabled={!hasPrompt || isWpSaving || wpSuccess || !wpTitle.trim()}
                className="w-full"
                size="lg"
                data-testid="button-save-to-library"
              >
                {isWpSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving to Library...
                  </>
                ) : wpSuccess ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Saved Successfully
                  </>
                ) : (
                  <>
                    <BookOpen className="mr-2 h-4 w-4" />
                    Save to Community Library
                  </>
                )}
              </Button>

              {!hasPrompt && (
                <p className="text-sm text-muted-foreground">
                  Generate a prompt first to save it to the library
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Publishing Preflight Results</DialogTitle>
            <DialogDescription>
              Review your prompt details before publishing
            </DialogDescription>
          </DialogHeader>

          {preflightResult && (
            <div className="space-y-4">
              {/* Title and Slug */}
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium">Title:</span>
                  <p className="text-sm">{preflightResult.title}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Slug:</span>
                  <p className="text-sm text-muted-foreground">/{preflightResult.slug}</p>
                </div>
              </div>

              {/* Terms */}
              <div className="space-y-2">
                <span className="text-sm font-medium">Terms:</span>
                <div className="flex flex-wrap gap-2">
                  {preflightResult.termsResult.created.map((term, i) => (
                    <Badge key={i} variant="default" className="text-xs">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      {term} (new)
                    </Badge>
                  ))}
                  {preflightResult.termsResult.existing.map((term, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {term}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Payload Keys */}
              {preflightResult.payload && (
                <div className="space-y-2">
                  <span className="text-sm font-medium">Payload Keys:</span>
                  <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                    {Object.keys(preflightResult.payload).join(', ')}
                  </div>
                </div>
              )}

              {/* Validation */}
              {preflightResult.validation.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      {preflightResult.validation.errors.map((error, i) => (
                        <div key={i}>• {error}</div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {preflightResult.validation.warnings.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      {preflightResult.validation.warnings.map((warning, i) => (
                        <div key={i}>• {warning}</div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* State */}
              <div>
                <span className="text-sm font-medium">State: </span>
                <Badge variant={preflightResult.validation.isValid ? "default" : "secondary"}>
                  {preflightResult.state}
                </Badge>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <TooltipProvider>
              {/* Create Draft button - Always enabled when payload exists */}
              <Button
                variant="outline"
                onClick={handleCreateDraft}
                disabled={isDrafting || !preflightResult?.payload}
                data-testid="button-create-draft"
              >
                {isDrafting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Draft...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Create Draft
                  </>
                )}
              </Button>
              
              {/* Publish button - Disabled without valid model */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button
                      onClick={publishFromPreflight}
                      aria-disabled={publishDisabled || !preflightResult?.validation?.isValid}
                      data-testid="btn-preflight-publish"
                    >
                      {isPublishing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Publishing...
                        </>
                      ) : (
                        <>
                          <Globe className="mr-2 h-4 w-4" />
                          Publish
                        </>
                      )}
                    </Button>
                  </div>
                </TooltipTrigger>
                {publishDisabled && (
                  <TooltipContent>
                    <p>{!available ? reason : "Generate a prompt first to enable this action."}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}