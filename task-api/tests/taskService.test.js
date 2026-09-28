const taskService = require('../src/services/taskService');

describe('TaskService', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create()', () => {
    it('should create a task with default values', () => {
      const task = taskService.create({ title: 'New Task' });
      expect(task.title).toBe('New Task');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.id).toBeDefined();
      expect(task.completedAt).toBeNull();
      expect(task.createdAt).toBeDefined();
    });

    it('should create a task with provided values', () => {
      const task = taskService.create({
        title: 'Task 2',
        description: 'Desc',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2025-01-01T00:00:00.000Z'
      });
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
    });
  });

  describe('getAll()', () => {
    it('should return empty list initially', () => {
      expect(taskService.getAll()).toEqual([]);
    });

    it('should return all created tasks', () => {
      taskService.create({ title: 'T1' });
      taskService.create({ title: 'T2' });
      expect(taskService.getAll().length).toBe(2);
    });
  });

  describe('findById()', () => {
    it('should return undefined for nonexistent task', () => {
      expect(taskService.findById('not-found')).toBeUndefined();
    });

    it('should find existing task by id', () => {
      const created = taskService.create({ title: 'T1' });
      const found = taskService.findById(created.id);
      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
    });
  });

  describe('getByStatus()', () => {
    it('should filter tasks by status', () => {
      taskService.create({ title: 'T1', status: 'todo' });
      taskService.create({ title: 'T2', status: 'done' });
      taskService.create({ title: 'T3', status: 'todo' });
      const todoTasks = taskService.getByStatus('todo');
      expect(todoTasks.length).toBe(2);
    });
  });

  describe('getPaginated()', () => {
    it('should return correct paginated tasks', () => {
      for (let i = 1; i <= 15; i++) {
        taskService.create({ title: `T${i}` });
      }
      const page1 = taskService.getPaginated(1, 10);
      expect(page1.length).toBe(10);
      expect(page1[0].title).toBe('T1'); // this test will fail because of the bug
    });
  });

  describe('update()', () => {
    it('should return null for nonexistent task', () => {
      expect(taskService.update('none', { title: 'T1' })).toBeNull();
    });

    it('should update an existing task', () => {
      const task = taskService.create({ title: 'T1' });
      const updated = taskService.update(task.id, { title: 'T1 Updated' });
      expect(updated.title).toBe('T1 Updated');
      expect(taskService.findById(task.id).title).toBe('T1 Updated');
    });
  });

  describe('remove()', () => {
    it('should return false for nonexistent task', () => {
      expect(taskService.remove('none')).toBe(false);
    });

    it('should remove existing task and return true', () => {
      const task = taskService.create({ title: 'T1' });
      expect(taskService.remove(task.id)).toBe(true);
      expect(taskService.findById(task.id)).toBeUndefined();
    });
  });

  describe('completeTask()', () => {
    it('should return null for nonexistent task', () => {
      expect(taskService.completeTask('none')).toBeNull();
    });

    it('should complete an existing task', () => {
      const task = taskService.create({ title: 'T1', priority: 'high' });
      const completed = taskService.completeTask(task.id);
      expect(completed.status).toBe('done');
      expect(completed.completedAt).not.toBeNull();
      expect(completed.priority).toBe('high');
    });
  });

  describe('getStats()', () => {
    it('should return correct statistics', () => {
      taskService.create({ title: 'T1', status: 'todo' });
      taskService.create({ title: 'T2', status: 'in_progress' });
      taskService.create({ title: 'T3', status: 'done' });
      
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      taskService.create({ title: 'T4', status: 'todo', dueDate: pastDate.toISOString() });

      const stats = taskService.getStats();
      expect(stats.todo).toBe(2);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
      expect(stats.overdue).toBe(1);
    });
  });

  describe('assignTask()', () => {
    it('should throw 404 for nonexistent task', () => {
      expect(() => taskService.assignTask('none', 'Dhruvin')).toThrow('Task not found');
      try {
        taskService.assignTask('none', 'Dhruvin');
      } catch (e) {
        expect(e.status).toBe(404);
      }
    });

    it('should assign a task and return updated task', () => {
      const task = taskService.create({ title: 'T1' });
      const updated = taskService.assignTask(task.id, 'Dhruvin');
      expect(updated.assignee).toBe('Dhruvin');
      expect(taskService.findById(task.id).assignee).toBe('Dhruvin');
    });

    it('should throw 409 if task already assigned', () => {
      const task = taskService.create({ title: 'T1' });
      taskService.assignTask(task.id, 'Dhruvin');
      expect(() => taskService.assignTask(task.id, 'Other')).toThrow('Task already assigned');
      try {
        taskService.assignTask(task.id, 'Other');
      } catch (e) {
        expect(e.status).toBe(409);
      }
    });
  });
});
