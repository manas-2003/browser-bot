/**
 * Prompt Builder
 *
 * Phase 3: Agent Core Components
 *
 * Builds context-aware prompts for the LLM at each iteration.
 * Includes:
 * - System prompt (agent instructions)
 * - Task description
 * - Browser state (URL, accessibility tree)
 * - Conversation history
 * - Current step number and constraints
 */

import type { BrowserState } from '../types/index.js';

export interface PromptContext {
  task: string;
  currentStep: number;
  maxSteps: number;
  browserState?: BrowserState;
  isLastStep?: boolean;
}

/**
 * Builds prompts for the agent at each iteration
 */
export class PromptBuilder {
  /**
   * Build the system prompt that instructs the agent how to behave
   */
  static buildSystemPrompt(isLastStep: boolean = false): string {
    if (isLastStep) {
      return `You are BrowserBot, an AI agent that controls web browsers.

IMPORTANT: This is your LAST iteration. You MUST complete the task now or declare it done/failed.

Your response MUST include one of these conclusions:
- "TASK COMPLETE: [explanation]" if the task is finished
- "TASK FAILED: [reason]" if the task cannot be completed

Do not request more iterations. Make your final decision now.`;
    }

    return `You are BrowserBot, an AI agent that controls web browsers autonomously.

You have access to Playwright browser automation tools. Use them to:
- Navigate to URLs
- Take snapshots of pages to see content
- Click on elements
- Type text into form fields
- Wait for page elements or durations
- And more browser interactions

Your reasoning process for each iteration:
1. OBSERVE: Analyze the current browser state using browser_snapshot
2. REASON: Decide what action to take next based on the task
3. ACT: Use the appropriate browser tool

IMPORTANT INSTRUCTIONS:

For YOUTUBE/MEDIA tasks:
- After clicking a video, use browser_wait_for with ONLY timeout parameter (no text parameter!)
- Calculate timeout in milliseconds: minutes*60*1000 + seconds*1000
- Example: For a 5min 32sec video: browser_wait_for(timeout=332000)
- DO NOT include any text parameter - wait for duration only!

For GOOGLE SEARCH:
- After typing in search box, you MUST either:
  a) Click the "Google Search" button, OR
  b) Select an option from the dropdown suggestions
- Simply typing is NOT enough - you must trigger the search!
- After search completes, use browser_snapshot to verify results are shown
- If you need to view a specific result, click on the link to open it

When the task is complete, respond with:
TASK COMPLETE: [explanation of what was accomplished]

If you cannot proceed or the task fails, respond with:
TASK FAILED: [explanation of why it failed]

Think step-by-step and use the tools available to you to accomplish the task.`;
  }

  /**
   * Build the user prompt for a specific iteration
   */
  static buildUserPrompt(context: PromptContext): string {
    const parts: string[] = [];

    // Task description
    parts.push(`TASK: ${context.task}`);
    parts.push('');

    // Current iteration info
    parts.push(
      `CURRENT ITERATION: ${context.currentStep} of ${context.maxSteps} (max)`
    );

    if (context.isLastStep) {
      parts.push('⚠️ WARNING: This is your LAST iteration! Make final decision now.');
    }

    parts.push('');

    // Browser state if available
    if (context.browserState) {
      parts.push('BROWSER STATE:');
      parts.push(`- Current URL: ${context.browserState.url}`);

      if (context.browserState.title) {
        parts.push(`- Page Title: ${context.browserState.title}`);
      }

      parts.push(`- Page Loaded: ${context.browserState.loaded ? 'Yes' : 'No'}`);

      if (context.browserState.elements && context.browserState.elements.length > 0) {
        parts.push(
          `- Interactive Elements: ${context.browserState.elements.length} found`
        );

        // Show first few elements
        const preview = context.browserState.elements
          .slice(0, 5)
          .map(
            (el) =>
              `  [${el.index}] ${el.type}: "${el.text}" ${el.visible ? '(visible)' : '(hidden)'}`
          )
          .join('\n');

        parts.push(preview);

        if (context.browserState.elements.length > 5) {
          parts.push(
            `  ... and ${context.browserState.elements.length - 5} more elements`
          );
        }
      }

      parts.push('');
    }

    // Note: Conversation history is managed automatically by NeuroLink via sessionId
    // No need to manually include previous actions here

    // Instructions for this iteration
    parts.push('INSTRUCTIONS:');

    if (context.isLastStep) {
      parts.push('- This is your FINAL iteration');
      parts.push('- You MUST conclude: either TASK COMPLETE or TASK FAILED');
      parts.push('- Do NOT request more iterations');
    } else {
      parts.push('- Analyze the current state');
      parts.push('- Decide on the next action');
      parts.push('- Use available tools to execute the action');
      parts.push('- If task is complete, say "TASK COMPLETE"');
      parts.push('- If stuck, say "TASK FAILED" and explain why');
    }

    return parts.join('\n');
  }

  /**
   * Build a complete prompt for the iteration
   */
  static build(context: PromptContext): {
    systemPrompt: string;
    userPrompt: string;
  } {
    return {
      systemPrompt: this.buildSystemPrompt(context.isLastStep),
      userPrompt: this.buildUserPrompt(context),
    };
  }

  /**
   * Extract task completion status from LLM response
   */
  static parseResponse(response: string): {
    isComplete: boolean;
    isFailed: boolean;
    observation?: string;
    reasoning?: string;
    action?: string;
  } {
    const lowerResponse = response.toLowerCase();

    // Check for completion
    const isComplete =
      lowerResponse.includes('task complete') ||
      lowerResponse.includes('successfully completed') ||
      lowerResponse.includes('task finished');

    // Check for failure
    const isFailed =
      lowerResponse.includes('task failed') ||
      lowerResponse.includes('cannot complete') ||
      lowerResponse.includes('unable to proceed');

    // Extract structured parts
    const observation = this.extractSection(response, 'OBSERVATION');
    const reasoning = this.extractSection(response, 'REASONING');
    const action = this.extractSection(response, 'ACTION');

    return {
      isComplete,
      isFailed,
      observation,
      reasoning,
      action,
    };
  }

  /**
   * Extract a section from structured response
   */
  private static extractSection(response: string, sectionName: string): string | undefined {
    const pattern = new RegExp(`${sectionName}:([^\\n]+(?:\\n(?![A-Z]+:)[^\\n]+)*)`, 'i');
    const match = response.match(pattern);
    return match?.[1]?.trim();
  }
}
