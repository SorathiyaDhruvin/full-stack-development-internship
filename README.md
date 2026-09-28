# Take-Home Assignment — The Untested API

A 2-day take-home assignment. You'll read unfamiliar code, write tests, track down bugs, and ship a small feature.

Read **[ASSIGNMENT.md](./ASSIGNMENT.md)** for the full brief before you start.

---

## A note on AI tools

You're welcome to use AI tools. What we're evaluating is your ability to read and reason about unfamiliar code — so your submission should reflect your own understanding, not just generated output.

Concretely:
- For each bug you report: include where in the code it lives and why it happens
- For the feature you implement: briefly explain the design decisions you made
- If something surprised you or you had to make a tradeoff, say so

---

## Getting Started

**Prerequisites:** Node.js 18+

```bash
cd task-api
npm install
npm start        # runs on http://localhost:3000
```

**Tests:**

```bash
npm test           # run test suite
npm run coverage   # run with coverage report
```

---

## Project Structure

```
task-api/
  src/
    app.js                  # Express app setup
    routes/tasks.js         # Route handlers
    services/taskService.js # Business logic + in-memory data store
    utils/validators.js     # Input validation helpers
  tests/                    # Your tests go here
  package.json
  jest.config.js
ASSIGNMENT.md               # Full brief — read this first
```

> The data store is in-memory. It resets every time the server restarts.

---

## API Reference

| Method   | Path                      | Description                              |
|----------|---------------------------|------------------------------------------|
| `GET`    | `/tasks`                  | List all tasks. Supports `?status=`, `?page=`, `?limit=` |
| `POST`   | `/tasks`                  | Create a new task                        |
| `PUT`    | `/tasks/:id`              | Full update of a task                    |
| `DELETE` | `/tasks/:id`              | Delete a task (returns 204)              |
| `PATCH`  | `/tasks/:id/complete`     | Mark a task as complete                  |
| `GET`    | `/tasks/stats`            | Counts by status + overdue count         |
| `PATCH`  | `/tasks/:id/assign`       | **Assign a task to a user** _(to implement)_ |

### Task shape

```json
{
  "id": "uuid",
  "title": "string",
  "description": "string",
  "status": "pending | in-progress | completed",
  "priority": "low | medium | high",
  "dueDate": "ISO 8601 or null",
  "completedAt": "ISO 8601 or null",
  "createdAt": "ISO 8601"
}
```

### Sample requests

**Create a task**
```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Write tests", "priority": "high"}'
```

**List tasks with filter**
```bash
curl "http://localhost:3000/tasks?status=pending&page=1&limit=10"
```

**Mark complete**
```bash
curl -X PATCH http://localhost:3000/tasks/<id>/complete
```

---

## What to Submit

See [ASSIGNMENT.md](./ASSIGNMENT.md) for full submission requirements. At minimum, include:

- **Test files** — covering the endpoints and edge cases you identified
- **Bug report** — what you found, where in the code, and why it's a bug (not just symptoms)
- **At least one fix** — with a note on your approach
- **`PATCH /tasks/:id/assign` implementation** — plus a short explanation of any design decisions (validation, edge cases, etc.)

---

## Submission Documentation

### What I tested
- **Unit Tests:** Tested `src/services/taskService.js` and `src/utils/validators.js`. For `taskService`, verified state changes, tested both normal flows (task creation, updates, completion) and error states (acting on non-existent IDs). For `validators`, ensured inputs correctly failed and passed the rules.
- **Integration Tests:** Covered the Express API in `src/routes/tasks.js` using Supertest. Covered all endpoints, validating request validations and correct HTTP response statuses (200, 201, 204, 400, 404, 409).
- **Edge Cases:** Invalid pagination behavior, empty lists, empty/missing fields on creation and updating, finding and operating on invalid non-existent IDs.
- **Coverage:** Reached ~96% overall statement coverage, 100% on services and validators.

### Bugs found
1. **Pagination offset:** `getPaginated(1, 10)` returned zero tasks for the first page because it used `page * limit` instead of `(page - 1) * limit`.
2. **Completion overwrites priority:** `completeTask()` hardcoded `priority: 'medium'`, unconditionally changing a task's prior priority.
3. **Status filtering matches partially:** `getByStatus` used `.includes()`, meaning `status=in` incorrectly matches `in_progress`.
4. **Ignored pagination with status:** Supplying `status` alongside `page`/`limit` in `GET /tasks` skips pagination due to an early return statement in the route handler.

### Bugs fixed
I fixed the **Pagination offset bug**, the **Priority overwrite bug**, and the **Status filtering matching bug**.
- **Pagination offset:** Updated `getPaginated` to calculate `const offset = (page - 1) * limit;` to properly handle 1-indexed pagination.
- **Priority overwrite:** Removed `priority: 'medium'` from `completeTask` so it only updates the status and doesn't clobber the user's priority.
- **Status filtering:** Updated `getByStatus` to use strict equality (`t.status === status`) instead of `.includes(status)` to avoid partial matches like 'in' matching 'in_progress'.

### New feature
Implemented `PATCH /tasks/:id/assign`.
- **Validation Decisions:** Included a new validator `validateAssignTask` which enforces that `assignee` is provided, is a string, and is not solely composed of whitespaces. 
- **Already-Assigned Behavior:** If an assignee already exists, the service throws a 409 Conflict error, and the route safely returns it. This design prevents accidentally overwriting another user's task. 

### What I would test next
- Requesting pagination limits that are very high or negative numbers.
- Submitting malformed JSON to the API endpoints.
- Simulating concurrent updates (e.g. race conditions during status or assignee changes).
- Date parsing edge cases (leap years, non-ISO date string corner cases).

### Questions before production
- **Authentication/Authorization:** Should users only be able to assign tasks to registered users or themselves?
- **Expected Pagination Semantics:** Are negative page numbers allowed? Should there be a maximum `limit` enforcement?
- **Persistence:** Should we migrate to a persistent data store (PostgreSQL/MongoDB) before deploying?
- **Audit Logs:** Should task assignments and status updates maintain a historical timeline/audit log?
