/**
 * Conversation Type Definitions
 *
 * Phase 2: Core Infrastructure
 *
 * Defines types for conversation management:
 * - Messages exchanged between user, assistant, and system
 * - Tool execution results
 * - Conversation history tracking
 */

/**
 * Message Role - Who sent the message
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * Conversation Message - A single message in the conversation
 */
export interface ConversationMessage {
  /** Role of the message sender */
  role: MessageRole;

  /** Content of the message */
  content: string;

  /** Tool execution results (if any tools were used) */
  toolResults?: ToolExecutionResult[];

  /** Timestamp when the message was created */
  timestamp?: Date;

  /** Step number this message belongs to */
  stepNumber?: number;
}

/**
 * Tool Execution Result - Result of executing a browser tool
 */
export interface ToolExecutionResult {
  /** Name of the tool that was executed */
  toolName: string;

  /** Arguments passed to the tool */
  arguments?: Record<string, unknown>;

  /** Result returned by the tool */
  result: unknown;

  /** Error message if the tool failed */
  error?: string;

  /** Whether the tool execution was successful */
  success: boolean;

  /** Execution time in milliseconds */
  executionTimeMs?: number;
}

/**
 * Conversation History - Collection of messages
 */
export interface ConversationHistory {
  /** All messages in chronological order */
  messages: ConversationMessage[];

  /** When the conversation started */
  startedAt: Date;

  /** When the conversation ended (if finished) */
  finishedAt?: Date;

  /** Total number of messages */
  totalMessages: number;

  /** Total number of tool executions */
  totalToolExecutions: number;
}
