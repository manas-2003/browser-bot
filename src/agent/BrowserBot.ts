/**
 * BrowserBot - Autonomous Browser Automation Agent
 *
 * Main agent class that orchestrates the autonomous loop:
 * 1. Initialize NeuroLink with Playwright MCP (external server)
 * 2. Loop: Stream LLM responses with automatic tool execution
 * 3. Track progress and exit when done
 *
 * NeuroLink handles EVERYTHING:
 * - Conversation memory with automatic summarization
 * - Tool execution (Playwright MCP)
 * - Streaming responses
 */

import { NeuroLinkClient } from '../neurolink/NeuroLinkClient.js';
import { PromptBuilder } from './PromptBuilder.js';
import { StateManager } from './StateManager.js';
import type { TaskResult, RunOptions } from '../types/index.js';

/**
 * Main BrowserBot agent
 */
export class BrowserBot {
  private neurolink: NeuroLinkClient;
  private stateManager: StateManager;
  private sessionId: string;

  constructor() {
    this.neurolink = new NeuroLinkClient();
    this.stateManager = new StateManager();
    this.sessionId = `browser-bot-${Date.now()}`; // Unique session ID per run
  }

  /**
   * Initialize the agent and Playwright MCP
   */
  async initialize(): Promise<void> {
    console.log('\n🤖 Initializing BrowserBot...\n');
    await this.neurolink.initialize();
    console.log('✅ BrowserBot ready\n');
  }

  /**
   * Run the autonomous agent loop
   */
  async run(task: string, options?: RunOptions): Promise<TaskResult> {
    console.log('═'.repeat(70));
    console.log('🤖 BROWSERBOT AUTONOMOUS AGENT');
    console.log('═'.repeat(70));
    console.log(`📋 Task: ${task}`);
    console.log(`⚙️  Max Steps: ${options?.maxSteps ?? 100}`);
    console.log('═'.repeat(70));
    console.log('');

    // Initialize state manager with options
    if (options?.maxSteps) {
      this.stateManager = new StateManager({ maxSteps: options.maxSteps });
    }

    // Check if this is a media task (play/video/music) - use word boundaries
    const taskLower = task.toLowerCase();
    const isMediaTask = /\b(play|video|music|youtube|song)\b/.test(taskLower);

    console.log(`[BrowserBot] Media detection: ${isMediaTask} (task: "${task.substring(0, 50)}...")`);

    // Main agent loop - NeuroLink manages conversation and tools
    console.log(`\n🔁 Starting agent loop (max ${this.stateManager.getMaxSteps()} steps)\n`);

    while (this.stateManager.shouldContinue()) {
      this.stateManager.nextStep();
      const currentStep = this.stateManager.getCurrentStep();

      console.log(`\n${'─'.repeat(70)}`);
      console.log(`🔄 ITERATION ${currentStep}`);
      console.log(`📊 ${this.stateManager.getSummary()}`);
      console.log(`${'─'.repeat(70)}\n`);

      try {
        // Build prompt with context
        const prompt = this.buildPrompt(task, currentStep);

        // Stream LLM response - NeuroLink automatically executes tools
        const llmResponse = await this.streamLLMDecision(prompt);

        // Evaluate response
        const evaluation = this.evaluateResponse(llmResponse);

        // Update state based on evaluation
        if (evaluation.isComplete) {
          console.log('\n✅ TASK COMPLETE!');
          console.log(`📝 ${evaluation.message}`);
          console.log('\n' + '═'.repeat(70));
          console.log('📋 FINAL ANALYSIS:');
          console.log('═'.repeat(70));
          console.log(llmResponse);
          console.log('═'.repeat(70));
          this.stateManager.markComplete();
          break;
        }

        if (evaluation.isFailed) {
          console.log('\n❌ TASK FAILED');
          console.log(`📝 ${evaluation.message}`);
          this.stateManager.markFailed();
          break;
        }

        // Record success for this iteration
        console.log(`[BrowserBot] Recording success and continuing to next iteration...`);
        this.stateManager.recordSuccess();

        console.log(`\n💭 LLM Response:\n${llmResponse.substring(0, 200)}...`);
        console.log(`[BrowserBot] ✅ Iteration ${currentStep} completed successfully\n`);
      } catch (error) {
        console.error(`\n❌ Error in iteration ${currentStep}:`, error);
        console.error(`[BrowserBot] Error details:`, error instanceof Error ? error.message : 'Unknown error');
        this.stateManager.recordFailure();

        // If too many consecutive failures, stop
        if (
          this.stateManager.getConsecutiveFailures() >=
          (options?.maxFailures ?? 3)
        ) {
          console.log('\n❌ Too many consecutive failures. Stopping.');
          console.log(`[BrowserBot] Consecutive failures: ${this.stateManager.getConsecutiveFailures()}`);
          break;
        }
        console.log(`[BrowserBot] Continuing after error (failures: ${this.stateManager.getConsecutiveFailures()}/${options?.maxFailures ?? 3})`);
      }
    }

    console.log(`\n[BrowserBot] 🛑 Agent loop ended`);
    console.log(`[BrowserBot] Reason: ${this.stateManager.getExitReason()}`);
    console.log(`[BrowserBot] Total steps: ${this.stateManager.getCurrentStep()}\n`);

    // If this was a media task and it succeeded, check if we're still on a media page
    if (isMediaTask && this.stateManager.getExitReason() === 'success') {
      // Get current URL to check if still on media site
      const currentUrl = await this.getCurrentUrl();
      const isOnMediaSite = currentUrl.includes('youtube.com/watch') ||
                           currentUrl.includes('vimeo.com') ||
                           currentUrl.includes('spotify.com') ||
                           currentUrl.includes('soundcloud.com');

      if (isOnMediaSite) {
        console.log('\n🎵 Media is now playing!');
        console.log('   Browser will stay open until you close it.\n');

        // Import readline for user input
        const readline = await import('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        await new Promise<void>((resolve) => {
          rl.question('Press Enter when you want to close the browser and stop playback... ', () => {
            rl.close();
            resolve();
          });
        });

        console.log('\n🛑 Closing browser...\n');
      }
    }

