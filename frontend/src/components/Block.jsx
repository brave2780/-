import React, { forwardRef } from 'react';

const PLACEHOLDERS = {
  paragraph: "내용을 입력하거나 '/'를 사용해 보세요",
  heading1: '제목 1',
  heading2: '제목 2',
  bulleted: '목록',
  todo: '할 일',
};

const Block = forwardRef(function Block(
  { block, onInput, onKeyDown, onToggleCheck },
  ref
) {
  const className = `block block-${block.type}`;

  return (
    <div className="block-row">
      {block.type === 'todo' && (
        <input
          type="checkbox"
          className="todo-checkbox"
          checked={!!block.checked}
          onChange={() => onToggleCheck(block.id)}
        />
      )}
      {block.type === 'bulleted' && <span className="bullet-dot">•</span>}
      <div
        ref={ref}
        className={className}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={PLACEHOLDERS[block.type] || ''}
        onInput={(e) => onInput(block.id, e.currentTarget.textContent)}
        onKeyDown={(e) => onKeyDown(e, block.id)}
      >
        {block.text}
      </div>
    </div>
  );
});

export default Block;
