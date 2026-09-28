const { validateCreateTask, validateUpdateTask, validateAssignTask } = require('../src/utils/validators');

describe('Validators', () => {
  describe('validateCreateTask', () => {
    it('should return null for valid task data', () => {
      const data = { title: 'Test Task', status: 'todo', priority: 'medium', dueDate: new Date().toISOString() };
      expect(validateCreateTask(data)).toBeNull();
    });

    it('should return error if title is missing', () => {
      expect(validateCreateTask({})).toBe('title is required and must be a non-empty string');
    });

    it('should return error if title is empty string', () => {
      expect(validateCreateTask({ title: '   ' })).toBe('title is required and must be a non-empty string');
    });

    it('should return error for invalid status', () => {
      expect(validateCreateTask({ title: 'A', status: 'invalid' })).toMatch(/status must be one of/);
    });

    it('should return error for invalid priority', () => {
      expect(validateCreateTask({ title: 'A', priority: 'invalid' })).toMatch(/priority must be one of/);
    });

    it('should return error for invalid dueDate', () => {
      expect(validateCreateTask({ title: 'A', dueDate: 'not-a-date' })).toBe('dueDate must be a valid ISO date string');
    });
  });

  describe('validateUpdateTask', () => {
    it('should return null for valid partial updates', () => {
      expect(validateUpdateTask({ status: 'done' })).toBeNull();
    });

    it('should return error if title is explicitly invalid', () => {
      expect(validateUpdateTask({ title: '   ' })).toBe('title must be a non-empty string');
      expect(validateUpdateTask({ title: 123 })).toBe('title must be a non-empty string');
    });

    it('should return error for invalid status', () => {
      expect(validateUpdateTask({ status: 'invalid' })).toMatch(/status must be one of/);
    });

    it('should return error for invalid priority', () => {
      expect(validateUpdateTask({ priority: 'invalid' })).toMatch(/priority must be one of/);
    });

    it('should return error for invalid dueDate', () => {
      expect(validateUpdateTask({ dueDate: 'not-a-date' })).toBe('dueDate must be a valid ISO date string');
    });
  });

  describe('validateAssignTask', () => {
    it('should return null for valid assignee', () => {
      expect(validateAssignTask({ assignee: 'Dhruvin' })).toBeNull();
    });

    it('should return error if assignee is missing', () => {
      expect(validateAssignTask({})).toBe('assignee is required and must be a non-empty string');
    });

    it('should return error if assignee is empty string', () => {
      expect(validateAssignTask({ assignee: '' })).toBe('assignee is required and must be a non-empty string');
    });

    it('should return error if assignee is whitespace only', () => {
      expect(validateAssignTask({ assignee: '   ' })).toBe('assignee is required and must be a non-empty string');
    });

    it('should return error if assignee is not a string', () => {
      expect(validateAssignTask({ assignee: 123 })).toBe('assignee is required and must be a non-empty string');
    });
  });
});
