import { Router } from 'express';
import { nanoid } from 'nanoid';
import { db } from '../db.js';

const router = Router();

const listStmt = db.prepare(
  `SELECT id, title, icon, parent_id AS parentId, sort_order AS sortOrder, updated_at AS updatedAt
   FROM pages ORDER BY sort_order ASC, created_at ASC`
);
const getStmt = db.prepare(`SELECT * FROM pages WHERE id = ?`);
const insertStmt = db.prepare(
  `INSERT INTO pages (id, title, icon, parent_id, sort_order, content) VALUES (?, ?, ?, ?, ?, ?)`
);
const maxOrderStmt = db.prepare(
  `SELECT COALESCE(MAX(sort_order), -1) AS maxOrder FROM pages WHERE parent_id IS ?`
);
const childrenStmt = db.prepare(`SELECT id FROM pages WHERE parent_id = ?`);
const deleteStmt = db.prepare(`DELETE FROM pages WHERE id = ?`);

function toPage(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    icon: row.icon,
    parentId: row.parent_id,
    sortOrder: row.sort_order,
    content: JSON.parse(row.content || '[]'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /api/pages - lightweight list for the sidebar tree
router.get('/', (req, res) => {
  res.json(listStmt.all());
});

// GET /api/pages/:id - full page including block content
router.get('/:id', (req, res) => {
  const row = getStmt.get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Page not found' });
  res.json(toPage(row));
});

// POST /api/pages - create a new page, optionally nested under parentId
router.post('/', (req, res) => {
  const { title = '제목 없음', parentId = null, icon = '📄' } = req.body || {};
  const id = nanoid();
  const { maxOrder } = maxOrderStmt.get(parentId);
  insertStmt.run(id, title, icon, parentId, maxOrder + 1, '[]');
  res.status(201).json(toPage(getStmt.get(id)));
});

// PUT /api/pages/:id - update title/icon/content/parent/order
router.put('/:id', (req, res) => {
  const existing = getStmt.get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Page not found' });

  const title = req.body?.title ?? existing.title;
  const icon = req.body?.icon ?? existing.icon;
  const parentId = req.body?.parentId !== undefined ? req.body.parentId : existing.parent_id;
  const sortOrder = req.body?.sortOrder ?? existing.sort_order;
  const content = req.body?.content !== undefined
    ? JSON.stringify(req.body.content)
    : existing.content;

  db.prepare(
    `UPDATE pages SET title = ?, icon = ?, parent_id = ?, sort_order = ?, content = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(title, icon, parentId, sortOrder, content, req.params.id);

  res.json(toPage(getStmt.get(req.params.id)));
});

// DELETE /api/pages/:id - recursively deletes the page and its descendants
router.delete('/:id', (req, res) => {
  const existing = getStmt.get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Page not found' });

  const deleteRecursive = (id) => {
    for (const child of childrenStmt.all(id)) {
      deleteRecursive(child.id);
    }
    deleteStmt.run(id);
  };
  deleteRecursive(req.params.id);

  res.status(204).end();
});

export default router;
