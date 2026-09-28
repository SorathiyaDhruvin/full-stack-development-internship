const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Task API Routes', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET /tasks', () => {
    it('should return 200 and an empty list when no tasks exist', async () => {
      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should return 200 and all tasks', async () => {
      taskService.create({ title: 'T1' });
      taskService.create({ title: 'T2' });

      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
    });

    it('should filter tasks by status', async () => {
      taskService.create({ title: 'T1', status: 'todo' });
      taskService.create({ title: 'T2', status: 'done' });
      
      const res = await request(app).get('/tasks?status=todo');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].title).toBe('T1');
    });

    it('should paginate tasks correctly for page 1 and page 2', async () => {
      for (let i = 1; i <= 15; i++) {
        taskService.create({ title: `T${i}` });
      }

      const resPage1 = await request(app).get('/tasks?page=1&limit=10');
      expect(resPage1.status).toBe(200);
      expect(resPage1.body.length).toBe(10);
      expect(resPage1.body[0].title).toBe('T1');
      expect(resPage1.body[9].title).toBe('T10');

      const resPage2 = await request(app).get('/tasks?page=2&limit=10');
      expect(resPage2.status).toBe(200);
      expect(resPage2.body.length).toBe(5);
      expect(resPage2.body[0].title).toBe('T11');
      expect(resPage2.body[4].title).toBe('T15');
    });
  });

  describe('POST /tasks', () => {
    it('should return 201 for valid task', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'New Task' });
      expect(res.status).toBe(201);
      expect(res.body.title).toBe('New Task');
      expect(res.body.status).toBe('todo');
    });

    it('should return 400 if title is missing', async () => {
      const res = await request(app).post('/tasks').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 if title is empty string', async () => {
      const res = await request(app).post('/tasks').send({ title: '   ' });
      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid status', async () => {
      const res = await request(app).post('/tasks').send({ title: 'T1', status: 'invalid' });
      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid priority', async () => {
      const res = await request(app).post('/tasks').send({ title: 'T1', priority: 'invalid' });
      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid dueDate', async () => {
      const res = await request(app).post('/tasks').send({ title: 'T1', dueDate: 'invalid-date' });
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /tasks/:id', () => {
    it('should return 404 for nonexistent task', async () => {
      const res = await request(app).put('/tasks/nonexistent').send({ title: 'T1' });
      expect(res.status).toBe(404);
    });

    it('should return 200 and update task', async () => {
      const task = taskService.create({ title: 'T1' });
      const res = await request(app).put(`/tasks/${task.id}`).send({ title: 'Updated' });
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated');
    });

    it('should return 400 for invalid update status', async () => {
      const task = taskService.create({ title: 'T1' });
      const res = await request(app).put(`/tasks/${task.id}`).send({ status: 'invalid' });
      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid update title', async () => {
      const task = taskService.create({ title: 'T1' });
      const res = await request(app).put(`/tasks/${task.id}`).send({ title: '   ' });
      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid update dueDate', async () => {
      const task = taskService.create({ title: 'T1' });
      const res = await request(app).put(`/tasks/${task.id}`).send({ dueDate: 'invalid-date' });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should return 404 for nonexistent task', async () => {
      const res = await request(app).delete('/tasks/nonexistent');
      expect(res.status).toBe(404);
    });

    it('should return 204 and delete task', async () => {
      const task = taskService.create({ title: 'T1' });
      const res = await request(app).delete(`/tasks/${task.id}`);
      expect(res.status).toBe(204);
      expect(taskService.findById(task.id)).toBeUndefined();
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    it('should return 404 for nonexistent task', async () => {
      const res = await request(app).patch('/tasks/nonexistent/complete');
      expect(res.status).toBe(404);
    });

    it('should return 200 and mark task as done', async () => {
      const task = taskService.create({ title: 'T1' });
      const res = await request(app).patch(`/tasks/${task.id}/complete`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
      expect(res.body.completedAt).not.toBeNull();
    });
  });

  describe('GET /tasks/stats', () => {
    it('should return 200 and accurate task stats including overdue count', async () => {
      taskService.create({ title: 'T1', status: 'todo' });
      taskService.create({ title: 'T2', status: 'in_progress' });
      taskService.create({ title: 'T3', status: 'done' });
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      taskService.create({ title: 'T4', status: 'todo', dueDate: pastDate.toISOString() });

      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        todo: 2,
        in_progress: 1,
        done: 1,
        overdue: 1
      });
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    it('should return 404 for nonexistent task', async () => {
      const res = await request(app)
        .patch('/tasks/nonexistent/assign')
        .send({ assignee: 'Dhruvin' });
      expect(res.status).toBe(404);
    });

    it('should assign task and return 200', async () => {
      const task = taskService.create({ title: 'T1' });
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Dhruvin' });
      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Dhruvin');
      expect(res.body.title).toBe('T1');
    });

    it('should return 400 for empty string assignee', async () => {
      const task = taskService.create({ title: 'T1' });
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '' });
      expect(res.status).toBe(400);
    });

    it('should return 400 for whitespace assignee', async () => {
      const task = taskService.create({ title: 'T1' });
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: '   ' });
      expect(res.status).toBe(400);
    });

    it('should return 400 for non-string assignee', async () => {
      const task = taskService.create({ title: 'T1' });
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 123 });
      expect(res.status).toBe(400);
    });

    it('should return 400 for missing assignee', async () => {
      const task = taskService.create({ title: 'T1' });
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({});
      expect(res.status).toBe(400);
    });

    it('should return 409 if task already assigned', async () => {
      const task = taskService.create({ title: 'T1' });
      taskService.assignTask(task.id, 'Dhruvin');
      const res = await request(app)
        .patch(`/tasks/${task.id}/assign`)
        .send({ assignee: 'Other' });
      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Task already assigned');
    });
  });
});
