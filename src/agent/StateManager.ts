/**
 * State Manager
 *
 * Phase 3: Agent Core Components
 *
 * Manages the agent's state across iterations:
 * - Current step number
 * - Consecutive failures count
 * - Success/failure status
 * - Exit conditions
 */

import type { AgentState, ExitReason } from '../types/index.js';

export interface StateManagerConfig {
  maxSteps?: number;
  maxConsecutiveFailures?: number;
}

/**
 * Manages agent state and determines when to stop
 */
export class StateManager {
  private state: AgentState;
  private readonly maxConsecutiveFailures: number;

  constructor(config: StateManagerConfig = {}) {
    this.maxConsecutiveFailures = config.maxConsecutiveFailures ?? 3;

    this.state = {
      currentStep: 0,
      maxSteps: config.maxSteps ?? 100,
      consecutiveFailures: 0,
      isDone: false,
      shouldStop: false,
    };
  }

  /**
   * Start a new iteration
   */
  nextStep(): void {
    this.state.currentStep++;
  }

  /**
   * Record a successful action
   */
  recordSuccess(): void {
    this.state.consecutiveFailures = 0;
  }

  /**
   * Record a failed action
   */
  recordFailure(): void {
    this.state.consecutiveFailures++;

    // Check if we've hit max consecutive failures
    if (this.state.consecutiveFailures >= this.maxConsecutiveFailures) {
      this.state.shouldStop = true;
    }
  }

  /**
   * Mark task as complete
   */
  markComplete(): void {
    this.state.isDone = true;
    this.state.shouldStop = true;
  }

  /**
   * Mark task as failed
   */
  markFailed(): void {
    this.state.shouldStop = true;
  }

  /**
   * Check if agent should continue
   */
  shouldContinue(): boolean {
    // Stop if explicitly told to stop
    if (this.state.shouldStop) {
      return false;
    }

    // Stop if task is done
    if (this.state.isDone) {
      return false;
    }

    // Stop if max steps reached
    if (this.state.currentStep >= this.state.maxSteps) {
      return false;
    }

    return true;
  }

  /**
   * Check if this is the last allowed step
   */
  isLastStep(): boolean {
    return this.state.currentStep >= this.state.maxSteps - 1;
  }

  /**
   * Get the exit reason
   */
  getExitReason(): ExitReason {
    if (this.state.isDone) {
      return 'success';
    }

    if (this.state.consecutiveFailures >= this.maxConsecutiveFailures) {
      return 'max_failures';
    }

    if (this.state.currentStep >= this.state.maxSteps) {
      return 'max_steps';
    }

    if (this.state.shouldStop) {
      return 'error';
    }

    return 'success';
  }

  /**
   * Get current state
   */
  getState(): Readonly<AgentState> {
    return { ...this.state };
  }

  /**
   * Get current step number
   */
  getCurrentStep(): number {
    return this.state.currentStep;
  }

  /**
   * Get max steps
   */
  getMaxSteps(): number {
    return this.state.maxSteps;
  }

  /**
   * Get consecutive failures count
   */
  getConsecutiveFailures(): number {
    return this.state.consecutiveFailures;
  }

  /**
   * Get progress percentage
   */
  getProgress(): number {
    return Math.round((this.state.currentStep / this.state.maxSteps) * 100);
  }

  /**
   * Get state summary for logging
   */
  getSummary(): string {
    const progress = this.getProgress();
    const failures = this.state.consecutiveFailures;

    return `Step ${this.state.currentStep}/${this.state.maxSteps} (${progress}%) | Consecutive failures: ${failures}/${this.maxConsecutiveFailures}`;
  }

  /**
   * Reset state (for testing)
   */
  reset(): void {
    this.state = {
      currentStep: 0,
      maxSteps: this.state.maxSteps,
      consecutiveFailures: 0,
      isDone: false,
      shouldStop: false,
    };
  }
}
