/**
 * Conversation History Manager
 *
 * Phase 3: Agent Core Components
 *
 * Tracks all messages and tool executions across agent iterations.
 * Provides context to the LLM so it knows what has already been done.
 */

import type { ConversationMessage } from '../types/index.js';

/**
 * Manages conversation history for the agent
 */
export class ConversationHistory {
  private messages: ConversationMessage[] = [];
  private readonly startedAt: Date;

  constructor() {
    this.startedAt = new Date();
  }

  /**
   * Add a user message to the history
   */
  addUserMessage(content: string, stepNumber?: number): void {
    this.messages.push({
      role: 'user',
      content,
      timestamp: new Date(),
      stepNumber,
    });
  }

  /**
   * Add an assistant (LLM) response to the history
   */
  addAssistantMessage(content: string, stepNumber?: number, toolResults?: any[]): void {
    this.messages.push({
      role: 'assistant',
      content,
      timestamp: new Date(),
      stepNumber,
      toolResults,
    });
  }

  /**
   * Add a system message (for context/instructions)
   */
  addSystemMessage(content: string): void {
    this.messages.push({
      role: 'system',
      content,
      timestamp: new Date(),
    });
  }

  /**
   * Get all messages in chronological order
   */
  getMessages(): ConversationMessage[] {
    return [...this.messages];
  }

  /**
   * Get recent messages (last N messages)
   */
  getRecentMessages(count: number): ConversationMessage[] {
    return this.messages.slice(-count);
  }

  /**
   * Get conversation summary
   */
  getSummary(): string {
    const duration = Date.now() - this.startedAt.getTime();
    const userMessages = this.messages.filter((m) => m.role === 'user').length;
    const assistantMessages = this.messages.filter((m) => m.role === 'assistant').length;

    return `Conversation started ${Math.round(duration / 1000)}s ago. ${userMessages} user messages, ${assistantMessages} assistant responses.`;
  }

  /**
   * Format history for LLM context (last N messages)
   */
  formatForContext(maxMessages: number = 10): string {
    const recent = this.getRecentMessages(maxMessages);

    return recent
      .map((msg) => {
        const timestamp = msg.timestamp
          ? new Date(msg.timestamp).toLocaleTimeString()
          : '';
        const step = msg.stepNumber ? `[Step ${msg.stepNumber}]` : '';

        return `${step} ${msg.role.toUpperCase()} (${timestamp}): ${msg.content}`;
      })
      .join('\n\n');
  }

  /**
   * Get total message count
   */
  getTotalMessages(): number {
    return this.messages.length;
  }

  /**
   * Clear all history (for testing)
   */
  clear(): void {
    this.messages = [];
  }

  /**
   * Get actions taken (extract from assistant messages)
   */
  getActionsTaken(): string[] {
    return this.messages
      .filter((m) => m.role === 'assistant')
      .map((m) => m.content)
      .filter((content) => content.includes('Action:') || content.includes('Tool:'));
  }

  /**
   * Check if task appears to be complete based on history
   */
  looksComplete(): boolean {
    const recentMessages = this.getRecentMessages(3);
    const recentContent = recentMessages.map((m) => m.content.toLowerCase()).join(' ');

    // Check for completion indicators
    const completionKeywords = [
      'task complete',
      'successfully completed',
      'done',
      'finished',
      'accomplished',
      'message sent',
      'action completed',
    ];

    return completionKeywords.some((keyword) => recentContent.includes(keyword));
  }

  /**
   * Truncate content to max size
   * Following browser-use pattern: 60k chars max
   */
  private truncateContent(content: string, maxSize: number = 60000): string {
    if (content.length <= maxSize) {
      return content;
    }

    const omitted = content.length - maxSize;
    return (
      content.substring(0, maxSize) +
      `\n\n... [Truncated: ${omitted} characters omitted to prevent context overflow]`
    );
  }

  /**
   * Get messages for NeuroLink in the format it expects
   * Truncates assistant messages (which contain tool results) to prevent context overflow
   *
   * @param maxMessages - Maximum number of messages to include (default: all)
   * @param maxContentSize - Maximum size of each message content (default: 60k chars)
   * @returns Array of messages in NeuroLink format
   */
  getMessagesForNeuroLink(
    maxMessages?: number,
    maxContentSize: number = 60000
  ): Array<{ role: 'user' | 'assistant'; content: string }> {
    let messages = this.messages;

    // Limit to recent messages if specified
    if (maxMessages && maxMessages > 0) {
      messages = messages.slice(-maxMessages);
    }

    // Convert to NeuroLink format and truncate
    // Filter out system messages as NeuroLink expects only user/assistant
    return messages
      .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
      .map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: this.truncateContent(msg.content, maxContentSize),
      }));
  }
}
