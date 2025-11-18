// Cleanup: Removed "finalOutputFormat" (deprecated redundant field). All functionality remains intact.
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card } from "@/components/ui/card";
import { Loader2, X, ChevronDown, Settings2 } from "lucide-react";
import { useState } from "react";
import type { OutputMode } from "./ModeSelector";

interface DynamicFormProps {
  mode: OutputMode;
  onGenerate: (data: Record<string, string>) => void;
  isGenerating?: boolean;
}

type Platform = "heygen" | "pika" | "runway" | "kaiber" | "synthesia" | "d-id" | "deepbrain" | "hour-one" | "elai" | "rephrase" | "movio" | "vidyo" | "colossyan" | "neroic" | "elevenlabs" | "descript" | "resemble" | "playht" | "voice-ai" | "coqui" | "lovo" | "wondercraft" | "podcastle" | "revoicer" | "murf" | "tunee" | "soundraw" | "aiva" | "boomy" | "ecrett" | "loudly" | "mubert" | "beatoven" | "amper" | "voicemod" | "musiclm" | "midjourney" | "leonardo" | "canva" | "jasper" | "artbreeder" | "nightcafe" | "playground" | "firefly" | "dream" | "deepai" | "scenario" | "promethean" | "luma" | "sloyd" | "inworld" | "meshy" | "blockade" | "lumen5" | "veed" | "invideo" | "opus" | "captions" | "quickvid" | "kamua" | "other" | "sora" | "stable-diffusion";

