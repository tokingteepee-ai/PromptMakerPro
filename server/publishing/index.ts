/**
 * Publishing Module Export
 * Main entry point for the publishing preflight system
 */

export {
  PublishingState,
  PublishingStateMachine,
  type StateTransition
} from './state';

export {
  ensureTerms,
  generateTitle,
  uniqueSlug,
  buildPayload,
  type TermsInput,
  type TermsResult,
  type TitleInput,
  type PostPayload
} from './preflight';

export {
  logPreflight,
  logPerformance,
  readLogs,
  cleanOldLogs,
  getLogStats,
  type LogEntry
} from './logger';