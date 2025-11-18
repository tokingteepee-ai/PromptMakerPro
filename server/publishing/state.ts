/**
 * Publishing State Machine
 * Manages the state transitions for the publishing process
 */

export enum PublishingState {
  DRAFT = 'DRAFT',
  PREFLIGHT = 'PREFLIGHT',
  READY_TO_PUBLISH = 'READY_TO_PUBLISH',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED'
}

export interface StateTransition {
  from: PublishingState;
  to: PublishingState;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export class PublishingStateMachine {
  private currentState: PublishingState;
  private history: StateTransition[] = [];
  private metadata: Record<string, unknown> = {};

  constructor(initialState: PublishingState = PublishingState.DRAFT) {
    this.currentState = initialState;
  }

  /**
   * Get the current state
   */
  getState(): PublishingState {
    return this.currentState;
  }

  /**
   * Get the state history
   */
  getHistory(): StateTransition[] {
    return [...this.history];
  }

  /**
   * Get metadata
   */
  getMetadata(): Record<string, unknown> {
    return { ...this.metadata };
  }

  /**
   * Set metadata
   */
  setMetadata(key: string, value: unknown): void {
    this.metadata[key] = value;
  }

  /**
   * Transition to a new state
   */
  transition(to: PublishingState, metadata?: Record<string, unknown>): boolean {
    // Define valid transitions
    const validTransitions: Record<PublishingState, PublishingState[]> = {
      [PublishingState.DRAFT]: [PublishingState.PREFLIGHT],
      [PublishingState.PREFLIGHT]: [PublishingState.READY_TO_PUBLISH, PublishingState.FAILED],
      [PublishingState.READY_TO_PUBLISH]: [PublishingState.PUBLISHED, PublishingState.FAILED],
      [PublishingState.PUBLISHED]: [PublishingState.DRAFT], // Can start new draft after publishing
      [PublishingState.FAILED]: [PublishingState.DRAFT, PublishingState.PREFLIGHT] // Can retry from failed state
    };

    const allowedTransitions = validTransitions[this.currentState] || [];
    
    if (!allowedTransitions.includes(to)) {
      return false;
    }

    // Record the transition
    this.history.push({
      from: this.currentState,
      to,
      timestamp: new Date(),
      metadata
    });

    this.currentState = to;
    
    // Store transition metadata
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        this.setMetadata(key, value);
      });
    }

    return true;
  }

  /**
   * Check if a transition is valid
   */
  canTransition(to: PublishingState): boolean {
    const validTransitions: Record<PublishingState, PublishingState[]> = {
      [PublishingState.DRAFT]: [PublishingState.PREFLIGHT],
      [PublishingState.PREFLIGHT]: [PublishingState.READY_TO_PUBLISH, PublishingState.FAILED],
      [PublishingState.READY_TO_PUBLISH]: [PublishingState.PUBLISHED, PublishingState.FAILED],
      [PublishingState.PUBLISHED]: [PublishingState.DRAFT],
      [PublishingState.FAILED]: [PublishingState.DRAFT, PublishingState.PREFLIGHT]
    };

    const allowedTransitions = validTransitions[this.currentState] || [];
    return allowedTransitions.includes(to);
  }

  /**
   * Reset the state machine
   */
  reset(): void {
    this.currentState = PublishingState.DRAFT;
    this.history = [];
    this.metadata = {};
  }
}