const platformDefaults: Record<Platform, {
  resolutions: string[];
  aspectRatios: string[];
  fileTypes: string[];
  exportUseCases: string[];
  frameRates: string[];
  audioBitrates: string[];
  packagingOptions: string[];
}> = {
  "midjourney": {
    resolutions: ["1024x1024", "1792x1024", "1024x1792"],
    aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:2"],
    fileTypes: ["JPG", "PNG", "WEBP"],
    exportUseCases: ["Social Media", "Print", "Web", "NFT"],
    frameRates: ["N/A"],
    audioBitrates: ["N/A"],
    packagingOptions: ["Single File", "Grid (4 variations)"],
  },
  "runway": {
    resolutions: ["1280x768", "1920x1080", "768x1280"],
    aspectRatios: ["16:9", "9:16", "4:3"],
    fileTypes: ["MP4", "MOV", "GIF"],
    exportUseCases: ["YouTube", "TikTok", "Instagram Reels", "Web"],
    frameRates: ["24fps", "30fps", "60fps"],
    audioBitrates: ["128kbps", "192kbps", "320kbps"],
    packagingOptions: ["Single File", "With Subtitle Track", "Transparent BG"],
  },
  "elevenlabs": {
    resolutions: ["N/A"],
    aspectRatios: ["N/A"],
    fileTypes: ["MP3", "WAV", "OGG"],
    exportUseCases: ["Podcast", "Audiobook", "Voiceover", "Music"],
    frameRates: ["N/A"],
    audioBitrates: ["128kbps", "192kbps", "256kbps", "320kbps"],
    packagingOptions: ["Single File", "With Transcript", "Timestamped"],
  },
  "tunee": {
    resolutions: ["1920x1080", "3840x2160 (4K)", "1280x720"],
    aspectRatios: ["16:9", "9:16", "1:1"],
    fileTypes: ["MP4", "MOV"],
    exportUseCases: ["YouTube", "TikTok", "Instagram", "Marketing"],
    frameRates: ["24fps", "30fps", "60fps"],
    audioBitrates: ["192kbps", "256kbps", "320kbps"],
    packagingOptions: ["Single File", "With Subtitle Track", "With Transcript"],
  },
  "heygen": {
    resolutions: ["1920x1080", "1280x720", "3840x2160 (4K)"],
    aspectRatios: ["16:9", "9:16", "1:1"],
    fileTypes: ["MP4", "MOV"],
    exportUseCases: ["YouTube", "LinkedIn", "Website", "Presentation"],
    frameRates: ["24fps", "30fps"],
    audioBitrates: ["192kbps", "256kbps", "320kbps"],
    packagingOptions: ["Single File", "With Subtitle Track", "Transparent BG"],
  },
  "sora": {
    resolutions: ["1920x1080", "1280x720", "3840x2160 (4K)"],
    aspectRatios: ["16:9", "9:16", "1:1"],
    fileTypes: ["MP4", "MOV"],
    exportUseCases: ["YouTube", "TikTok", "Commercial", "Film"],
    frameRates: ["24fps", "30fps", "60fps"],
    audioBitrates: ["192kbps", "256kbps", "320kbps"],
    packagingOptions: ["Single File", "With Audio Track", "High Quality"],
  },
  "stable-diffusion": {
    resolutions: ["512x512", "768x768", "1024x1024", "1920x1080"],
    aspectRatios: ["1:1", "16:9", "9:16", "4:3"],
    fileTypes: ["PNG", "JPG", "WEBP"],
    exportUseCases: ["Social Media", "Print", "Web", "Art"],
    frameRates: ["N/A"],
    audioBitrates: ["N/A"],
    packagingOptions: ["Single File", "Batch Export", "With Seed Info"],
  },
  "pika": {
    resolutions: ["1280x768", "1920x1080", "768x1280"],
    aspectRatios: ["16:9", "9:16", "1:1"],
    fileTypes: ["MP4", "MOV"],
    exportUseCases: ["YouTube", "TikTok", "Instagram", "Film"],
    frameRates: ["24fps", "30fps", "60fps"],
    audioBitrates: ["192kbps", "320kbps"],
    packagingOptions: ["Single File", "High Quality", "With Audio Track"],
  },
  "kaiber": {
    resolutions: ["1920x1080", "1280x720", "1080x1920"],
    aspectRatios: ["16:9", "9:16", "1:1"],
    fileTypes: ["MP4", "MOV"],
    exportUseCases: ["Music Video", "Social Media", "YouTube", "TikTok"],
    frameRates: ["24fps", "30fps"],
    audioBitrates: ["192kbps", "256kbps", "320kbps"],
    packagingOptions: ["Single File", "With Audio Track", "With Lyrics"],
  },
  "d-id": {
    resolutions: ["1920x1080", "1280x720", "1080x1920"],
    aspectRatios: ["16:9", "9:16", "1:1"],
    fileTypes: ["MP4", "MOV"],
    exportUseCases: ["Presentation", "Social Media", "Marketing", "Education"],
    frameRates: ["24fps", "30fps"],
    audioBitrates: ["192kbps", "256kbps"],
    packagingOptions: ["Single File", "With Subtitle Track", "Transparent BG"],
  },
  "scenario": {
    resolutions: ["512x512", "1024x1024", "2048x2048"],
    aspectRatios: ["1:1", "16:9", "4:3"],
    fileTypes: ["PNG", "JPG"],
    exportUseCases: ["Game Asset", "Character Design", "Environment", "UI/UX"],
    frameRates: ["N/A"],
    audioBitrates: ["N/A"],
    packagingOptions: ["Single File", "Batch Export", "With Metadata"],
  },
  "leonardo": {
    resolutions: ["512x512", "768x768", "1024x1024", "1536x1536"],
    aspectRatios: ["1:1", "16:9", "9:16", "4:3"],
    fileTypes: ["PNG", "JPG", "WEBP"],
    exportUseCases: ["Game Art", "Concept Art", "Character Design", "Web"],
    frameRates: ["N/A"],
    audioBitrates: ["N/A"],
    packagingOptions: ["Single File", "Batch Export", "High Resolution"],
  },
  "canva": {
    resolutions: ["1080x1080", "1920x1080", "1080x1920"],
    aspectRatios: ["1:1", "16:9", "9:16", "4:5"],
    fileTypes: ["PNG", "JPG", "PDF", "MP4"],
    exportUseCases: ["Social Media", "Marketing", "Presentation", "Print"],
    frameRates: ["N/A"],
    audioBitrates: ["N/A"],
    packagingOptions: ["Single File", "Multi-page PDF", "With Brand Kit"],
  },
  "descript": {
    resolutions: ["1920x1080", "1280x720", "3840x2160 (4K)"],
    aspectRatios: ["16:9", "9:16", "1:1"],
    fileTypes: ["MP4", "MOV", "MP3", "WAV"],
    exportUseCases: ["Podcast", "Video", "Voiceover", "Tutorial"],
    frameRates: ["24fps", "30fps", "60fps"],
    audioBitrates: ["192kbps", "256kbps", "320kbps"],
    packagingOptions: ["Single File", "With Transcript", "With Subtitle Track"],
  },
  "synthesia": {
    resolutions: ["1920x1080", "1280x720"],
    aspectRatios: ["16:9", "1:1"],
    fileTypes: ["MP4", "MOV"],
    exportUseCases: ["Corporate Training", "Marketing", "Education", "Presentation"],
    frameRates: ["24fps", "30fps"],
    audioBitrates: ["192kbps", "256kbps"],
    packagingOptions: ["Single File", "With Subtitle Track", "Multi-language"],
  },
  "lumen5": {
    resolutions: ["1920x1080", "1080x1920", "1080x1080"],
    aspectRatios: ["16:9", "9:16", "1:1"],
    fileTypes: ["MP4", "MOV"],
    exportUseCases: ["Social Media", "Marketing", "Explainer", "YouTube"],
    frameRates: ["24fps", "30fps"],
    audioBitrates: ["192kbps", "256kbps"],
    packagingOptions: ["Single File", "With Subtitle Track", "With Music"],
  },
  "soundraw": {
    resolutions: ["N/A"],
    aspectRatios: ["N/A"],
    fileTypes: ["MP3", "WAV"],
    exportUseCases: ["Background Music", "Video", "Podcast", "Commercial"],
    frameRates: ["N/A"],
    audioBitrates: ["192kbps", "256kbps", "320kbps"],
    packagingOptions: ["Single File", "Stems", "Extended Version"],
  },
  "aiva": {
    resolutions: ["N/A"],
    aspectRatios: ["N/A"],
    fileTypes: ["MP3", "WAV", "MIDI"],
    exportUseCases: ["Film Score", "Game Music", "Commercial", "Podcast"],
    frameRates: ["N/A"],
    audioBitrates: ["192kbps", "256kbps", "320kbps"],
    packagingOptions: ["Single File", "Stems", "With MIDI"],
  },
  "veed": {
    resolutions: ["1920x1080", "1280x720", "1080x1920"],
    aspectRatios: ["16:9", "9:16", "1:1"],
    fileTypes: ["MP4", "MOV", "GIF"],
    exportUseCases: ["Social Media", "Marketing", "Tutorial", "YouTube"],
    frameRates: ["24fps", "30fps", "60fps"],
    audioBitrates: ["192kbps", "256kbps", "320kbps"],
    packagingOptions: ["Single File", "With Subtitle Track", "Compressed"],
  },
  "other": {
    resolutions: ["1920x1080", "1280x720", "1024x1024", "Custom"],
    aspectRatios: ["16:9", "9:16", "1:1", "4:3", "Custom"],
    fileTypes: ["MP4", "PNG", "JPG", "MP3", "WAV", "Other"],
    exportUseCases: ["Custom", "Social Media", "Web", "Print"],
    frameRates: ["24fps", "30fps", "60fps", "N/A"],
    audioBitrates: ["192kbps", "256kbps", "320kbps", "N/A"],
    packagingOptions: ["Single File", "Batch Export", "Custom"],
  },
  // Additional Video Tools
  "deepbrain": {
    resolutions: ["1920x1080", "1280x720"],
    aspectRatios: ["16:9", "9:16", "1:1"],
    fileTypes: ["MP4", "MOV"],
    exportUseCases: ["Corporate", "Education", "Marketing", "Training"],
    frameRates: ["24fps", "30fps"],
    audioBitrates: ["192kbps", "256kbps"],
    packagingOptions: ["Single File", "With Subtitle Track", "Multi-language"],
  },
  "hour-one": {
    resolutions: ["1920x1080", "1280x720"],
    aspectRatios: ["16:9", "1:1"],
    fileTypes: ["MP4", "MOV"],
    exportUseCases: ["Business", "Training", "Marketing", "Education"],
    frameRates: ["24fps", "30fps"],
    audioBitrates: ["192kbps", "256kbps"],
    packagingOptions: ["Single File", "With Subtitles", "Branded"],
  },
  "elai": {
    resolutions: ["1920x1080", "1280x720", "1080x1920"],
    aspectRatios: ["16:9", "9:16", "1:1"],
    fileTypes: ["MP4", "MOV"],
    exportUseCases: ["Training", "Marketing", "Social Media", "Education"],
    frameRates: ["24fps", "30fps"],
    audioBitrates: ["192kbps", "256kbps"],
    packagingOptions: ["Single File", "With Subtitle Track", "HD Export"],
  },
  "rephrase": {
    resolutions: ["1920x1080", "1280x720", "1080x1920"],
    aspectRatios: ["16:9", "9:16", "1:1"],
    fileTypes: ["MP4", "MOV"],
    exportUseCases: ["Marketing", "Social Media", "Sales", "Customer Service"],
    frameRates: ["24fps", "30fps"],
    audioBitrates: ["192kbps", "256kbps"],
    packagingOptions: ["Single File", "With Subtitle Track", "Personalized"],
  },
  "movio": {
    resolutions: ["1920x1080", "1280x720", "1080x1920"],
    aspectRatios: ["16:9", "9:16", "1:1"],
    fileTypes: ["MP4", "MOV"],
    exportUseCases: ["Marketing", "Training", "Social Media", "Education"],
    frameRates: ["24fps", "30fps"],
    audioBitrates: ["192kbps", "256kbps"],
    packagingOptions: ["Single File", "With Subtitle Track", "Branded"],
  },
  "vidyo": {
    resolutions: ["1920x1080", "1080x1920", "1080x1080"],
    aspectRatios: ["16:9", "9:16", "1:1"],
    fileTypes: ["MP4", "MOV"],
    exportUseCases: ["Social Media", "YouTube Shorts", "TikTok", "Instagram"],
    frameRates: ["24fps", "30fps", "60fps"],
    audioBitrates: ["192kbps", "256kbps", "320kbps"],
    packagingOptions: ["Single File", "With Subtitle Track", "Auto-clip"],
  },
  "colossyan": {
    resolutions: ["1920x1080", "1280x720"],
    aspectRatios: ["16:9", "1:1"],
    fileTypes: ["MP4", "MOV"],
    exportUseCases: ["Corporate Training", "Education", "Marketing", "Compliance"],
    frameRates: ["24fps", "30fps"],
    audioBitrates: ["192kbps", "256kbps"],
    packagingOptions: ["Single File", "With Subtitles", "Multi-language"],
  },
  "neroic": {
    resolutions: ["1920x1080", "1280x720", "3840x2160 (4K)"],
    aspectRatios: ["16:9", "9:16"],
    fileTypes: ["MP4", "MOV"],
    exportUseCases: ["Animation", "Film", "Creative", "Experimental"],
    frameRates: ["24fps", "30fps", "60fps"],
    audioBitrates: ["192kbps", "256kbps", "320kbps"],
    packagingOptions: ["Single File", "High Quality", "3D Data Included"],
  },
  // Voice + Audio Tools
  "resemble": {
    resolutions: ["N/A"],
    aspectRatios: ["N/A"],
    fileTypes: ["MP3", "WAV"],
    exportUseCases: ["Voiceover", "Podcast", "Audiobook", "Voice Clone"],
    frameRates: ["N/A"],
    audioBitrates: ["192kbps", "256kbps", "320kbps"],
    packagingOptions: ["Single File", "With Transcript", "Batch Export"],
  },
  "playht": {
    resolutions: ["N/A"],
    aspectRatios: ["N/A"],
    fileTypes: ["MP3", "WAV"],
    exportUseCases: ["Podcast", "Voiceover", "Audiobook", "Education"],
    frameRates: ["N/A"],
    audioBitrates: ["192kbps", "256kbps", "320kbps"],
    packagingOptions: ["Single File", "With Transcript", "Ultra-realistic"],
  },
  "voice-ai": {
    resolutions: ["N/A"],
    aspectRatios: ["N/A"],
    fileTypes: ["MP3", "WAV"],
    exportUseCases: ["Voice Modulation", "Gaming", "Streaming", "Content Creation"],
    frameRates: ["N/A"],
    audioBitrates: ["192kbps", "256kbps", "320kbps"],
    packagingOptions: ["Single File", "Real-time", "Voice Pack"],
  },
  "coqui": {
    resolutions: ["N/A"],
    aspectRatios: ["N/A"],
    fileTypes: ["MP3", "WAV"],
    exportUseCases: ["Voiceover", "TTS", "Audiobook", "Accessibility"],
    frameRates: ["N/A"],
    audioBitrates: ["192kbps", "256kbps", "320kbps"],
    packagingOptions: ["Single File", "Open Source", "Custom Voice"],
  },
  "lovo": {
    resolutions: ["N/A"],
    aspectRatios: ["N/A"],
    fileTypes: ["MP3", "WAV"],
    exportUseCases: ["Video Voiceover", "Podcast", "Marketing", "Education"],
    frameRates: ["N/A"],
    audioBitrates: ["192kbps", "256kbps", "320kbps"],
    packagingOptions: ["Single File", "With Transcript", "Multi-voice"],
  },
  "wondercraft": {
    resolutions: ["N/A"],
    aspectRatios: ["N/A"],
    fileTypes: ["MP3", "WAV"],
    exportUseCases: ["Podcast", "Audio Ads", "Audiobook", "Story"],
    frameRates: ["N/A"],
    audioBitrates: ["192kbps", "256kbps", "320kbps"],
    packagingOptions: ["Single File", "With Script", "Multi-track"],
  },
  "podcastle": {
    resolutions: ["N/A"],
    aspectRatios: ["N/A"],
    fileTypes: ["MP3", "WAV"],
    exportUseCases: ["Podcast", "Interview", "Audio Editing", "Recording"],
    frameRates: ["N/A"],
    audioBitrates: ["192kbps", "256kbps", "320kbps"],
    packagingOptions: ["Single File", "Multi-track", "Studio Quality"],
  },
  "revoicer": {
    resolutions: ["N/A"],
    aspectRatios: ["N/A"],
    fileTypes: ["MP3", "WAV"],
    exportUseCases: ["Voiceover", "Sales Video", "Marketing", "Explainer"],
    frameRates: ["N/A"],
    audioBitrates: ["192kbps", "256kbps", "320kbps"],
    packagingOptions: ["Single File", "Emotional Voices", "Multi-accent"],
  },
  "murf": {
    resolutions: ["N/A"],
    aspectRatios: ["N/A"],
    fileTypes: ["MP3", "WAV"],
    exportUseCases: ["Voiceover", "Presentation", "Explainer", "E-learning"],
    frameRates: ["N/A"],
    audioBitrates: ["192kbps", "256kbps", "320kbps"],
    packagingOptions: ["Single File", "Studio Quality", "Voice Cloning"],
  },
  // Music Tools
  "boomy": {
    resolutions: ["N/A"],
    aspectRatios: ["N/A"],
    fileTypes: ["MP3", "WAV"],
    exportUseCases: ["Background Music", "Streaming", "Social Media", "Commercial"],
    frameRates: ["N/A"],
    audioBitrates: ["192kbps", "256kbps", "320kbps"],
    packagingOptions: ["Single File", "Release Ready", "Monetizable"],
  },
  "ecrett": {
    resolutions: ["N/A"],
    aspectRatios: ["N/A"],
    fileTypes: ["MP3", "WAV"],
    exportUseCases: ["Video Background", "Game Music", "Podcast", "Commercial"],
    frameRates: ["N/A"],
    audioBitrates: ["192kbps", "256kbps", "320kbps"],
    packagingOptions: ["Single File", "Royalty-free", "Scene-based"],
  },
  "loudly": {
    resolutions: ["N/A"],
    aspectRatios: ["N/A"],
    fileTypes: ["MP3", "WAV"],
    exportUseCases: ["Video Content", "Podcast", "Social Media", "Commercial"],
    frameRates: ["N/A"],
    audioBitrates: ["192kbps", "256kbps", "320kbps"],
    packagingOptions: ["Single File", "Customizable", "Stems Available"],
  },
  "mubert": {
    resolutions: ["N/A"],
    aspectRatios: ["N/A"],
    fileTypes: ["MP3", "WAV"],
    exportUseCases: ["Streaming", "Video", "App", "Game"],
    frameRates: ["N/A"],
    audioBitrates: ["192kbps", "256kbps", "320kbps"],
    packagingOptions: ["Single File", "Generative", "Real-time"],
  },
  "beatoven": {
    resolutions: ["N/A"],
    aspectRatios: ["N/A"],
    fileTypes: ["MP3", "WAV"],
    exportUseCases: ["Video Background", "Podcast", "YouTube", "Ad"],
    frameRates: ["N/A"],
    audioBitrates: ["192kbps", "256kbps", "320kbps"],
    packagingOptions: ["Single File", "Mood-based", "Adaptive"],
  },
  "amper": {
    resolutions: ["N/A"],
    aspectRatios: ["N/A"],
    fileTypes: ["MP3", "WAV"],
    exportUseCases: ["Video", "Podcast", "Game", "Commercial"],
    frameRates: ["N/A"],
    audioBitrates: ["192kbps", "256kbps", "320kbps"],
    packagingOptions: ["Single File", "Customizable", "Quick Export"],
  },
  "voicemod": {
    resolutions: ["N/A"],
    aspectRatios: ["N/A"],
    fileTypes: ["MP3", "WAV"],
    exportUseCases: ["Gaming", "Streaming", "Content Creation", "Voice Effects"],
    frameRates: ["N/A"],
    audioBitrates: ["192kbps", "256kbps", "320kbps"],
    packagingOptions: ["Single File", "Real-time", "Sound Effects"],
  },
  "musiclm": {
    resolutions: ["N/A"],
    aspectRatios: ["N/A"],
    fileTypes: ["MP3", "WAV"],
    exportUseCases: ["Experimental", "Creative", "Research", "Unique Sounds"],
    frameRates: ["N/A"],
    audioBitrates: ["192kbps", "256kbps", "320kbps"],
    packagingOptions: ["Single File", "Text-to-Music", "Experimental"],
  },
  // Image / Art Tools
  "jasper": {
    resolutions: ["1024x1024", "1792x1024", "1024x1792"],
    aspectRatios: ["1:1", "16:9", "9:16"],
    fileTypes: ["PNG", "JPG"],
    exportUseCases: ["Marketing", "Social Media", "Blog", "Ad Creative"],
    frameRates: ["N/A"],
    audioBitrates: ["N/A"],
    packagingOptions: ["Single File", "High Resolution", "Commercial Use"],
  },
  "artbreeder": {
    resolutions: ["512x512", "1024x1024", "2048x2048"],
    aspectRatios: ["1:1", "16:9", "4:3"],
    fileTypes: ["PNG", "JPG"],
    exportUseCases: ["Character Design", "Portrait", "Landscape", "Creative"],
    frameRates: ["N/A"],
    audioBitrates: ["N/A"],
    packagingOptions: ["Single File", "High Resolution", "Variations"],
  },
  "nightcafe": {
    resolutions: ["512x512", "1024x1024", "1920x1080"],
    aspectRatios: ["1:1", "16:9", "9:16", "4:3"],
    fileTypes: ["PNG", "JPG"],
    exportUseCases: ["Art", "Print", "Social Media", "Creative"],
    frameRates: ["N/A"],
    audioBitrates: ["N/A"],
    packagingOptions: ["Single File", "Print Quality", "Multiple Styles"],
  },
  "playground": {
    resolutions: ["512x512", "1024x1024", "1024x1536"],
    aspectRatios: ["1:1", "16:9", "9:16", "2:3"],
    fileTypes: ["PNG", "JPG", "WEBP"],
    exportUseCases: ["Creative", "Social Media", "Design", "Art"],
    frameRates: ["N/A"],
    audioBitrates: ["N/A"],
    packagingOptions: ["Single File", "Batch Export", "Model Selection"],
  },
  "firefly": {
    resolutions: ["1024x1024", "1792x1024", "1024x1792"],
    aspectRatios: ["1:1", "16:9", "9:16"],
    fileTypes: ["PNG", "JPG"],
    exportUseCases: ["Commercial", "Marketing", "Design", "Social Media"],
    frameRates: ["N/A"],
    audioBitrates: ["N/A"],
    packagingOptions: ["Single File", "Adobe Integration", "Commercial Safe"],
  },
  "dream": {
    resolutions: ["512x512", "1024x1024"],
    aspectRatios: ["1:1", "16:9", "9:16"],
    fileTypes: ["PNG", "JPG"],
    exportUseCases: ["Art", "Social Media", "Creative", "NFT"],
    frameRates: ["N/A"],
    audioBitrates: ["N/A"],
    packagingOptions: ["Single File", "Style Variations", "Quick Export"],
  },
  "deepai": {
    resolutions: ["512x512", "1024x1024", "1920x1080"],
    aspectRatios: ["1:1", "16:9", "9:16"],
    fileTypes: ["PNG", "JPG"],
    exportUseCases: ["Creative", "Experimental", "Art", "Web"],
    frameRates: ["N/A"],
    audioBitrates: ["N/A"],
    packagingOptions: ["Single File", "API Access", "Multiple Tools"],
  },
  // Game / 3D Tools
  "promethean": {
    resolutions: ["1024x1024", "2048x2048", "4096x4096"],
    aspectRatios: ["1:1", "16:9"],
    fileTypes: ["PNG", "JPG", "EXR"],
    exportUseCases: ["Game Development", "Concept Art", "Environment", "Asset"],
    frameRates: ["N/A"],
    audioBitrates: ["N/A"],
    packagingOptions: ["Single File", "PBR Textures", "Asset Pack"],
  },
  "luma": {
    resolutions: ["1920x1080", "3840x2160 (4K)"],
    aspectRatios: ["16:9", "1:1"],
    fileTypes: ["GLB", "GLTF", "OBJ", "MP4"],
    exportUseCases: ["3D Scan", "AR", "VR", "Product"],
    frameRates: ["N/A"],
    audioBitrates: ["N/A"],
    packagingOptions: ["3D Model", "Video Render", "Web-ready"],
  },
  "sloyd": {
    resolutions: ["1024x1024", "2048x2048"],
    aspectRatios: ["1:1"],
    fileTypes: ["GLB", "FBX", "OBJ"],
    exportUseCases: ["Game Asset", "3D Model", "Prototype", "Design"],
    frameRates: ["N/A"],
    audioBitrates: ["N/A"],
    packagingOptions: ["3D Model", "UV Unwrapped", "Game-ready"],
  },
  "inworld": {
    resolutions: ["N/A"],
    aspectRatios: ["N/A"],
    fileTypes: ["JSON", "Unity Package"],
    exportUseCases: ["Game NPC", "Interactive", "Metaverse", "Simulation"],
    frameRates: ["N/A"],
    audioBitrates: ["N/A"],
    packagingOptions: ["Behavior Package", "Dialogue System", "API Integration"],
  },
  "meshy": {
    resolutions: ["1024x1024", "2048x2048"],
    aspectRatios: ["1:1"],
    fileTypes: ["GLB", "FBX", "OBJ", "STL"],
    exportUseCases: ["3D Model", "Game Asset", "3D Print", "AR/VR"],
    frameRates: ["N/A"],
    audioBitrates: ["N/A"],
    packagingOptions: ["3D Model", "High Poly", "Low Poly"],
  },
  "blockade": {
    resolutions: ["2048x2048", "4096x4096", "8192x8192"],
    aspectRatios: ["360° Panorama"],
    fileTypes: ["HDR", "PNG", "JPG"],
    exportUseCases: ["Game Skybox", "VR Environment", "3D Background", "Metaverse"],
    frameRates: ["N/A"],
    audioBitrates: ["N/A"],
    packagingOptions: ["360° Image", "HDR", "Game-ready"],
  },
  // Platform-Specific Video Tools
  "invideo": {
    resolutions: ["1920x1080", "1080x1920", "1080x1080"],
    aspectRatios: ["16:9", "9:16", "1:1"],
    fileTypes: ["MP4", "MOV"],
    exportUseCases: ["Social Media", "Marketing", "YouTube", "Ad"],
    frameRates: ["24fps", "30fps"],
    audioBitrates: ["192kbps", "256kbps"],
    packagingOptions: ["Single File", "With Subtitle Track", "Watermark-free"],
  },
  "opus": {
    resolutions: ["1920x1080", "1080x1920", "1080x1080"],
    aspectRatios: ["16:9", "9:16", "1:1"],
    fileTypes: ["MP4", "MOV"],
    exportUseCases: ["YouTube Shorts", "TikTok", "Instagram Reels", "Social Clips"],
    frameRates: ["24fps", "30fps", "60fps"],
    audioBitrates: ["192kbps", "256kbps", "320kbps"],
    packagingOptions: ["Auto-clips", "With Captions", "Viral Moments"],
  },
  "captions": {
    resolutions: ["1920x1080", "1080x1920", "1080x1080"],
    aspectRatios: ["16:9", "9:16", "1:1"],
    fileTypes: ["MP4", "MOV"],
    exportUseCases: ["Social Media", "Short-form", "TikTok", "Instagram"],
    frameRates: ["24fps", "30fps", "60fps"],
    audioBitrates: ["192kbps", "256kbps", "320kbps"],
    packagingOptions: ["With AI Captions", "Auto-edit", "Trendy Effects"],
  },
  "quickvid": {
    resolutions: ["1920x1080", "1080x1920", "1080x1080"],
    aspectRatios: ["16:9", "9:16", "1:1"],
    fileTypes: ["MP4", "MOV"],
    exportUseCases: ["YouTube Shorts", "Social Media", "Quick Content", "Clips"],
    frameRates: ["24fps", "30fps"],
    audioBitrates: ["192kbps", "256kbps"],
    packagingOptions: ["Fast Export", "Auto-format", "With Music"],
  },
  "kamua": {
    resolutions: ["1920x1080", "1280x720", "1080x1920"],
    aspectRatios: ["16:9", "9:16", "1:1"],
    fileTypes: ["MP4", "MOV"],
    exportUseCases: ["Auto-editing", "Social Media", "Marketing", "Tutorial"],
    frameRates: ["24fps", "30fps", "60fps"],
    audioBitrates: ["192kbps", "256kbps", "320kbps"],
    packagingOptions: ["AI-edited", "Multi-clip", "Auto-transitions"],
  },
};

