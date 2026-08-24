import React, { useCallback, useEffect, useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Editor from './components/Editor.jsx';
import { api } from './api.js';

export default function App() {
  const [pages, setPages] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [activePage, setActivePage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshList = useCallback(async () => {
    const list = await api.list();
    setPages(list);
    return list;
  }, []);

  useEffect(() => {
    refreshList()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [refreshList]);

  useEffect(() => {
    if (!activeId) {
      setActivePage(null);
      return;
    }
    let cancelled = false;
    api
      .get(activeId)
      .then((page) => {
        if (!cancelled) setActivePage(page);
      })
      .catch((err) => setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  const handleCreateRoot = useCallback(async () => {
    const page = await api.create({ title: '제목 없음', parentId: null });
    await refreshList();
    setActiveId(page.id);
  }, [refreshList]);

  const handleCreateChild = useCallback(
    async (parentId) => {
      const page = await api.create({ title: '제목 없음', parentId });
      await refreshList();
      setActiveId(page.id);
    },
    [refreshList]
  );

  const handleDelete = useCallback(
    async (id) => {
      if (!window.confirm('이 페이지와 하위 페이지를 모두 삭제할까요?')) return;
      await api.remove(id);
      await refreshList();
      if (activeId === id) setActiveId(null);
    },
    [refreshList, activeId]
  );

  const patchActivePageInList = useCallback((id, patch) => {
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const handleChangeTitle = useCallback(
    async (title) => {
      if (!activePage) return;
      patchActivePageInList(activePage.id, { title });
      await api.update(activePage.id, { title });
    },
    [activePage, patchActivePageInList]
  );

  const handleChangeIcon = useCallback(
    async (icon) => {
      if (!activePage) return;
      setActivePage((p) => ({ ...p, icon }));
      patchActivePageInList(activePage.id, { icon });
      await api.update(activePage.id, { icon });
    },
    [activePage, patchActivePageInList]
  );

  const handleChangeContent = useCallback(
    async (content) => {
      if (!activePage) return;
      await api.update(activePage.id, { content });
    },
    [activePage]
  );

  if (loading) return <div className="loading">불러오는 중...</div>;

  return (
    <div className="app">
      {error && <div className="error-banner">{error}</div>}
      <Sidebar
        pages={pages}
        activeId={activeId}
        onSelect={setActiveId}
        onCreateChild={handleCreateChild}
        onCreateRoot={handleCreateRoot}
        onDelete={handleDelete}
      />
      <main className="main-content">
        {activePage ? (
          <Editor
            key={activePage.id}
            page={activePage}
            onChangeTitle={handleChangeTitle}
            onChangeIcon={handleChangeIcon}
            onChangeContent={handleChangeContent}
          />
        ) : (
          <div className="empty-state">
            <p>왼쪽에서 페이지를 선택하거나 새 페이지를 만들어보세요.</p>
            <button onClick={handleCreateRoot}>+ 새 페이지 만들기</button>
          </div>
        )}
      </main>
    </div>
  );
}
