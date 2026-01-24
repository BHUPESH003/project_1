/**
 * Order State Machine Module Exports
 *
 * Central export point for state machine functionality.
 */

export { OrderStateMachineService } from './order-state-machine.service';
export { OrderStateMachineModule } from './order-state-machine.module';
export {
  ORDER_STATE_TRANSITIONS,
  isValidTransition,
  getValidNextStates,
  isTerminalState,
  isFailureState,
} from './order-state-machine.types';
export type { TransitionOptions, TransitionResult } from './order-state-machine.service';
