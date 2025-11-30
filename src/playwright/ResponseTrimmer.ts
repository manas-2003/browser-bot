/**
 * Response Trimmer - Intelligent filtering of Playwright MCP responses
 *
 * Based on browser-use's proven filtering strategies:
 * - Remove keyboard shortcuts and skip navigation
 * - Remove deep nested generic containers
 * - Keep only interactive leaf elements
 * - Remove hidden elements
 * - Flatten structure for LLM consumption
 *
 * Target: 85%+ reduction (165k → <10k chars)
 */

interface YAMLElement {
  type: string;
  name?: string;
  role?: string;
  value?: string;
  ref?: string;
  url?: string;
  text?: string;
  visible?: boolean;
  children?: YAMLElement[];
}

/**
 * Response Trimmer - Applies browser-use filtering strategies to Playwright snapshots
 */
export class ResponseTrimmer {

  // Non-interactive roles to skip
  private readonly SKIP_ROLES = new Set([
    'separator',
    'none',
    'presentation',
    'generic', // Too many of these, mostly noise
  ]);

  // Interactive roles to KEEP
  private readonly INTERACTIVE_ROLES = new Set([
    'button',
    'link',
    'textbox',
    'searchbox',
    'combobox',
    'listbox',
    'checkbox',
    'radio',
    'tab',
    'menuitem',
    'option',
    'slider',
    'spinbutton',
  ]);

  // Skip navigation keywords (browser-use style)
  private readonly SKIP_NAVIGATION_KEYWORDS = [
    'skip to',
    'skip navigation',
    'keyboard shortcuts',
    'accessibility',
  ];

  /**
   * Main entry point: Trim a Playwright snapshot response
   */
  trimSnapshot(response: any): any {
    if (!response || !Array.isArray(response)) {
      return response;
    }

    const trimmedContent: any[] = [];

    for (const item of response) {
      if (item.type === 'text' && item.text) {
        // Parse YAML and trim
        const trimmedText = this.trimYAMLSnapshot(item.text);
        trimmedContent.push({
          type: 'text',
          text: trimmedText,
        });
      } else {
        // Pass through other types as-is
        trimmedContent.push(item);
      }
    }

    return trimmedContent;
  }

  /**
   * Trim YAML accessibility tree snapshot
   */
  private trimYAMLSnapshot(yamlText: string): string {
    const lines = yamlText.split('\n');

    // Extract URL and Title from first few lines
    let url = '';
    let title = '';

    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i];
      if (line && line.includes('URL:')) {
        url = line.split('URL:')[1]?.trim() || '';
      } else if (line && line.includes('Title:')) {
        title = line.split('Title:')[1]?.trim() || '';
      }
    }

    // Build simplified output
    const output: string[] = [];

    if (url) {
      output.push(`URL: ${url}`);
    }
    if (title) {
      output.push(`Title: ${title}`);
    }
    output.push('');
    output.push('Interactive Elements (use ref value without brackets for Playwright tools):');
    output.push('');

    // Parse and filter YAML tree
    let inSkipSection = false;
    let skipDepth = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip empty lines
      if (!trimmedLine) continue;

      // Skip metadata lines
      if (trimmedLine.startsWith('URL:') || trimmedLine.startsWith('Title:') ||
          trimmedLine.startsWith('Page Loaded:')) {
        continue;
      }

      // Detect skip navigation sections
      const lowerLine = trimmedLine.toLowerCase();
      if (this.SKIP_NAVIGATION_KEYWORDS.some(keyword => lowerLine.includes(keyword))) {
        inSkipSection = true;
        skipDepth = this.getIndentLevel(line);
        continue;
      }

      // Exit skip section when indentation decreases
      if (inSkipSection) {
        const currentDepth = this.getIndentLevel(line);
        if (currentDepth <= skipDepth) {
          inSkipSection = false;
        } else {
          continue; // Still in skip section
        }
      }

      // Extract element info
      const element = this.parseYAMLLine(trimmedLine);

      if (!element) continue;

      // Filter out non-interactive elements
      if (!this.isInteractive(element)) {
        continue;
      }

      // Format for output
      const formatted = this.formatElement(element);
      if (formatted) {
        output.push(formatted);
      }
    }

    // Add summary
    output.push('');
    output.push(`Total interactive elements: ${output.filter(l => l.startsWith('[')).length}`);

    return output.join('\n');
  }

  /**
   * Get indentation level of a line
   */
  private getIndentLevel(line: string): number {
    let level = 0;
    for (const char of line) {
      if (char === ' ') level++;
      else if (char === '\t') level += 2;
      else break;
    }
    return level;
  }

  /**
   * Parse a single YAML line into element info
   */
  private parseYAMLLine(line: string): YAMLElement | null {
    // Extract role and name
    // Format: - button "Click me" [ref=e123]:
    //         - link "Home" [ref=e456]:

    const roleMatch = line.match(/^-\s+(\w+)/);
    if (!roleMatch) return null;

    const role = roleMatch[1];
    const nameMatch = line.match(/"([^"]+)"/);
    const name = nameMatch ? nameMatch[1] : '';
    const refMatch = line.match(/\[ref=(\w+)\]/);
    const ref = refMatch ? refMatch[1] : '';
    const urlMatch = line.match(/\/url:\s*"?([^"\s]+)"?/);
    const url = urlMatch ? urlMatch[1] : '';
    const hiddenMatch = line.match(/\(hidden\)/);
    const visible = !hiddenMatch;

    return {
      type: 'element',
      role,
      name,
      ref,
      url,
      visible,
    };
  }

  /**
   * Check if element is interactive and should be kept
   */
  private isInteractive(element: YAMLElement): boolean {
    // Remove hidden elements
    if (!element.visible) {
      return false;
    }

    // Keep elements with interactive roles
    if (element.role && this.INTERACTIVE_ROLES.has(element.role)) {
      return true;
    }

    // Remove non-interactive roles
    if (element.role && this.SKIP_ROLES.has(element.role)) {
      return false;
    }

    // Keep elements with URLs (likely links)
    if (element.url) {
      return true;
    }

    // Keep elements with meaningful names
    if (element.name && element.name.length > 2) {
      return true;
    }

    return false;
  }

  /**
   * Format element for LLM consumption
   */
  private formatElement(element: YAMLElement): string | null {
    if (!element.ref) return null;

    const parts: string[] = [];

    // Add reference ID
    parts.push(`[${element.ref}]`);

    // Add role
    if (element.role) {
      parts.push(element.role);
    }

    // Add name/label
    if (element.name) {
      parts.push(`"${element.name}"`);
    }

    // Add URL if present
    if (element.url) {
      parts.push(`→ ${element.url}`);
    }

    return parts.join(' ');
  }
}
