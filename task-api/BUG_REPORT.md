# Bug Report

This document records the bugs identified, analyzed, and reconciled during the quality review of the Task API codebase.

---

## Summary of Bug Statuses

| # | Bug Title | Location | Status |
|---|-----------|----------|--------|
| 1 | Pagination Offset Bug | `src/services/taskService.js` (`getPaginated`) | **Fixed** |
| 2 | Completion Overwrites Priority | `src/services/taskService.js` (`completeTask`) | **Fixed** |
| 3 | Status Filtering Partial Matching | `src/services/taskService.js` (`getByStatus`) | **Fixed** |
| 4 | Pagination Combined with Status Filtering | `src/routes/tasks.js` (`router.get('/')`) | **Identified but not fixed** |

---

## Bugs Fixed

### 1. Pagination Offset Calculation Bug

- **Status:** **Fixed**
- **Exact Location:** `src/services/taskService.js` in function `getPaginated(page, limit)`
- **Original Faulty Logic:**
  ```javascript
  const offset = page * limit;
  ```
- **Why It Was a Bug:** The API treats page numbers as **1-indexed** (where `page=1` is the first page). Calculating `offset = page * limit` resulted in `1 * 10 = 10` for page 1, which skipped index 0 through 9 (the entire first page) and returned second-page items instead.
- **Current Fix:**
  ```javascript
  const offset = (page - 1) * limit;
  ```
  Subtracting 1 from `page` ensures `page=1` evaluates to `0 * limit = 0`, properly starting at array index 0.
- **How It Is Tested:**
  - Unit test in `tests/taskService.test.js` (`TaskService › getPaginated() › should return correct paginated tasks for 1-indexed pages`).
  - Integration route test in `tests/tasks.routes.test.js` (`Task API Routes › GET /tasks › should paginate tasks correctly for page 1 and page 2`).
  - Manually verified on the live Render API deployment (`GET /tasks?page=1&limit=10` returns first 10 items, `GET /tasks?page=2&limit=10` returns remaining items).

---

### 2. Completion Overwrites Priority

- **Status:** **Fixed**
- **Exact Location:** `src/services/taskService.js` in function `completeTask(id)`
- **Original Faulty Logic:**
  ```javascript
  const updated = {
    ...task,
    status: 'done',
    priority: 'medium',
    completedAt: new Date().toISOString(),
  };
  ```
- **Why It Was a Bug:** Completing a task unconditionally hardcoded `priority: 'medium'`, overriding whatever priority (such as `'high'` or `'low'`) the user had previously set on the task.
- **Current Fix:**
  ```javascript
  const updated = {
    ...task,
    status: 'done',
    completedAt: new Date().toISOString(),
  };
  ```
  The explicit `priority` override was removed so that `...task` preserves the existing task priority upon completion.
- **How It Is Tested:**
  - Unit test in `tests/taskService.test.js` (`TaskService › completeTask() › should complete an existing task`) creates a task with `priority: 'high'` and asserts `expect(completed.priority).toBe('high')` after completion.

---

### 3. Status Filtering Partial Matching

- **Status:** **Fixed**
- **Exact Location:** `src/services/taskService.js` in function `getByStatus(status)`
- **Original Faulty Logic:**
  ```javascript
  const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));
  ```
- **Why It Was a Bug:** Using String `.includes()` allowed unintended partial string matching. For instance, filtering by `?status=in` would incorrectly match tasks with status `'in_progress'`.
- **Current Fix:**
  ```javascript
  const getByStatus = (status) => tasks.filter((t) => t.status === status);
  ```
  Updated to strict equality comparison (`===`) so that only exact status string matches are returned.
- **How It Is Tested:**
  - Unit test in `tests/taskService.test.js` (`TaskService › getByStatus() › should filter tasks by status`).
  - Integration route test in `tests/tasks.routes.test.js` (`Task API Routes › GET /tasks › should filter tasks by status`).

---

## Bugs Identified But Not Fixed

### 4. Pagination Combined with Status Filtering

- **Status:** **Identified but not fixed**
- **Exact Location:** `src/routes/tasks.js` in route handler `router.get('/')`
- **Current Implementation:**
  ```javascript
  router.get('/', (req, res) => {
    const { status, page, limit } = req.query;

    if (status) {
      const tasks = taskService.getByStatus(status);
      return res.json(tasks);
    }

    if (page !== undefined || limit !== undefined) {
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 10;
      const tasks = taskService.getPaginated(pageNum, limitNum);
      return res.json(tasks);
    }

    const tasks = taskService.getAll();
    res.json(tasks);
  });
  ```
- **Why It Is a Bug:** When `status`, `page`, and `limit` are passed simultaneously (e.g. `GET /tasks?status=todo&page=1&limit=10`), the route handler checks `if (status)` first and immediately returns `taskService.getByStatus(status)`, skipping the `page`/`limit` pagination logic entirely.
- **Current Behavior:** `GET /tasks?status=todo&page=1&limit=10` returns all tasks matching status `todo` without applying pagination.
- **Suggested Fix for Future Release:** Refactor the route handler or `taskService` to compose filtering and pagination sequentially:
  ```javascript
  let tasks = taskService.getAll();
  if (status) {
    tasks = tasks.filter((t) => t.status === status);
  }
  if (page !== undefined || limit !== undefined) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const offset = (pageNum - 1) * limitNum;
    tasks = tasks.slice(offset, offset + limitNum);
  }
  res.json(tasks);
  ```
