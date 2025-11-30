/**
 * Agent Type Definitions
 *
 * Phase 2: Core Infrastructure
 *
 * Defines all types related to the BrowserBot agent:
 * - Agent state management
 * - Task execution results
 * - Configuration options
 * - Exit conditions
 */

import type { ConversationMessage } from './Conversation.js';

/**
 * Agent State - Tracks the current state of the agent during execution
 */
export interface AgentState {
  /** Current step number (0-indexed) */
  currentStep: number;

  /** Maximum number of steps allowed */
  maxSteps: number;

  /** Number of consecutive failures */
  consecutiveFailures: number;

  /** Whether the task is marked as done */
  isDone: boolean;

  /** Whether the agent should stop execution */
  shouldStop: boolean;

  /** Timestamp when the agent started */
  startedAt?: Date;

  /** Timestamp when the agent finished */
  finishedAt?: Date;
}

/**
 * Task Result - Final result returned after agent execution
 */
export interface TaskResult {
  /** Whether the task completed successfully */
  success: boolean;

  /** Human-readable message describing the result */
  message: string;

  /** Number of steps taken to complete (or fail) the task */
  stepsTaken: number;

  /** Full conversation history from the execution */
  conversationHistory: ConversationMessage[];

  /** Reason for exit (completion, max steps, failures, etc.) */
  exitReason: ExitReason;

  /** Total execution time in milliseconds */
  executionTimeMs?: number;

  /** Any additional data from the final step */
  data?: unknown;
}

/**
 * Run Options - Configuration for agent.run()
 */
export interface RunOptions {
  /** Maximum number of steps (default: 100) */
  maxSteps?: number;

  /** Maximum consecutive failures before stopping (default: 3) */
  maxFailures?: number;

  /** Temperature for LLM generation (0-1) */
  temperature?: number;

  /** Maximum tokens for LLM response */
  maxTokens?: number;

  /** Custom system prompt override */
  systemPrompt?: string;
}

/**
 * Exit Reason - Why the agent stopped execution
 */
export type ExitReason =
  | 'success'           // Task completed successfully
  | 'max_steps'         // Reached maximum steps
  | 'max_failures'      // Too many consecutive failures
  | 'user_interrupt'    // User stopped the agent
  | 'error';            // Unhandled error occurred

/**
 * Step Info - Information about the current step
 */
export interface StepInfo {
  /** Current step number */
  stepNumber: number;

  /** Maximum steps allowed */
  maxSteps: number;

  /** Whether this is the last step */
  isLastStep: boolean;

  /** Time elapsed since start (ms) */
  elapsedMs: number;
}
