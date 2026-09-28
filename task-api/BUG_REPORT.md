# Bug Report

## 1. Pagination is broken for page 1

### Expected behavior
Calling `getPaginated(1, 10)` should return the first 10 items (items 0 to 9).

### Actual behavior
Calling `getPaginated(1, 10)` returns items 10 to 19 because the offset is calculated as `page * limit` (`1 * 10 = 10`) instead of `(page - 1) * limit`.

### Location
`src/services/taskService.js`
`getPaginated()`

### How it was discovered
The unit test `TaskService › getPaginated() › should return correct paginated tasks` and integration test `Task API Routes › GET /tasks › should paginate tasks` exposed the problem. When requesting 10 items for page 1, only 5 items were returned (because 15 items total were created, and it sliced from index 10 to 20).

### Root cause
The formula for pagination offset in 1-indexed pages is incorrect. `const offset = page * limit;` skips the first page entirely if `page` is passed as `1`.

### Suggested fix
Change the offset calculation to:
```javascript
const offset = (page - 1) * limit;
```

---

## 2. Completing a task overwrites priority

### Expected behavior
Completing a task should only update its status to `done` and populate `completedAt`. It should not modify its priority.

### Actual behavior
Completing a task always hardcodes its priority to `medium`, wiping out whatever priority (e.g. `high` or `low`) was set before.

### Location
`src/services/taskService.js`
`completeTask()`

### How it was discovered
The unit test `TaskService › completeTask() › should complete an existing task` failed because the returned task had a `medium` priority instead of the original `high` priority.

### Root cause
In `completeTask()`, the updated object explicitly sets `priority: 'medium'` regardless of the current task's priority.

### Suggested fix
Remove `priority: 'medium',` from the `updated` object construction in `completeTask()`.

---

## 3. Status filtering allows partial matches

### Expected behavior
Filtering tasks by status (e.g. `?status=in`) should only return tasks with exactly that status.

### Actual behavior
Filtering by status uses `.includes()`, allowing partial string matches. For instance, filtering for `in` would return tasks with status `in_progress`.

### Location
`src/services/taskService.js`
`getByStatus()`

### How it was discovered
Code inspection during the development of tests.

### Root cause
The filtering function is implemented as:
```javascript
const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));
```
It uses `.includes()` instead of strict equality `===`.

### Suggested fix
Change to:
```javascript
const getByStatus = (status) => tasks.filter((t) => t.status === status);
```

---

## 4. Query parameters conflict ignores pagination

### Expected behavior
If `status`, `page`, and `limit` are provided together, the API should return paginated tasks filtered by that status.

### Actual behavior
If `status` is provided, the API returns all tasks matching that status and completely ignores `page` and `limit` because of early return in the router.

### Location
`src/routes/tasks.js`
`router.get('/')`

### How it was discovered
Code inspection of the `GET /tasks` route handler.

### Root cause
The first `if (status)` block returns early, skipping the subsequent pagination block.

### Suggested fix
Refactor `taskService` to handle combined filtering and pagination, or update the route logic to chain these operations instead of using mutually exclusive `if` statements with early returns.