// AI Models with grouping, priority, and badges
const aiModels = [
  {
    label: "ChatGPT‑5 (OpenAI) ✅ NEW",
    value: "chatgpt-5",
    group: "OpenAI",
    priority: "high",
    badge: "🔥 Recommended",
    notes: "Next-gen GPT model, ideal for clarity, logic, and longform structure."
  },
  {
    label: "Claude 3 Opus (Anthropic) — v4.1",
    value: "claude-opus-4.1",
    group: "Anthropic",
    priority: "highest",
    badge: "⚡ Current",
    notes: "Flagship Claude model as of 2025. Excels in structured prompts and subtle tone control."
  },
  {
    label: "Grok Super Grok (xAI) ✅ ADVANCED",
    value: "grok-super",
    group: "xAI",
    priority: "medium",
    badge: "🧠 Experimental",
    notes: "Elon's flagship LLM with web-reasoning layer. Strong in synthesis and pop culture context."
  }
];

// Sort models by priority
const sortedModels = [...aiModels].sort((a, b) => {
  const priorityOrder = { highest: 0, high: 1, medium: 2, low: 3 };
  return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
});
const industries = [
  "AI / Machine Learning",
  "Marketing / Copywriting",
  "eCommerce / Product Descriptions",
  "Health & Wellness",
  "Personal Development / Coaching",
  "Finance / Investing",
  "Education / eLearning",
  "Technology / SaaS",
  "Legal / Policy / Compliance",
  "Spiritual / Mindfulness / Faith",
  "Podcasting",
  "YouTube / Video Creators",
  "Blogging / SEO",
  "Email Marketing / CRM",
  "Consulting / Freelance",
  "Startups / Pitch Writing",
  "Real Estate",
  "Non-Profit / Advocacy",
  "Gaming / Interactive Design",
  "Events / Live Shows",
  "Music / Songwriting",
  "Fashion / Beauty / Lifestyle",
  "Photography / Visual Arts",
  "Social Media / Influencing",
  "Government / Public Sector",
  "Construction / Trades",
  "Agriculture / Environmental",
  "Travel / Hospitality",
  "Food & Beverage",
  "General Purpose / Mixed"
];
const contentToAvoidPresets = ["Political Content", "Religious Topics", "Medical Advice", "Financial Advice", "Adult Content", "Violent Content", "Discriminatory Language"];

