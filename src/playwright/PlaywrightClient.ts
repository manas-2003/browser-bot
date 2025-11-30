/**
 * Playwright Client - Direct MCP tool execution
 *
 * Handles:
 * - Connection to Playwright MCP server
 * - Direct tool execution (navigate, click, type, snapshot, etc.)
 * - Response trimming via ResponseTrimmer
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { ResponseTrimmer } from './ResponseTrimmer.js';

export interface PlaywrightToolResult {
  content: any;
  trimmed?: boolean;
  originalSize?: number;
  trimmedSize?: number;
}

/**
 * Playwright Client - Manages Playwright MCP connection and tool execution
 */
export class PlaywrightClient {
  private mcpClient?: Client;
  private initialized: boolean = false;
  private responseTrimmer: ResponseTrimmer;

  constructor() {
    this.responseTrimmer = new ResponseTrimmer();
  }

  /**
   * Initialize connection to Playwright MCP server
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      console.log('🎭 Initializing Playwright MCP client...');

      // Build MCP server arguments
      const mcpArgs = ['node_modules/@playwright/mcp/cli.js'];

      // Add user data directory if specified in env
      const userDataDir = process.env.CHROME_USER_DATA_DIR;
      if (userDataDir) {
        console.log(`📁 Using Chrome profile: ${userDataDir}`);
        mcpArgs.push('--user-data-dir', userDataDir);
      } else {
        console.log('📁 Using temporary Chrome profile');
      }

      // Connect to Playwright MCP server
      const transport = new StdioClientTransport({
        command: 'node',
        args: mcpArgs,
      });

      this.mcpClient = new Client(
        {
          name: 'browser-bot',
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      await this.mcpClient.connect(transport);
      console.log('✅ Connected to Playwright MCP');

      this.initialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize Playwright MCP:', error);
      throw error;
    }
  }

  /**
   * Handle media wait with interactive skip option
   */
  private async handleMediaWait(timeoutMs: number): Promise<PlaywrightToolResult> {
    const durationSec = Math.floor(timeoutMs / 1000);
    const minutes = Math.floor(durationSec / 60);
    const seconds = durationSec % 60;

    console.log(`\n🎵 Media is playing (${minutes}m ${seconds}s)`);
    console.log(`⏱️  Press Enter to skip, or wait for playback to finish...\n`);

    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    let skipped = false;
    let elapsed = 0;
    const startTime = Date.now();

    // Set up readline listener for Enter key
    const skipPromise = new Promise<void>((resolve) => {
      rl.on('line', () => {
        skipped = true;
        rl.close();
        resolve();
      });
    });

    // Timer to update progress every second
    const progressInterval = setInterval(() => {
      elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = durationSec - elapsed;
      const remMin = Math.floor(remaining / 60);
      const remSec = remaining % 60;

      process.stdout.write(`\r⏱️  ${remMin}m ${remSec}s remaining... (Press Enter to skip)`);

      if (elapsed >= durationSec) {
        clearInterval(progressInterval);
        rl.close();
      }
    }, 1000);

    // Wait for either timeout or user skip
    await Promise.race([
      skipPromise,
      new Promise(resolve => setTimeout(resolve, timeoutMs))
    ]);

    clearInterval(progressInterval);
    rl.close();

    if (skipped) {
      console.log(`\n\n⏭️  Skipped! (watched ${Math.floor(elapsed / 60)}m ${elapsed % 60}s)\n`);
    } else {
      console.log(`\n\n✅ Playback completed!\n`);
    }

    return {
      content: [{
        type: 'text',
        text: skipped
          ? `⏭️ Media playback skipped by user after ${elapsed}s`
          : `✅ Waited for ${durationSec}s media playback to complete`
      }],
      trimmed: true,
      originalSize: 100,
      trimmedSize: 100,
    };
  }

  /**
   * Execute a Playwright tool with automatic response trimming
   */
  async executeTool(
    toolName: string,
    params: Record<string, unknown>
  ): Promise<PlaywrightToolResult> {
    if (!this.initialized || !this.mcpClient) {
      throw new Error('PlaywrightClient not initialized. Call initialize() first.');
    }

    console.log(`🔧 Executing tool: ${toolName}`);
    console.log(`   Parameters:`, JSON.stringify(params, null, 2));

    // Special handling for browser_wait_for with timeout (media playback)
    if (toolName === 'browser_wait_for' && params.timeout && !params.text) {
      return await this.handleMediaWait(params.timeout as number);
    }

    try {
      const result = await this.mcpClient.callTool({
        name: toolName,
        arguments: params,
      });

      const originalContent = result.content;
      const originalSize = JSON.stringify(originalContent).length;

      // Trim response if it's a browser_snapshot
      if (toolName === 'browser_snapshot') {
        console.log(`📊 Original snapshot size: ${originalSize} chars`);
        const trimmedContent = this.responseTrimmer.trimSnapshot(originalContent);
        const trimmedSize = JSON.stringify(trimmedContent).length;

        console.log(`✂️  Trimmed snapshot size: ${trimmedSize} chars`);
        console.log(`📉 Reduction: ${((1 - trimmedSize / originalSize) * 100).toFixed(1)}%`);

        return {
          content: trimmedContent,
          trimmed: true,
          originalSize,
          trimmedSize,
        };
      }

      // For ALL other tools - return minimal success message instead of full response
      // This prevents context accumulation from tool results
      console.log(`✅ Tool executed successfully (${originalSize} chars response trimmed to minimal)`);

      return {
        content: [{
          type: 'text',
          text: `✅ ${toolName} executed successfully`
        }],
        trimmed: true,
        originalSize,
        trimmedSize: 50,
      };
    } catch (error) {
      console.error(`❌ Tool execution failed: ${toolName}`, error);
      throw error;
    }
  }

  /**
   * Get list of available tools
   */
  async listTools(): Promise<Array<{ name: string; description?: string }>> {
    if (!this.initialized || !this.mcpClient) {
      throw new Error('PlaywrightClient not initialized. Call initialize() first.');
    }

    const toolsResponse = await this.mcpClient.listTools();
    return toolsResponse.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
    }));
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Cleanup and close connection
   */
  async cleanup(): Promise<void> {
    if (this.mcpClient) {
      await this.mcpClient.close();
    }
    this.initialized = false;
  }
}
