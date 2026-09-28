# Take-Home Assignment — The Untested API

A Node.js + Express REST API for managing tasks with unit tests (Jest) and integration tests (Supertest).

Read **[ASSIGNMENT.md](./ASSIGNMENT.md)** for the full original brief.

---

## Live API

**Base URL:**
`https://full-stack-development-internship-klyj.onrender.com`

### Endpoints

| Method   | Path                      | Description                                                  |
|----------|---------------------------|--------------------------------------------------------------|
| `GET`    | `/tasks`                  | List all tasks. Supports `?status=`, `?page=`, `?limit=`    |
| `GET`    | `/tasks?status=todo`      | Filter tasks by status (`todo`, `in_progress`, `done`)       |
| `GET`    | `/tasks?page=1&limit=10`  | Paginated task retrieval (1-indexed)                         |
| `POST`   | `/tasks`                  | Create a new task                                            |
| `PUT`    | `/tasks/:id`              | Full update of a task                                        |
| `DELETE` | `/tasks/:id`              | Delete a task (returns 204 No Content)                       |
| `PATCH`  | `/tasks/:id/complete`     | Mark a task as done                                          |
| `PATCH`  | `/tasks/:id/assign`       | Assign a task to a user                                      |
| `GET`    | `/tasks/stats`            | Task counts by status + overdue count                        |

### Sample Requests

**Create a task (`POST /tasks`)**
```bash
curl -X POST https://full-stack-development-internship-klyj.onrender.com/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Write tests",
    "priority": "high"
  }'
```

**Assign a task (`PATCH /tasks/:id/assign`)**
```bash
curl -X PATCH https://full-stack-development-internship-klyj.onrender.com/tasks/<id>/assign \
  -H "Content-Type: application/json" \
  -d '{
    "assignee": "Dhruvin"
  }'
```

---

## Task Schema

```json
{
  "id": "uuid",
  "title": "string",
  "description": "string",
  "status": "todo | in_progress | done",
  "priority": "low | medium | high",
  "dueDate": "ISO 8601 or null",
  "completedAt": "ISO 8601 or null",
  "createdAt": "ISO 8601",
  "assignee": "string | null"
}
```

---

## Getting Started

**Prerequisites:** Node.js 18+

```bash
cd task-api
npm install
npm start        # runs on http://localhost:3000
```

**Run Tests & Coverage:**

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
    routes/tasks.js         # Task route handlers
    services/taskService.js # Business logic + in-memory store
    utils/validators.js     # Request validation helpers
  tests/
    taskService.test.js     # Unit tests for task service
    tasks.routes.test.js    # Integration tests using Supertest
    validators.test.js      # Unit tests for request validators
  BUG_REPORT.md             # Detailed bug analysis report
  package.json
  jest.config.js
ASSIGNMENT.md               # Original project assignment brief
README.md                   # Project documentation
```

> Note: The data store is in-memory. It resets every time the server restarts.

---

## Testing Summary

Automated tests cover all API endpoints, business logic service functions, and input validation helpers.

- **Test Suites:** 3 passed, 3 total
- **Tests:** 61 passed, 61 total
- **Statement Coverage:** 96.93%
- **Branch Coverage:** 94.38%
- **Function Coverage:** 93.33%
- **Line Coverage:** 96.66%

---

## Feature Implementation: `PATCH /tasks/:id/assign`

### Assignment Behavior & Design Decisions

- **Already-Assigned Protection:** A task that already has an assignee cannot be reassigned through this endpoint. Attempting to assign an already-assigned task returns `409 Conflict`:
  ```json
  {
    "error": "Task already assigned"
  }
  ```
  *Design Rationale:* Prevents accidentally overwriting an active task assignment. Reassignment or unassignment workflows can be explicitly implemented if required in the future.

- **Input Validation Rules (`validateAssignTask`):**
  - `assignee` is required.
  - `assignee` must be a string type.
  - Empty strings (`""`) and whitespace-only strings (`"   "`) are rejected with `400 Bad Request`.
  - Non-string types (e.g. `123`) are rejected with `400 Bad Request`.
  - Nonexistent task IDs return `404 Not Found`.

---

## Bug Report & Fix Summary

For full bug analysis, root cause details, code locations, and suggested/implemented fixes, see **[task-api/BUG_REPORT.md](./task-api/BUG_REPORT.md)**.

### Summary Table

| # | Bug Title | Location | Status |
|---|-----------|----------|--------|
| 1 | Pagination Offset Bug | `src/services/taskService.js` (`getPaginated`) | **Fixed** |
| 2 | Completion Overwrites Priority | `src/services/taskService.js` (`completeTask`) | **Fixed** |
| 3 | Status Filtering Partial Matching | `src/services/taskService.js` (`getByStatus`) | **Fixed** |
| 4 | Pagination Combined with Status Filtering | `src/routes/tasks.js` (`router.get('/')`) | **Identified but not fixed** |

### Bugs Fixed
1. **Pagination Offset Bug (`src/services/taskService.js`):** Corrected `const offset = page * limit;` to `const offset = (page - 1) * limit;` for 1-indexed page calculations. Verified in unit/integration tests and on the live API deployment.
2. **Completion Overwrites Priority (`src/services/taskService.js`):** Removed explicit `priority: 'medium'` from `completeTask()` so that `...task` preserves the task's pre-existing priority upon completion. Verified in unit tests.
3. **Status Filtering Partial Matching (`src/services/taskService.js`):** Updated `getByStatus()` from `.includes(status)` to strict equality `=== status` to prevent partial string match collisions. Verified in unit and route integration tests.

### Bugs Identified But Not Fixed
1. **Pagination Combined with Status Filtering (`src/routes/tasks.js`):** Supplying `?status=...` alongside `?page=...&limit=...` returns early upon finding `status`, ignoring pagination parameters. This issue remains present in the code and is documented in `BUG_REPORT.md` for future refactoring.

---

## What I Would Test Next

- **Pagination Boundary Limits:** Test very large limit values (e.g., `limit=10000`), zero page (`page=0`), or negative page/limit numbers.
- **Malformed & Invalid JSON Payloads:** Send invalid JSON strings or empty request bodies to verify robust error handling.
- **Payload Size Restrictions:** Submit oversized request payloads to ensure body parser size limits are enforced.
- **Date Edge Cases:** Validate date parsing for leap years, non-ISO formats, and complex timezone offsets.
- **Concurrent Updates & Race Conditions:** Test simultaneous status updates or assignment calls to detect race conditions in memory operations.
- **Error Resiliency:** Test 500 internal server error fallback paths.
- **Performance & Load Testing:** Measure API response latency under high throughput.

---

## Questions Before Production

- **Database Persistence:** Should tasks be migrated to a persistent database (e.g., PostgreSQL or MongoDB)?
- **Authentication & Authorization:** What authentication scheme (e.g., JWT, OAuth2) and role-based access control should be implemented?
- **Assignee Verification:** Should assignees be validated against a registered user account table/service?
- **Reassignment Workflow:** Should task reassignment or explicit task unassignment be supported?
- **Audit Logging:** Should task assignment history and status changes be stored in an audit log table?
- **Pagination Semantics:** What should be the maximum enforced `limit` for paginated queries?
- **Rate Limiting:** What rate limiting policies should be configured for live API endpoints?
