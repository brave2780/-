import React, { useState } from 'react';

function buildTree(pages, parentId = null) {
  return pages
    .filter((p) => p.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p) => ({ ...p, children: buildTree(pages, p.id) }));
}

function SidebarItem({ node, activeId, onSelect, onCreateChild, onDelete, depth }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className={`sidebar-item ${activeId === node.id ? 'active' : ''}`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
        onClick={() => onSelect(node.id)}
      >
        <button
          className="twirl"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
        >
          {hasChildren ? (expanded ? '▾' : '▸') : ' '}
        </button>
        <span className="icon">{node.icon}</span>
        <span className="title">{node.title || '제목 없음'}</span>
        <span className="row-actions">
          <button
            title="하위 페이지 추가"
            onClick={(e) => {
              e.stopPropagation();
              onCreateChild(node.id);
            }}
          >
            +
          </button>
          <button
            title="삭제"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node.id);
            }}
          >
            ×
          </button>
        </span>
      </div>
      {hasChildren && expanded && (
        <div>
          {node.children.map((child) => (
            <SidebarItem
              key={child.id}
              node={child}
              activeId={activeId}
              onSelect={onSelect}
              onCreateChild={onCreateChild}
              onDelete={onDelete}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ pages, activeId, onSelect, onCreateChild, onDelete, onCreateRoot }) {
  const tree = buildTree(pages, null);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span>📝 나의 메모장</span>
      </div>
      <div className="sidebar-tree">
        {tree.map((node) => (
          <SidebarItem
            key={node.id}
            node={node}
            activeId={activeId}
            onSelect={onSelect}
            onCreateChild={onCreateChild}
            onDelete={onDelete}
            depth={0}
          />
        ))}
      </div>
      <button className="new-page-btn" onClick={onCreateRoot}>
        + 새 페이지
      </button>
    </aside>
  );
}
