/**
 * NeuroLink Client - LLM with Trimmed Tool Responses
 *
 * Handles:
 * - Initialization of NeuroLink SDK WITHOUT conversation memory
 * - Registration of Playwright tools WITH response trimming
 * - Automatic tool execution with trimmed responses sent to LLM
 * - Streaming LLM responses
 */

import { NeuroLink } from '@juspay/neurolink';
import { PlaywrightClient } from '../playwright/PlaywrightClient.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Streaming response from NeuroLink
 */
export interface StreamResponse {
  stream: AsyncIterable<StreamChunk>;
  sessionId?: string;
}

/**
 * Stream chunk from NeuroLink
 */
export interface StreamChunk {
  content?: string;
  type?: string;
  audio?: any;
  toolExecution?: {
    type: 'tool:start' | 'tool:end';
    tool: string;
    error?: string;
  };
}

/**
 * Options for stream call
 */
export interface StreamOptions {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  sessionId?: string;
}

/**
 * NeuroLink Client - LLM with trimmed tool responses
 */
export class NeuroLinkClient {
  private neurolink: NeuroLink;
  private initialized: boolean = false;
  private readonly provider: string;
  private readonly model: string;
  private playwrightClient: PlaywrightClient;

  constructor() {
    // Validate environment variables
    if (!process.env.AZURE_OPENAI_API_KEY) {
      throw new Error('AZURE_OPENAI_API_KEY not found in environment variables');
    }
    if (!process.env.AZURE_OPENAI_ENDPOINT) {
      throw new Error('AZURE_OPENAI_ENDPOINT not found in environment variables');
    }

    // Initialize NeuroLink WITHOUT conversation memory
    // DISABLED: Conversation memory causes context overflow due to large browser snapshots
    this.neurolink = new NeuroLink({
      conversationMemory: {
        enabled: false,  // DISABLED to avoid context overflow
      },
    });

    // Use Azure provider
    this.provider = process.env.LLM_PROVIDER || 'azure';
    this.model = process.env.LLM_MODEL || process.env.AZURE_OPENAI_MODEL || 'gpt-4o-automatic';

    // Initialize Playwright client for tool execution
    this.playwrightClient = new PlaywrightClient();
  }

  /**
   * Initialize NeuroLink and register Playwright tools with response trimming
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('🔧 Initializing NeuroLink with trimmed Playwright tools...');

    // Initialize Playwright client
    await this.playwrightClient.initialize();

    // Get available tools
    const tools = await this.playwrightClient.listTools();
    console.log(`📋 Found ${tools.length} Playwright tools`);

    // Register only essential tools with response trimming
    const essentialToolNames = [
      'browser_navigate',
      'browser_click',
      'browser_type',
      'browser_snapshot',
      'browser_fill_form',
      'browser_take_screenshot',
      'browser_wait_for',
    ];

    const toolsToRegister = tools
      .filter(tool => essentialToolNames.includes(tool.name))
      .map(tool => ({
        name: tool.name,
        tool: {
          description: tool.description || `Playwright ${tool.name}`,
          inputSchema: {
            type: 'object',
            properties: {
              url: { type: 'string' },
              selector: { type: 'string' },
              text: { type: 'string' },
              element: { type: 'string' },
              timeout: { type: 'number' },
            },
          },
          execute: async (params: unknown) => {
            console.log(`\n🔧 Executing ${tool.name} with trimming...`);

            // Execute tool through PlaywrightClient (auto-trims responses)
            const result = await this.playwrightClient.executeTool(
              tool.name,
              params as Record<string, unknown>
            );

            // Return trimmed content
            return result.content;
          },
        },
      }));

    // Register tools with NeuroLink
    this.neurolink.registerTools(toolsToRegister as any);
    console.log(`✅ Registered ${toolsToRegister.length} tools with response trimming`);
    console.log(`   🎭 Tools: ${toolsToRegister.map(t => t.name).join(', ')}`);

    this.initialized = true;
  }

  /**
   * Stream LLM response with automatic tool execution (trimmed responses)
   */
  async stream(options: StreamOptions): Promise<StreamResponse> {
    if (!this.initialized) {
      throw new Error('NeuroLinkClient not initialized. Call initialize() first.');
    }

    try {
      // Debug: Log prompt sizes
      const promptLength = options.prompt.length;
      const systemPromptLength = options.systemPrompt?.length || 0;
      console.log(`[NeuroLinkClient] Prompt sizes - User: ${promptLength} chars, System: ${systemPromptLength} chars`);
      console.log(`[NeuroLinkClient] Estimated tokens: ~${Math.ceil((promptLength + systemPromptLength) / 4)}`);

      // Add Playwright MCP usage instructions to system prompt
      const playwrightInstructions = `\n\nIMPORTANT - Playwright Tool Usage:
When using Playwright tools (browser_click, browser_type, etc.), you must provide BOTH:
1. 'element': A human-readable description of the element
2. 'ref': The reference ID from the snapshot (WITHOUT brackets)

Example: If you see "[e90] searchbox 'Search Amazon'", use:
- element: "Search Amazon searchbox"
- ref: "e90"

Do NOT try to guess CSS selectors - always use the ref IDs from the browser_snapshot output.`;

      const enhancedSystemPrompt = options.systemPrompt
        ? options.systemPrompt + playwrightInstructions
        : playwrightInstructions;

      const streamResult = await this.neurolink.stream({
        input: { text: options.prompt },
        provider: this.provider,
        model: this.model,
        temperature: options.temperature ?? 0.7,
        maxTokens: options.maxTokens ?? 4000,
        systemPrompt: enhancedSystemPrompt,
        disableTools: false, // Enable tools - but with trimmed responses
        // NO session ID - we want stateless calls to avoid context accumulation
      } as any);

      return {
        stream: streamResult.stream,
        sessionId: options.sessionId,
      };
    } catch (error) {
      console.error('❌ Stream Error:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Get the NeuroLink instance for direct access
   */
  getNeuroLink() {
    return this.neurolink;
  }

  /**
   * Check if NeuroLink is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get the current provider name
   */
  getProvider(): string {
    return this.provider;
  }

  /**
   * Get the current model name
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    await this.playwrightClient.cleanup();
    this.initialized = false;
  }
}
