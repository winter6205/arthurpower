# Example: 5-Verdict Block

Complete 5-verdict example showing how to use the architecture-change-reviewer skill to review a multi-file change before PR.

**Note**: Each section corresponds to a real failure mode (RED baseline verified).

```markdown
# PR Title: Add order placement API endpoint

## 1. Summary
Add POST /api/orders endpoint that accepts an order, validates stock, creates the order, and returns a confirmation. Touches 4 files: api routes, order service, stock validator, order schema.

## 2. 5-line verdict block
bounded-context-guardian: yes — orders/ bounded context exists, new code lives in orders/api/, no cross-context import (uses stock-validator via injected interface).
defensive-contract-validator: yes — place_order() covers empty cart (raise), negative quantity (raise), long cart (1000 items, pagination), concurrent (lock + retry), exception (DB failure → typed OrderPlacementError).
error-handling-enforcer: yes — typed exception OrderPlacementError with code: INSUFFICIENT_STOCK, no empty catch, // EXIT: stock not reserved, return error to caller comment on early-return.
complexity-anti-drift: yes — place_order() ≤ 30 lines (uses 3 extracted helpers: validate_cart / reserve_stock / persist_order), nesting ≤ 4, params ≤ 3.
minimal-change-verifier: yes — 1 logical task (add order endpoint), 1 commit, no refactor mixed with feature.

## 3. Task Decomposition (ordered by dependency)
T1: add orders/schemas/order.py (Pydantic model) — acceptance: Order.from_dict({}) raises ValidationError, Order.from_dict(valid) returns instance; line coverage ≥ 80%.
T2: [parallel] add orders/services/stock_validator.py — acceptance: validate_stock(cart) returns Result[None, InsufficientStockError], lock acquired + released in finally block.
T3: add orders/services/order_service.py::place_order() — acceptance: pytest covers empty / negative / long / concurrent / exception; all 5 boundary classes green.
T4: add orders/api/routes.py::POST /api/orders — acceptance: curl -X POST returns 201 with order_id, 400 on validation error, 409 on insufficient stock.
T5: [parallel] update docs/api.md — acceptance: endpoint documented with example request/response.

## 4. PR description carries BOTH Section 2 (5-line verdict) + Section 3 (task decomposition).
```

**Annotation**: The example above shows how to land when all 5 verdicts are yes — each verdict is one line plus a one-sentence reason. Task Decomposition is ordered by dependency with `[parallel]` markers. On failure (any verdict = no), go back to §Procedure Step 3 and do not enter Task Decomposition.
