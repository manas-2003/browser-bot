/**
 * BrowserBot - Autonomous AI agent for browser automation
 *
 * Main entry point and exports
 */

// Export main agent
export { BrowserBot } from './agent/index.js';

// Export agent components
export {
  ConversationHistory,
  PromptBuilder,
  StateManager,
} from './agent/index.js';

// Export NeuroLink client
export { NeuroLinkClient } from './neurolink/NeuroLinkClient.js';

// Export Playwright client and trimmer
export { PlaywrightClient, ResponseTrimmer } from './playwright/index.js';
export type { PlaywrightToolResult } from './playwright/index.js';

// Export types
export type {
  AgentState,
  TaskResult,
  RunOptions,
  ExitReason,
  StepInfo,
  ConversationMessage,
  ToolExecutionResult,
  ConversationHistory as ConversationHistoryType,
  BrowserState,
  BrowserElement,
} from './types/index.js';