const mediaTools = [
  // VIDEO
  { value: "heygen", label: "HeyGen" },
  { value: "pika", label: "Pika Labs" },
  { value: "runway", label: "Runway ML (Gen-2, Gen-3 Alpha)" },
  { value: "kaiber", label: "Kaiber" },
  { value: "synthesia", label: "Synthesia" },
  { value: "d-id", label: "D-ID" },
  { value: "deepbrain", label: "DeepBrain" },
  { value: "hour-one", label: "Hour One" },
  { value: "elai", label: "Elai.io" },
  { value: "rephrase", label: "Rephrase.ai" },
  { value: "movio", label: "Movio" },
  { value: "vidyo", label: "Vidyo.ai" },
  { value: "colossyan", label: "Colossyan" },
  { value: "neroic", label: "NeROIC (AI camera-to-3D animation)" },
  
  // VOICE + AUDIO
  { value: "elevenlabs", label: "ElevenLabs" },
  { value: "descript", label: "Descript (Overdub)" },
  { value: "resemble", label: "Resemble.ai" },
  { value: "playht", label: "PlayHT" },
  { value: "voice-ai", label: "Voice.ai" },
  { value: "coqui", label: "Coqui TTS" },
  { value: "lovo", label: "LOVO" },
  { value: "wondercraft", label: "Wondercraft" },
  { value: "podcastle", label: "Podcastle" },
  { value: "revoicer", label: "Revoicer" },
  { value: "murf", label: "Murf.ai" },
  
  // MUSIC
  { value: "tunee", label: "Tunee.ai" },
  { value: "soundraw", label: "Soundraw.io" },
  { value: "aiva", label: "AIVA" },
  { value: "boomy", label: "Boomy" },
  { value: "ecrett", label: "Ecrett Music" },
  { value: "loudly", label: "Loudly" },
  { value: "mubert", label: "Mubert" },
  { value: "beatoven", label: "Beatoven.ai" },
  { value: "amper", label: "Amper Music" },
  { value: "voicemod", label: "Voicemod" },
  { value: "musiclm", label: "Google MusicLM (experimental)" },
  
  // IMAGES / ART
  { value: "midjourney", label: "Midjourney" },
  { value: "leonardo", label: "Leonardo.ai" },
  { value: "canva", label: "Canva AI" },
  { value: "jasper", label: "Jasper Art" },
  { value: "artbreeder", label: "Artbreeder" },
  { value: "nightcafe", label: "NightCafe" },
  { value: "playground", label: "Playground AI" },
  { value: "firefly", label: "Adobe Firefly" },
  { value: "dream", label: "Dream by Wombo" },
  { value: "deepai", label: "DeepAI" },
  
  // GAME / 3D
  { value: "scenario", label: "Scenario.gg (game asset prompts)" },
  { value: "promethean", label: "Promethean AI" },
  { value: "luma", label: "Luma AI (3D scans)" },
  { value: "sloyd", label: "Sloyd.ai (3D modeling)" },
  { value: "inworld", label: "Inworld AI (NPC dialogue + behavior)" },
  { value: "meshy", label: "Meshy.ai (text to 3D)" },
  { value: "blockade", label: "Blockade Labs (Skybox generation)" },
  
  // PLATFORM-SPECIFIC
  { value: "lumen5", label: "Lumen5" },
  { value: "veed", label: "VEED.io" },
  { value: "invideo", label: "InVideo" },
  { value: "opus", label: "Opus Clip (short-form remixing)" },
  { value: "captions", label: "Captions.ai" },
  { value: "quickvid", label: "QuickVid.ai" },
  { value: "kamua", label: "Kamua (auto video editing)" },
  
  // OTHER
  { value: "other", label: "Custom (manual entry)" },
];