    // Build final result
    return this.buildResult(task);
  }

  /**
   * Build the prompt for this iteration
   * Note: Conversation history is managed by NeuroLink via sessionId
   */
  private buildPrompt(
    task: string,
    currentStep: number
  ): { systemPrompt: string; userPrompt: string } {
    return PromptBuilder.build({
      task,
      currentStep,
      maxSteps: this.stateManager.getMaxSteps(),
      browserState: {
        url: 'Browser controlled via Playwright MCP',
        title: 'Use Playwright MCP tools to interact with browser',
        loaded: true,
        elements: [],
      },
      isLastStep: this.stateManager.isLastStep(),
    });
  }

  /**
   * Stream LLM response with automatic tool execution
   * NeuroLink handles tool execution automatically
   */
  private async streamLLMDecision(prompt: {
    systemPrompt: string;
    userPrompt: string;
  }): Promise<string> {
    console.log(`[BrowserBot] Session ID: ${this.sessionId}`);
    console.log(`[BrowserBot] Streaming LLM response with auto tool execution...`);

    const streamResponse = await this.neurolink.stream({
      prompt: prompt.userPrompt,
      systemPrompt: prompt.systemPrompt,
      temperature: 0.7,
      maxTokens: 4000,
      sessionId: this.sessionId,
    });

    // Process streaming response
    let accumulatedResponse = '';
    const toolsUsed: string[] = [];

    for await (const chunk of streamResponse.stream) {
      if (chunk && typeof chunk === 'object') {
        // Handle content chunks
        if ('content' in chunk && typeof chunk.content === 'string') {
          accumulatedResponse += chunk.content;
          process.stdout.write(chunk.content); // Real-time streaming output
        }

        // Handle tool execution events
        if ('toolExecution' in chunk && chunk.toolExecution) {
          const toolExecution = chunk.toolExecution as any;
          if (toolExecution.type === 'tool:start') {
            console.log(`\n🔧 Tool started: ${toolExecution.tool}`);
            if (!toolsUsed.includes(toolExecution.tool)) {
              toolsUsed.push(toolExecution.tool);
            }
          } else if (toolExecution.type === 'tool:end') {
            if (toolExecution.error) {
              console.log(`⚠️  Tool error: ${toolExecution.tool} - ${toolExecution.error}`);
            } else {
              console.log(`✅ Tool completed: ${toolExecution.tool}`);
            }
          }
        }
      }
    }

    if (toolsUsed.length > 0) {
      console.log(`\n\n🔧 Tools used: ${toolsUsed.join(', ')}\n`);
    }

    return accumulatedResponse;
  }

  /**
   * Evaluate LLM response
   */
  private evaluateResponse(response: string): {
    isComplete: boolean;
    isFailed: boolean;
    message: string;
  } {
    const parsed = PromptBuilder.parseResponse(response);

    if (parsed.isComplete) {
      return {
        isComplete: true,
        isFailed: false,
        message: 'Task completed successfully',
      };
    }

    if (parsed.isFailed) {
      return {
        isComplete: false,
        isFailed: true,
        message: 'Task failed or cannot be completed',
      };
    }

    return {
      isComplete: false,
      isFailed: false,
      message: 'Continuing...',
    };
  }

  /**
   * Get current browser URL
   */
  private async getCurrentUrl(): Promise<string> {
    try {
      const result = await this.neurolink.getNeuroLink().mcp.callTool({
        name: 'browser_snapshot',
        arguments: {},
      });

      // Extract URL from snapshot if available
      const content = result.content[0];
      if (content.type === 'text') {
        const urlMatch = content.text.match(/URL: (https?:\/\/[^\n]+)/);
        return urlMatch ? urlMatch[1] : '';
      }
      return '';
    } catch {
      return '';
    }
  }

  /**
   * Build final task result
   */
  private buildResult(_task: string): TaskResult {
    const state = this.stateManager.getState();
    const exitReason = this.stateManager.getExitReason();

    // Get conversation history from NeuroLink session
    const memory = this.neurolink.getNeuroLink().conversationMemory;
    let conversationHistory: Array<{role: 'user' | 'assistant' | 'system'; content: string; timestamp: Date}> = [];

    if (memory && 'getSession' in memory) {
      const session = memory.getSession(this.sessionId);
      if (session) {
        conversationHistory = session.messages.map((msg: any) => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
          timestamp: new Date(),
        }));
      }
    }

    return {
      success: state.isDone,
      message:
        exitReason === 'success'
          ? 'Task completed successfully'
          : `Task stopped: ${exitReason}`,
      stepsTaken: state.currentStep,
      conversationHistory,
      exitReason,
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.neurolink.cleanup();
  }
}
