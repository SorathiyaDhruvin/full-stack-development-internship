# Bug Report

This document records the bugs identified during the quality audit and testing of the Task API codebase.

---

## 1. Pagination Offset Calculation Bug (FIXED & VERIFIED)

### 1. Title
Pagination skips page 1 results due to zero-indexing/one-indexing offset formula mismatch.

### 2. Location & Function
- **Location:** `src/services/taskService.js`
- **Function:** `getPaginated(page, limit)`

### 3. Expected Behavior
Requesting page 1 (`page=1`, `limit=10`) should return the first 10 items (items at index 0 through 9). Requesting page 2 (`page=2`, `limit=10`) should return items at index 10 through 19.

### 4. Actual Behavior
Requesting `page=1` with `limit=10` returned items starting from index 10 (page 2 items), skipping the first 10 tasks entirely.

### 5. How the Test Exposed It
Unit tests (`taskService.test.js`) creating 15 sample tasks expected `getPaginated(1, 10)[0].title` to be `'T1'`. Instead, it returned `'T11'`, indicating offset calculation skipped index 0.

### 6. Root Cause
The API treats page numbers as **1-indexed** (page 1 is the first page). However, `getPaginated()` calculated:
```javascript
const offset = page * limit;
```
For `page = 1` and `limit = 10`, `offset` evaluated to `1 * 10 = 10`, which skipped index 0 through 9.

### 7. Resolution & Implemented Fix
- **Original Code:**
  ```javascript
  const offset = page * limit;
  ```
- **Corrected Implementation:**
  ```javascript
  const offset = (page - 1) * limit;
  ```
- **Status:** **Fixed**
- **Verification:**
  - Added unit regression tests in `tests/taskService.test.js` validating page 1 (`T1`–`T10`) and page 2 (`T11`–`T15`).
  - Added integration regression tests in `tests/tasks.routes.test.js` for `GET /tasks?page=1&limit=10` and `GET /tasks?page=2&limit=10`.
  - Manually verified against the live Render deployment (`https://full-stack-development-internship-klyj.onrender.com/tasks?page=1&limit=10`).

---

## 2. Completing a Task Overwrites Priority (IDENTIFIED)

### 1. Title
`completeTask()` unconditionally overwrites task priority to `'medium'`.

### 2. Location & Function
- **Location:** `src/services/taskService.js`
- **Function:** `completeTask(id)`

### 3. Expected Behavior
Completing a task (`PATCH /tasks/:id/complete`) should update `status` to `'done'` and set `completedAt` timestamp without altering original priority (`'high'`, `'low'`, etc.).

### 4. Actual Behavior
Completing a task hardcodes `priority: 'medium'` into the updated task object, wiping out whatever priority was previously set.

### 5. How the Test Exposed It
A task created with `priority: 'high'` returned `priority: 'medium'` after calling `completeTask()`.

### 6. Root Cause
In `completeTask()`, the construction of the updated task object explicitly included `priority: 'medium'`.

### 7. Suggested Fix
Remove `priority: 'medium'` from `completeTask()` so that `...task` preserves the original priority:
```javascript
const updated = {
  ...task,
  status: 'done',
  completedAt: new Date().toISOString(),
};
```
- **Status:** **Identified & Documented**

---

## 3. Status Filtering Allows Partial Matches (IDENTIFIED)

### 1. Title
Status query parameter filtering uses `.includes()` instead of strict equality.

### 2. Location & Function
- **Location:** `src/services/taskService.js`
- **Function:** `getByStatus(status)`

### 3. Expected Behavior
Filtering tasks by status (e.g. `GET /tasks?status=in`) should only return tasks matching exact status strings.

### 4. Actual Behavior
Filtering by status uses JavaScript `.includes()`. For example, `?status=in` matches tasks with status `'in_progress'`.

### 5. How the Test Exposed It
Discovered via code analysis during test design for status query filtering.

### 6. Root Cause
`getByStatus` implemented filtering as:
```javascript
const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));
```

### 7. Suggested Fix
Update the filter callback to use strict equality `===`:
```javascript
const getByStatus = (status) => tasks.filter((t) => t.status === status);
```
- **Status:** **Identified & Documented**

---

## 4. Status Filter Ignores Pagination Query Parameters (IDENTIFIED)

### 1. Title
Providing `status` parameter alongside `page` and `limit` skips pagination.

### 2. Location & Function
- **Location:** `src/routes/tasks.js`
- **Function:** `router.get('/')`

### 3. Expected Behavior
`GET /tasks?status=todo&page=1&limit=10` should return paginated tasks filtered by status.

### 4. Actual Behavior
The route handler checks `status` first and returns immediately (`return res.json(tasks);`), bypassing the pagination logic.

### 5. How the Test Exposed It
Code inspection of `router.get('/')` in `src/routes/tasks.js`.

### 6. Root Cause
The route handler uses early returns in separate `if` blocks:
```javascript
if (status) {
  const tasks = taskService.getByStatus(status);
  return res.json(tasks);
}
if (page !== undefined || limit !== undefined) { ... }
```

### 7. Suggested Fix
Refactor `taskService` or route query handling to compose filtering and pagination sequentially instead of early returning.
- **Status:** **Identified & Documented**
