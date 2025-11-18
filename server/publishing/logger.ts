/**
 * Publishing Logger Module
 * Handles logging of preflight events to file system
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log directory path
const LOG_DIR = path.join(process.cwd(), 'logs');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export interface LogEntry {
  timestamp: string;
  event: string;
  data: Record<string, unknown>;
  level: 'info' | 'warn' | 'error' | 'debug';
}

/**
 * Get the log file name for the current date
 */
function getLogFileName(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  return `publishing-${year}-${month}-${day}.log`;
}

/**
 * Get the full path to the current log file
 */
function getLogFilePath(): string {
  return path.join(LOG_DIR, getLogFileName());
}

/**
 * Log a preflight event
 */
export async function logPreflight(
  event: string,
  data: Record<string, unknown>,
  level: 'info' | 'warn' | 'error' | 'debug' = 'info'
): Promise<void> {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    event,
    data,
    level
  };

  const logLine = JSON.stringify(entry) + '\n';
  const logPath = getLogFilePath();

  try {
    // Append to log file (create if doesn't exist)
    await fs.promises.appendFile(logPath, logLine, 'utf8');
    
    // Also log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[${level.toUpperCase()}] ${event}:`, data);
    }
  } catch (error) {
    console.error('Failed to write log:', error);
  }
}

/**
 * Log performance metrics
 */
export async function logPerformance(
  operation: string,
  startTime: number,
  metadata?: Record<string, unknown>
): Promise<void> {
  const duration = Date.now() - startTime;
  
  await logPreflight(`performance_${operation}`, {
    duration_ms: duration,
    ...metadata
  }, 'debug');
}

/**
 * Read logs from a specific date
 */
export async function readLogs(date?: Date): Promise<LogEntry[]> {
  let fileName: string;
  
  if (date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    fileName = `publishing-${year}-${month}-${day}.log`;
  } else {
    fileName = getLogFileName();
  }
  
  const logPath = path.join(LOG_DIR, fileName);
  
  try {
    const content = await fs.promises.readFile(logPath, 'utf8');
    const lines = content.trim().split('\n').filter(line => line);
    
    return lines.map(line => {
      try {
        return JSON.parse(line) as LogEntry;
      } catch {
        return null;
      }
    }).filter(entry => entry !== null) as LogEntry[];
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return []; // File doesn't exist yet
    }
    throw error;
  }
}

/**
 * Clear logs older than specified days
 */
export async function cleanOldLogs(daysToKeep: number = 7): Promise<void> {
  const now = Date.now();
  const maxAge = daysToKeep * 24 * 60 * 60 * 1000;
  
  try {
    const files = await fs.promises.readdir(LOG_DIR);
    
    for (const file of files) {
      if (!file.startsWith('publishing-') || !file.endsWith('.log')) {
        continue;
      }
      
      const filePath = path.join(LOG_DIR, file);
      const stats = await fs.promises.stat(filePath);
      const age = now - stats.mtime.getTime();
      
      if (age > maxAge) {
        await fs.promises.unlink(filePath);
        console.log(`Cleaned old log file: ${file}`);
      }
    }
  } catch (error) {
    console.error('Failed to clean old logs:', error);
  }
}

/**
 * Get log file statistics
 */
export async function getLogStats(): Promise<{
  currentFile: string;
  size: number;
  entries: number;
}> {
  const logPath = getLogFilePath();
  
  try {
    const stats = await fs.promises.stat(logPath);
    const entries = await readLogs();
    
    return {
      currentFile: getLogFileName(),
      size: stats.size,
      entries: entries.length
    };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return {
        currentFile: getLogFileName(),
        size: 0,
        entries: 0
      };
    }
    throw error;
  }
}