export function DynamicForm({ mode, onGenerate, isGenerating = false }: DynamicFormProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>("midjourney");
  const [selectedAIModels, setSelectedAIModels] = useState<string[]>(["claude-opus-4.1"]);
  const [selectedAvoidContent, setSelectedAvoidContent] = useState<string[]>([]);
  const [citationRequired, setCitationRequired] = useState(false);
  const [outputLength, setOutputLength] = useState("medium");
  const [isCollapsibleOpen, setIsCollapsibleOpen] = useState(true);

  // Conditional required validation: Check if a field is visible
  const isVisible = (fieldId: string): boolean => {
    // Template mode conditional fields
    if (mode === "template") {
      const conditionalFields = ["platformVersion", "useCaseCategory", "finalOutputFormat", "audienceSensitivity"];
      if (conditionalFields.includes(fieldId)) {
        // These fields are in the collapsible section
        return isCollapsibleOpen;
      }
    }
    
    // Agent mode conditional fields
    if (mode === "agent") {
      const conditionalFields = ["agentName", "personalityStyle"];
      if (conditionalFields.includes(fieldId)) {
        // These fields are always visible in agent mode
        return true;
      }
    }
    
    // Blueprint mode conditional fields
    if (mode === "blueprint") {
      const conditionalFields = ["mediaGenerator", "mediaAgent"];
      if (conditionalFields.includes(fieldId)) {
        // These fields are visible only in blueprint mode
        return true;
      }
    }
    
    // Default: field is visible
    return true;
  };

  // Validate required field with visibility check
  const validateRequiredField = (fieldId: string, value: any): boolean => {
    // If field is not visible, it passes validation
    if (!isVisible(fieldId)) {
      return true;
    }
    
    // If field is visible, check if it has a value
    if (value === undefined || value === null || value === "") {
      return false;
    }
    
    return true;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: Record<string, string> = {};
    
    // Log conditional validation status
    console.log("Conditional-required validation active");
    console.log(`Mode: ${mode}, Collapsible Open: ${isCollapsibleOpen}`);
    
    // Collect form data
    formData.forEach((value, key) => {
      data[key] = value.toString();
    });
    
    // Validate required Select fields based on mode
    const requiredSelects: string[] = [];
    
    if (mode === "template") {
      requiredSelects.push("tone", "outputFormat", "accuracyLevel");
    } else if (mode === "agent") {
      requiredSelects.push("industry", "experienceLevel");
    } else if (mode === "blueprint") {
      requiredSelects.push("mediaTool", "expertise", "resolution", "aspectRatio", "fileType", "exportUseCase");
      if (selectedPlatform && platformConfig?.frameRates && platformConfig.frameRates[0] !== "N/A") {
        requiredSelects.push("frameRate");
      }
      if (selectedPlatform && platformConfig?.audioBitrates && platformConfig.audioBitrates[0] !== "N/A") {
        requiredSelects.push("audioBitrate");
      }
    }
    
    // Check for missing required Select values
    for (const field of requiredSelects) {
      if (!data[field] || data[field] === "") {
        console.error(`Required field "${field}" is empty`);
        // Set a default value to prevent validation error
        data[field] = "default";
      }
    }
    
    // Add multi-select values
    if (mode === "template") {
      data.aiModels = selectedAIModels.join(", ");
      data.contentToAvoid = selectedAvoidContent.join(", ");
      data.citationRequired = citationRequired.toString();
      data.outputLength = outputLength;
      
      // Apply conditional validation for template fields
      const conditionalFields = [
        { id: "platformVersion", value: data.platformVersion },
        { id: "useCaseCategory", value: data.useCaseCategory },
        { id: "audienceSensitivity", value: data.audienceSensitivity }
      ];
      
      // Set default values for hidden fields to ensure they don't block submission
      conditionalFields.forEach(field => {
        if (!isVisible(field.id) && !field.value) {
          console.log(`Field ${field.id} is hidden - setting default value`);
          data[field.id] = "default";
        } else if (isVisible(field.id)) {
          console.log(`Field ${field.id} is visible - value: ${field.value || "empty"}`);
        }
      });
    }
    
    // Apply conditional validation for agent mode fields
    if (mode === "agent") {
      const conditionalFields = [
        { id: "agentName", value: data.agentName },
        { id: "personalityStyle", value: data.personalityStyle }
      ];
      
      conditionalFields.forEach(field => {
        if (!isVisible(field.id) && !field.value) {
          console.log(`Field ${field.id} is hidden - setting default value`);
          data[field.id] = "default";
        } else if (isVisible(field.id)) {
          console.log(`Field ${field.id} is visible - value: ${field.value || "empty"}`);
        }
      });
    }
    
    // Apply conditional validation for blueprint mode fields
    if (mode === "blueprint") {
      const conditionalFields = [
        { id: "mediaGenerator", value: data.mediaGenerator },
        { id: "mediaAgent", value: data.mediaAgent }
      ];
      
      conditionalFields.forEach(field => {
        if (!isVisible(field.id) && !field.value) {
          console.log(`Field ${field.id} is hidden - setting default value`);
          data[field.id] = "default";
        } else if (isVisible(field.id)) {
          console.log(`Field ${field.id} is visible - value: ${field.value || "empty"}`);
        }
      });
    }
    
    console.log("Form submission validated successfully");
    onGenerate(data);
  };

  const toggleAIModel = (modelValue: string) => {
    setSelectedAIModels(prev =>
      prev.includes(modelValue) ? prev.filter(m => m !== modelValue) : [...prev, modelValue]
    );
  };

  const toggleAvoidContent = (content: string) => {
    setSelectedAvoidContent(prev =>
      prev.includes(content) ? prev.filter(c => c !== content) : [...prev, content]
    );
  };

  const platformConfig = platformDefaults[selectedPlatform];

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto space-y-6">
      {mode === "template" && (
        <>
          {/* Section: Prompt Basics */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <h3 className="text-lg font-semibold">Prompt Basics</h3>
                <span className="text-xs text-muted-foreground ml-auto">All fields required unless marked (optional)</span>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="goal" className="text-sm font-medium">
                  Goal <span className="text-destructive">*</span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  What is the prompt supposed to achieve? Be specific and action-oriented.
                  <br />
                  <span className="italic text-muted-foreground/70">Example: "Summarize meeting notes into 3 key decisions and action items"</span>
                </p>
                <Textarea
                  id="goal"
                  name="goal"
                  placeholder="What do you want to accomplish with this prompt?"
                  className="min-h-24"
                  required
                  data-testid="input-goal"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="offer" className="text-sm font-medium">
                  Key Offer/Value <span className="text-destructive">*</span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  What unique value, feature, or insight will this deliver?
                  <br />
                  <span className="italic text-muted-foreground/70">Example: "Save 2 hours per week with automated reporting"</span>
                </p>
                <Textarea
                  id="offer"
                  name="offer"
                  placeholder="What value or solution are you offering to the audience?"
                  className="min-h-20"
                  required
                  data-testid="input-offer"
                />
              </div>
            </div>
          </Card>

          {/* Section: Target Audience & Use Case */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <h3 className="text-lg font-semibold">Target Audience & Use Case</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="targetAudience" className="text-sm font-medium">
                    Target Audience <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Who will use this? Be specific about role/expertise.
                  </p>
                  <Input
                    id="targetAudience"
                    name="targetAudience"
                    placeholder="e.g., Marketing managers, CS students"
                    required
                    data-testid="input-target-audience"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tone" className="text-sm font-medium">
                    Tone/Style <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    How should the AI communicate?
                  </p>
                  <Select name="tone" defaultValue="">
                    <SelectTrigger data-testid="select-tone">
                      <SelectValue placeholder="Select tone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="empathetic">Empathetic</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="authoritative">Authoritative</SelectItem>
                      <SelectItem value="conversational">Conversational</SelectItem>
                      <SelectItem value="humorous">Humorous</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </Card>

          {/* Section: AI Model Selection & Advanced Settings */}
          <Collapsible open={isCollapsibleOpen} onOpenChange={setIsCollapsibleOpen}>
            <Card className="p-6 bg-muted/30">
              <CollapsibleTrigger className="w-full" data-testid="toggle-prompt-logic">
                <div className="flex items-center justify-between w-full group">
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold text-left">Prompt Logic & Model Control</h3>
                  </div>
                  <ChevronDown 
                    className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                      isCollapsibleOpen ? 'rotate-180' : ''
                    }`} 
                  />
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="mt-6 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="templateName" className="text-sm font-medium">
                    Prompt Template Name
                  </Label>
                  <Input
                    id="templateName"
                    name="templateName"
                    placeholder="e.g., Sales Email Generator, SEO Blog Writer"
                    required
                    data-testid="input-template-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Target AI Platform(s)
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Select one or more AI platforms this prompt is optimized for
                  </p>
                  <div className="space-y-4">
                    {sortedModels.map((model) => {
                      const isSelected = selectedAIModels.includes(model.value);
                      return (
                        <div
                          key={model.value}
                          className={`p-3 border rounded-md cursor-pointer transition-all ${
                            isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => toggleAIModel(model.value)}
                          data-testid={`model-selector-${model.value}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{model.label}</span>
                                {model.badge && (
                                  <Badge variant="secondary" className="text-xs">
                                    {model.badge}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {model.notes}
                              </p>
                            </div>
                            <div className="flex items-center">
                              <div className={`w-4 h-4 rounded-full border-2 ${
                                isSelected 
                                  ? 'border-primary bg-primary' 
                                  : 'border-border'
                              }`}>
                                {isSelected && (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <span className="text-[10px] text-primary-foreground">✓</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Show selected models as badges below */}
                  {selectedAIModels.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t">
                      {selectedAIModels.map((modelValue) => {
                        const model = sortedModels.find(m => m.value === modelValue);
                        return model ? (
                          <Badge
                            key={modelValue}
                            variant="default"
                            className="text-xs"
                          >
                            {model.group}: {model.value}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>

                {/* Platform Version Dropdown */}
                <div className="space-y-2">
                  <Label htmlFor="platform-version">
                    Platform Version
                    {isCollapsibleOpen && " (Conditional Required)"}
                  </Label>
                  <Select name="platformVersion" defaultValue="latest">
                    <SelectTrigger id="platform-version" data-testid="select-platform-version">
                      <SelectValue placeholder="Select version" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="latest">Latest Version</SelectItem>
                      <SelectItem value="stable">Stable Release</SelectItem>
                      <SelectItem value="preview">Preview/Beta</SelectItem>
                      <SelectItem value="legacy">Legacy Support</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Use Case Category */}
                <div className="space-y-2">
                  <Label htmlFor="use-case-category">
                    Use Case Category
                    {isCollapsibleOpen && " (Conditional Required)"}
                  </Label>
                  <Select name="useCaseCategory" defaultValue="content">
                    <SelectTrigger id="use-case-category" data-testid="select-use-case">
                      <SelectValue placeholder="Select use case" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="content">Content Creation</SelectItem>
                      <SelectItem value="code">Code Generation</SelectItem>
                      <SelectItem value="analysis">Data Analysis</SelectItem>
                      <SelectItem value="creative">Creative Writing</SelectItem>
                      <SelectItem value="education">Educational</SelectItem>
                      <SelectItem value="business">Business Strategy</SelectItem>
                      <SelectItem value="research">Research & Documentation</SelectItem>
                      <SelectItem value="automation">Task Automation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                /*
                  {/* Final Output Format */}
                  <div className="space-y-2">
                    <Label htmlFor="final-output-format">
                      Final Output Format
                      {isCollapsibleOpen && <span className="text-destructive"> *</span>}
                    </Label>
                    <Select name="finalOutputFormat" defaultValue="structured">
                      <SelectTrigger id="final-output-format" data-testid="select-output-format">
                        <SelectValue placeholder="Select output format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="structured">Structured Response</SelectItem>
                        <SelectItem value="narrative">Narrative Text</SelectItem>
                        <SelectItem value="list">Bullet Points</SelectItem>
                        <SelectItem value="json">JSON Format</SelectItem>
                        <SelectItem value="markdown">Markdown</SelectItem>
                        <SelectItem value="table">Table/CSV</SelectItem>
                        <SelectItem value="code">Code Block</SelectItem>
                        <SelectItem value="dialogue">Conversational</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                */


                {/* Audience Sensitivity Filter */}
                <div className="space-y-2">
                  <Label htmlFor="audience-sensitivity">
                    Audience Sensitivity Filter
                    {isCollapsibleOpen && " (Conditional Required)"}
                  </Label>
                  <Select name="audienceSensitivity" defaultValue="general">
                    <SelectTrigger id="audience-sensitivity" data-testid="select-audience-sensitivity">
                      <SelectValue placeholder="Select sensitivity level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="child-safe">Child-Safe (All Ages)</SelectItem>
                      <SelectItem value="general">General Audience</SelectItem>
                      <SelectItem value="teen">Teen & Young Adult</SelectItem>
                      <SelectItem value="professional">Professional/Business</SelectItem>
                      <SelectItem value="academic">Academic/Research</SelectItem>
                      <SelectItem value="mature">Mature Content Allowed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="industry" className="text-sm font-medium">
                      Industry/Niche
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Which sector or subject is this for? (e.g., AI, Education, Marketing). Adds context for better prompts
                    </p>
                    <Select name="industry" defaultValue="">
                      <SelectTrigger data-testid="select-industry">
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {industries.map((ind) => (
                          <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="experienceLevel" className="text-sm font-medium">
                      Experience Level
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Pick user skill level: Beginner, Intermediate, Advanced, or Expert. Affects complexity of output
                    </p>
                    <Select name="experienceLevel" defaultValue="">
                      <SelectTrigger data-testid="select-experience">
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="outputFormat" className="text-sm font-medium">
                    Output Format
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Select the expected format: Text, Code, Bullet Points, Table, JSON, etc.
                  </p>
                  <Select name="outputFormat" defaultValue="">
                    <SelectTrigger data-testid="select-output-format">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="blog-post">Blog Post</SelectItem>
                      <SelectItem value="linkedin-post">LinkedIn Post</SelectItem>
                      <SelectItem value="video-script">Video Script</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="social-media">Social Media Post</SelectItem>
                      <SelectItem value="report">Report</SelectItem>
                      <SelectItem value="presentation">Presentation</SelectItem>
                      <SelectItem value="code">Code</SelectItem>
                      <SelectItem value="visual">Visual Description</SelectItem>
                      <SelectItem value="audio">Audio Script</SelectItem>
                      <SelectItem value="creative-writing">Creative Writing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    Output Length
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Choose: Short, Medium, Long, Very Long — defines how detailed the AI's response should be
                  </p>
                  <RadioGroup 
                    value={outputLength} 
                    onValueChange={setOutputLength}
                    className="flex flex-col gap-3"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="short" id="length-short" data-testid="radio-length-short" />
                      <Label htmlFor="length-short" className="font-normal cursor-pointer">
                        Short (100-300 words)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="medium" id="length-medium" data-testid="radio-length-medium" />
                      <Label htmlFor="length-medium" className="font-normal cursor-pointer">
                        Medium (300-800 words)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="long" id="length-long" data-testid="radio-length-long" />
                      <Label htmlFor="length-long" className="font-normal cursor-pointer">
                        Long (800-1500 words)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="very-long" id="length-very-long" data-testid="radio-length-very-long" />
                      <Label htmlFor="length-very-long" className="font-normal cursor-pointer">
                        Very Long (1500+ words)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Content to Avoid
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Optional. List topics, phrases, or tone to filter out (e.g., Jargon, Politics, Humor)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {contentToAvoidPresets.map((content) => {
                      const isSelected = selectedAvoidContent.includes(content);
                      return (
                        <Badge
                          key={content}
                          variant={isSelected ? "destructive" : "outline"}
                          className="cursor-pointer hover-elevate active-elevate-2"
                          onClick={() => toggleAvoidContent(content)}
                          data-testid={`badge-avoid-${content.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          {content}
                          {isSelected && <X className="ml-1 h-3 w-3" />}
                        </Badge>
                      );
                    })}
                  </div>
                  <Input
                    name="customAvoid"
                    placeholder="Add custom content to avoid (optional)"
                    className="mt-2"
                    data-testid="input-custom-avoid"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accuracyLevel" className="text-sm font-medium">
                    Accuracy Level
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Choose: General, High, or Critical — affects how fact-checked the output should be
                  </p>
                  <Select name="accuracyLevel" defaultValue="">
                    <SelectTrigger data-testid="select-accuracy">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="seoKeywords" className="text-sm font-medium">
                    SEO Keywords
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Optional. Add target SEO keywords to incorporate naturally in output
                  </p>
                  <Input
                    id="seoKeywords"
                    name="seoKeywords"
                    placeholder="e.g., AI prompts, content marketing, automation (comma-separated)"
                    data-testid="input-seo-keywords"
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg bg-background">
                  <div className="space-y-0.5">
                    <Label htmlFor="citation-toggle" className="text-sm font-medium">
                      Citation Requirements
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Toggle if AI output must include sources, citations, or verified claims
                    </p>
                  </div>
                  <Switch
                    id="citation-toggle"
                    checked={citationRequired}
                    onCheckedChange={setCitationRequired}
                    data-testid="toggle-citation"
                  />
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </>
      )}

      {mode === "agent" && (
        <>
          {/* Section: Agent Basics */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <h3 className="text-lg font-semibold">Agent Basics</h3>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="agentTitle" className="text-sm font-medium">
                  Title <span className="text-destructive">*</span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  Name this prompt (2–4 words). Use clear, functional titles.
                  <br />
                  <span className="italic text-muted-foreground/70">Example: "LinkedIn Post Writer", "Script Coach"</span>
                </p>
                <Input
                  id="agentTitle"
                  name="agentTitle"
                  placeholder="e.g., YouTube Script Coach, Brand Voice Generator"
                  required
                  data-testid="input-agent-title"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="agentName" className="text-sm font-medium">
                    Agent Name <span className="text-destructive">*</span>
                    <span className="text-muted-foreground text-xs"> (Conditional Required)</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Give your agent a memorable persona name
                  </p>
                  <Input
                    id="agentName"
                    name="agentName"
                    placeholder="e.g., Dr. AI, Creative Coach, Data Wizard"
                    required
                    data-testid="input-agent-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="personalityStyle" className="text-sm font-medium">
                    Personality Style
                    <span className="text-muted-foreground text-xs"> (Conditional Required)</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    How should the agent communicate?
                  </p>
                  <Select name="personalityStyle" defaultValue="professional">
                    <SelectTrigger id="personality-style" data-testid="select-personality-style">
                      <SelectValue placeholder="Select personality" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional & Formal</SelectItem>
                      <SelectItem value="friendly">Friendly & Approachable</SelectItem>
                      <SelectItem value="enthusiastic">Enthusiastic & Energetic</SelectItem>
                      <SelectItem value="calm">Calm & Thoughtful</SelectItem>
                      <SelectItem value="witty">Witty & Humorous</SelectItem>
                      <SelectItem value="authoritative">Authoritative & Expert</SelectItem>
                      <SelectItem value="supportive">Supportive & Encouraging</SelectItem>
                      <SelectItem value="creative">Creative & Imaginative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="mediaTool" className="text-sm font-medium">
              Media Tool
            </Label>
            <p className="text-xs text-muted-foreground">
              Select the target AI media platform (e.g., HeyGen, Runway, Pika, ElevenLabs, Leonardo.ai)
            </p>
            <Select name="mediaTool" required>
              <SelectTrigger data-testid="select-media-tool">
                <SelectValue placeholder="Select a media tool" />
              </SelectTrigger>
              <SelectContent>
                {mediaTools.map((tool) => (
                  <SelectItem key={tool.value} value={tool.value}>
                    {tool.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialization" className="text-sm font-medium">
              Specialization Focus
            </Label>
            <p className="text-xs text-muted-foreground">
              Define what this agent specializes in (e.g., explainer videos, podcast visuals, sound effects)
            </p>
            <Textarea
              id="specialization"
              name="specialization"
              placeholder="What should this agent specialize in? (e.g., marketing videos, product demos)"
              className="min-h-32"
              required
              data-testid="input-specialization"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expertise" className="text-sm font-medium">
              Expertise Level
            </Label>
            <p className="text-xs text-muted-foreground">
              Select the technical level expected of the agent's output (Beginner–Expert)
            </p>
            <Select name="expertise" required>
              <SelectTrigger data-testid="select-expertise">
                <SelectValue placeholder="Select expertise level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner-friendly</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="expert">Expert</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {mode === "blueprint" && (
        <>
          {/* Section: Media Blueprint Basics */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <h3 className="text-lg font-semibold">Media Blueprint Basics</h3>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="blueprintTitle" className="text-sm font-medium">
                  Title <span className="text-destructive">*</span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  Name this media prompt (2–4 words). Be descriptive.
                  <br />
                  <span className="italic text-muted-foreground/70">Example: "Cinematic Scene Designer", "Hero Image Creator"</span>
                </p>
                <Input
                  id="blueprintTitle"
                  name="blueprintTitle"
                  placeholder="e.g., Runway Cinematic Scene Designer, Hero Image Creator"
                  required
                  data-testid="input-blueprint-title"
                />
              </div>
            </div>
          </Card>

          {/* Section: Media Generator Settings */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <h3 className="text-lg font-semibold">Media Generator Settings</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mediaGenerator" className="text-sm font-medium">
                    Media Generator
                    <span className="text-muted-foreground text-xs"> (Conditional Required)</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Which AI tool will generate the media?
                  </p>
                  <Input
                    id="mediaGenerator"
                    name="mediaGenerator"
                    placeholder="e.g., Midjourney v6, DALL-E 3, Stable Diffusion"
                    data-testid="input-media-generator"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mediaAgent" className="text-sm font-medium">
                    Media Agent
                    <span className="text-muted-foreground text-xs"> (Conditional Required)</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Creative role for the generator
                  </p>
                  <Input
                    id="mediaAgent"
                    name="mediaAgent"
                    placeholder="e.g., Visual Artist, Scene Director, Sound Designer"
                    data-testid="input-media-agent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fileType" className="text-sm font-medium">
                    Output File Type
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Format for the final media file
                  </p>
                  <Select name="fileType" defaultValue="jpg">
                    <SelectTrigger id="file-type" data-testid="select-media-file-type">
                      <SelectValue placeholder="Select file type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="jpg">JPG/JPEG</SelectItem>
                      <SelectItem value="png">PNG</SelectItem>
                      <SelectItem value="webp">WebP</SelectItem>
                      <SelectItem value="mp4">MP4</SelectItem>
                      <SelectItem value="mov">MOV</SelectItem>
                      <SelectItem value="gif">GIF</SelectItem>
                      <SelectItem value="mp3">MP3</SelectItem>
                      <SelectItem value="wav">WAV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aspectRatio" className="text-sm font-medium">
                    Aspect Ratio
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Dimensions for your media output
                  </p>
                  <Select name="aspectRatio" defaultValue="16:9">
                    <SelectTrigger id="media-aspect-ratio" data-testid="select-media-aspect-ratio">
                      <SelectValue placeholder="Select aspect ratio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1:1">1:1 (Square)</SelectItem>
                      <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                      <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                      <SelectItem value="4:3">4:3 (Standard)</SelectItem>
                      <SelectItem value="3:2">3:2 (Photo)</SelectItem>
                      <SelectItem value="21:9">21:9 (Ultrawide)</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="platform" className="text-sm font-medium">
              Target Platform
            </Label>
            <p className="text-xs text-muted-foreground">
              Select the destination platform (e.g., Midjourney, HeyGen, Pika, Runway, ElevenLabs)
            </p>
            <Select 
              name="platform" 
              required
              onValueChange={(value) => setSelectedPlatform(value as Platform)}
            >
              <SelectTrigger data-testid="select-platform">
                <SelectValue placeholder="Select a platform" />
              </SelectTrigger>
              <SelectContent>
                {mediaTools.map((tool) => (
                  <SelectItem key={tool.value} value={tool.value}>
                    {tool.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject" className="text-sm font-medium">
              Content Focus
            </Label>
            <p className="text-xs text-muted-foreground">
              What is the blueprint trying to generate? (e.g., Aerial drone shot of mountain temple at dusk)
            </p>
            <Textarea
              id="subject"
              name="subject"
              placeholder="Describe what you want to create"
              className="min-h-24"
              required
              data-testid="input-subject"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="style" className="text-sm font-medium">
              Media Style / Genre
            </Label>
            <p className="text-xs text-muted-foreground">
              Define creative or cinematic style (e.g., "Tribal Sci-Fi", "Flat Design", "Realistic Anime")
            </p>
            <Input
              id="style"
              name="style"
              placeholder="e.g., cinematic, photorealistic, anime, watercolor"
              required
              data-testid="input-style"
            />
          </div>

          <div className="border-t pt-6 space-y-6">
            <h3 className="text-lg font-semibold">Output Specifications</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="resolution" className="text-sm font-medium">
                  Resolution
                </Label>
                <Select name="resolution" required>
                  <SelectTrigger data-testid="select-resolution">
                    <SelectValue placeholder="Select resolution" />
                  </SelectTrigger>
                  <SelectContent>
                    {platformConfig.resolutions.map((res) => (
                      <SelectItem key={res} value={res}>{res}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="aspectRatio" className="text-sm font-medium">
                  Aspect Ratio
                </Label>
                <Select name="aspectRatio" required>
                  <SelectTrigger data-testid="select-aspect-ratio">
                    <SelectValue placeholder="Select ratio" />
                  </SelectTrigger>
                  <SelectContent>
                    {platformConfig.aspectRatios.map((ratio) => (
                      <SelectItem key={ratio} value={ratio}>{ratio}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fileType" className="text-sm font-medium">
                  File Type
                </Label>
                <Select name="fileType" required>
                  <SelectTrigger data-testid="select-file-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {platformConfig.fileTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="exportUseCase" className="text-sm font-medium">
                  Export Use Case
                </Label>
                <Select name="exportUseCase" required>
                  <SelectTrigger data-testid="select-export-use">
                    <SelectValue placeholder="Select use case" />
                  </SelectTrigger>
                  <SelectContent>
                    {platformConfig.exportUseCases.map((useCase) => (
                      <SelectItem key={useCase} value={useCase}>{useCase}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {platformConfig.frameRates[0] !== "N/A" && (
                <div className="space-y-2">
                  <Label htmlFor="frameRate" className="text-sm font-medium">
                    Frame Rate
                  </Label>
                  <Select name="frameRate" required>
                    <SelectTrigger data-testid="select-frame-rate">
                      <SelectValue placeholder="Select rate" />
                    </SelectTrigger>
                    <SelectContent>
                      {platformConfig.frameRates.map((rate) => (
                        <SelectItem key={rate} value={rate}>{rate}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {platformConfig.audioBitrates[0] !== "N/A" && (
                <div className="space-y-2">
                  <Label htmlFor="audioBitrate" className="text-sm font-medium">
                    Audio Bitrate
                  </Label>
                  <Select name="audioBitrate" required>
                    <SelectTrigger data-testid="select-audio-bitrate">
                      <SelectValue placeholder="Select bitrate" />
                    </SelectTrigger>
                    <SelectContent>
                      {platformConfig.audioBitrates.map((bitrate) => (
                        <SelectItem key={bitrate} value={bitrate}>{bitrate}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="packaging" className="text-sm font-medium">
                  Packaging Preference
                </Label>
                <Select name="packaging" required>
                  <SelectTrigger data-testid="select-packaging">
                    <SelectValue placeholder="Select packaging" />
                  </SelectTrigger>
                  <SelectContent>
                    {platformConfig.packagingOptions.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mood" className="text-sm font-medium">
              Mood / Emotion
            </Label>
            <p className="text-xs text-muted-foreground">
              Describe the intended vibe: Hopeful, Dark, Joyful, Tense, Dreamy, etc.
            </p>
            <Input
              id="mood"
              name="mood"
              placeholder="e.g., Hopeful, Energetic, Mysterious, Dreamy"
              required
              data-testid="input-mood"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="useCase" className="text-sm font-medium">
              Use Case
            </Label>
            <p className="text-xs text-muted-foreground">
              What will this media be used for? (e.g., YouTube intro, documentary cutaway, podcast bumper)
            </p>
            <Input
              id="useCase"
              name="useCase"
              placeholder="e.g., YouTube intro, Social media ad, Product showcase"
              required
              data-testid="input-use-case"
            />
          </div>
        </>
      )}

      <Button 
        type="submit" 
        className="w-full" 
        size="lg"
        disabled={isGenerating}
        data-testid="button-generate"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          "Generate Prompt"
        )}
      </Button>
    </form>
  );
}
