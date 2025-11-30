/**
 * Browser Type Definitions
 *
 * Simplified types for browser state representation.
 * Actual browser interaction is handled directly by Playwright MCP.
 */

/**
 * Browser State - Placeholder representation of browser state
 * In the current architecture, browser state is managed by Playwright MCP
 */
export interface BrowserState {
  /** Current URL or description */
  url: string;

  /** Page title or description */
  title?: string;

  /** Interactive elements (currently unused, kept for compatibility) */
  elements?: BrowserElement[];

  /** Whether the page is loaded */
  loaded: boolean;
}

/**
 * Browser Element - Represents an interactive element
 * Currently unused but kept for type compatibility
 */
export interface BrowserElement {
  /** Element index/ID for interaction */
  index: number;

  /** Element type (button, input, link, etc.) */
  type: string;

  /** Element text content */
  text: string;

  /** Whether element is visible */
  visible: boolean;
}
