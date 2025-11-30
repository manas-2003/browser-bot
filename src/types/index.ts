/**
 * Type Definitions - Barrel Export
 *
 * Phase 2: Core Infrastructure
 *
 * Central export point for all type definitions.
 * Import types from this file instead of individual modules.
 *
 * Example:
 *   import type { AgentState, TaskResult, ConversationMessage } from './types/index.js';
 */

// Agent types
export type {
  AgentState,
  TaskResult,
  RunOptions,
  ExitReason,
  StepInfo,
} from './Agent.js';

// Conversation types
export type {
  MessageRole,
  ConversationMessage,
  ToolExecutionResult,
  ConversationHistory,
} from './Conversation.js';

// Browser types
export type {
  BrowserState,
  BrowserElement,
} from './Browser.js';
