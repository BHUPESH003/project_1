# Order State Machine Module

## Overview

The Order State Machine is the **single source of truth** for all order state transitions. All order state changes MUST go through `OrderStateMachineService`.

## Architecture

```
OrdersService
    ↓
OrderStateMachineService (validates & executes transitions)
    ↓
Prisma (updates Order + writes OrderStateHistory)
```

## Key Principles

1. **No Silent Failures**: Invalid transitions throw `BadRequestException` with clear error messages
2. **Immutable History**: Every transition is recorded in `OrderStateHistory` (never updated or deleted)
3. **Server-Side Enforcement**: State machine is enforced at the service layer, not just in the database
4. **Idempotent**: Transitioning to the same state is allowed (no-op)

## State Machine Flow

### Success Flow
```
CREATED → SELLER_SELECTED → PAID → SELLER_ACCEPTED → PREPARING → READY_FOR_PICKUP → PICKED_UP → DELIVERED
```

### Failure States (Terminal)
- `SELLER_REJECTED` → Can fallback to `SELLER_SELECTED` (select different seller)
- `ORDER_EXPIRED` → Terminal
- `DELIVERY_FAILED` → Terminal
- `USER_CANCELLED` → Terminal

## Usage

### Basic Transition

```typescript
// In OrdersService
constructor(
  private stateMachine: OrderStateMachineService,
) {}

async acceptOrder(orderId: string, userId: string) {
  // Transition from PAID to SELLER_ACCEPTED
  await this.stateMachine.transition({
    orderId,
    toState: OrderStatus.SELLER_ACCEPTED,
    triggeredBy: userId,
    reason: 'Seller accepted the order',
  });
  
  // Order status is now SELLER_ACCEPTED
  // OrderStateHistory record is automatically created
}
```

### Validate Before Transition

```typescript
// Check if transition is allowed
const canTransition = this.stateMachine.validateTransition(
  OrderStatus.PAID,
  OrderStatus.SELLER_ACCEPTED,
);

if (!canTransition) {
  throw new BadRequestException('Invalid transition');
}
```

### Assert Transition (Throws on Invalid)

```typescript
// Throws BadRequestException if invalid
this.stateMachine.assertTransitionAllowed(
  currentState,
  targetState,
);
```

### Check State Properties

```typescript
// Check if state is terminal
if (this.stateMachine.isTerminalState(OrderStatus.DELIVERED)) {
  // No further transitions allowed
}

// Check if state is failure
if (this.stateMachine.isFailureState(OrderStatus.SELLER_REJECTED)) {
  // Handle failure state
}

// Get valid next states
const nextStates = this.stateMachine.getValidNextStates(OrderStatus.PAID);
// Returns: [SELLER_ACCEPTED, SELLER_REJECTED, USER_CANCELLED]
```

### Record Initial State

```typescript
// When creating a new order
const order = await this.prisma.order.create({
  data: {
    // ... order data
    status: OrderStatus.CREATED,
  },
});

// Record initial state in history
await this.stateMachine.recordInitialState(
  order.id,
  OrderStatus.CREATED,
  userId,
);
```

### Get State History

```typescript
// Get complete state history for an order
const history = await this.stateMachine.getStateHistory(orderId);
// Returns array of OrderStateHistory records, ordered by createdAt
```

## Error Handling

Invalid transitions throw `BadRequestException` with descriptive messages:

```typescript
try {
  await this.stateMachine.transition({
    orderId: 'order-123',
    toState: OrderStatus.DELIVERED,
    triggeredBy: userId,
  });
} catch (error) {
  // Error message: "Invalid state transition from CREATED to DELIVERED. Valid next states: SELLER_SELECTED, USER_CANCELLED"
}
```

## Transaction Safety

The `transition()` method uses Prisma transactions to ensure:
- Order status update and history recording are atomic
- No partial updates if history recording fails
- Database consistency is maintained

## Special Behaviors

### DELIVERED State
When transitioning to `DELIVERED`, the `completedAt` timestamp is automatically set on the Order.

### Idempotent Transitions
Transitioning to the same state is allowed and logged as a warning (no error thrown).

## Integration with OrdersService

**CRITICAL**: OrdersService MUST use OrderStateMachineService for ALL state changes. Direct Prisma updates to Order.status are FORBIDDEN.

```typescript
// ✅ CORRECT
await this.stateMachine.transition({
  orderId,
  toState: OrderStatus.SELLER_ACCEPTED,
  triggeredBy: userId,
});

// ❌ WRONG - Direct Prisma update
await this.prisma.order.update({
  where: { id: orderId },
  data: { status: OrderStatus.SELLER_ACCEPTED },
});
```

## Testing

When testing code that uses the state machine:

1. Mock `OrderStateMachineService` in unit tests
2. Test state transitions in isolation
3. Verify history records are created
4. Test invalid transitions throw errors

## Future Enhancements (Not in Sprint 2)

- Timeout enforcement (ORDER_EXPIRED transitions)
- State transition hooks/callbacks
- State transition analytics
- Bulk state transitions
