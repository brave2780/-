import React, { useEffect, useLayoutEffect, useRef, useState, useCallback, memo } from 'react';
import Block from './Block.jsx';
import { nanoId, normalizeSpaces } from '../utils.js';

const MemoBlock = memo(Block, (prev, next) => {
  return (
    prev.block.id === next.block.id &&
    prev.block.type === next.block.type &&
    prev.block.checked === next.block.checked
  );
});

function getCaretOffset(el) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0);
  const preRange = range.cloneRange();
  preRange.selectNodeContents(el);
  preRange.setEnd(range.endContainer, range.endOffset);
  return preRange.toString().length;
}

function setCaretOffset(el, offset) {
  const sel = window.getSelection();
  const range = document.createRange();
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  let remaining = offset;
  if (!node) {
    range.setStart(el, 0);
  } else {
    while (node) {
      if (remaining <= node.textContent.length) {
        range.setStart(node, remaining);
        break;
      }
      remaining -= node.textContent.length;
      const next = walker.nextNode();
      if (!next) {
        range.setStart(node, node.textContent.length);
        break;
      }
      node = next;
    }
  }
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

const LIST_TYPES = new Set(['bulleted', 'todo']);

function applyMarkdownShortcut(text) {
  if (text === '# ') return { type: 'heading1', text: '' };
  if (text === '## ') return { type: 'heading2', text: '' };
  if (text === '- ' || text === '* ') return { type: 'bulleted', text: '' };
  if (text === '[] ' || text === '[ ] ') return { type: 'todo', text: '', checked: false };
  return null;
}

export default function Editor({ page, onChangeTitle, onChangeIcon, onChangeContent }) {
  const [blocks, setBlocks] = useState(page.content.length ? page.content : [
    { id: nanoId(), type: 'paragraph', text: '' },
  ]);
  const blockRefs = useRef({});
  const refSetters = useRef(new Map());
  const pendingFocus = useRef(null);
  const saveTimer = useRef(null);

  const getRefSetter = useCallback((id) => {
    if (!refSetters.current.has(id)) {
      refSetters.current.set(id, (el) => {
        if (el) blockRefs.current[id] = el;
        else delete blockRefs.current[id];
      });
    }
    return refSetters.current.get(id);
  }, []);

  useEffect(() => {
    setBlocks(page.content.length ? page.content : [{ id: nanoId(), type: 'paragraph', text: '' }]);
  }, [page.id]);

  useLayoutEffect(() => {
    if (pendingFocus.current) {
      const { id, offset } = pendingFocus.current;
      const el = blockRefs.current[id];
      if (el) {
        el.focus();
        setCaretOffset(el, offset);
      }
      pendingFocus.current = null;
    }
  }, [blocks]);

  const scheduleSave = useCallback(
    (nextBlocks) => {
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => onChangeContent(nextBlocks), 400);
    },
    [onChangeContent]
  );

  const updateBlocks = useCallback(
    (updater) => {
      setBlocks((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave]
  );

  const handleInput = useCallback(
    (id, rawText) => {
      const text = normalizeSpaces(rawText);
      const shortcut = applyMarkdownShortcut(text);
      if (shortcut) {
        // Mutate the DOM node synchronously (not via React re-render) so a
        // fast follow-up keystroke can't land before the prefix is stripped
        // and the caret is repositioned.
        const el = blockRefs.current[id];
        if (el) {
          el.textContent = shortcut.text ?? '';
          setCaretOffset(el, (shortcut.text ?? '').length);
        }
        updateBlocks((prev) =>
          prev.map((b) => (b.id === id ? { ...b, ...shortcut } : b))
        );
        return;
      }
      updateBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, text } : b)));
    },
    [updateBlocks]
  );

  const handleToggleCheck = useCallback(
    (id) => {
      updateBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, checked: !b.checked } : b)));
    },
    [updateBlocks]
  );

  const handleKeyDown = useCallback(
    (e, id) => {
      const el = blockRefs.current[id];
      if (!el) return;

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const offset = getCaretOffset(el);
        const fullText = normalizeSpaces(el.textContent);
        const left = fullText.slice(0, offset);
        const right = fullText.slice(offset);

        // The memo comparator ignores text changes (live typing already
        // keeps the DOM in sync), so a truncation like this needs to be
        // applied to the DOM directly rather than relying on a re-render.
        el.textContent = left;

        updateBlocks((prev) => {
          const idx = prev.findIndex((b) => b.id === id);
          if (idx === -1) return prev;
          const current = prev[idx];

          if (LIST_TYPES.has(current.type) && fullText.length === 0) {
            const converted = { ...current, type: 'paragraph' };
            const next = [...prev];
            next[idx] = converted;
            pendingFocus.current = { id, offset: 0 };
            return next;
          }

          const newBlock = {
            id: nanoId(),
            type: LIST_TYPES.has(current.type) ? current.type : 'paragraph',
            text: right,
            checked: current.type === 'todo' ? false : undefined,
          };
          const next = [...prev];
          next[idx] = { ...current, text: left };
          next.splice(idx + 1, 0, newBlock);
          pendingFocus.current = { id: newBlock.id, offset: 0 };
          return next;
        });
        return;
      }

      if (e.key === 'Backspace') {
        const offset = getCaretOffset(el);
        if (offset > 0) return;

        updateBlocks((prev) => {
          const idx = prev.findIndex((b) => b.id === id);
          if (idx === -1) return prev;
          const current = prev[idx];

          if (current.type !== 'paragraph' && current.text.length === 0) {
            e.preventDefault();
            const next = [...prev];
            next[idx] = { ...current, type: 'paragraph' };
            pendingFocus.current = { id, offset: 0 };
            return next;
          }

          if (idx === 0) return prev;

          e.preventDefault();
          const prevBlock = prev[idx - 1];
          const mergeOffset = prevBlock.text.length;
          const mergedText = prevBlock.text + current.text;
          const merged = { ...prevBlock, text: mergedText };

          // Same reasoning as the Enter/split case above: force the DOM to
          // reflect the merge since the memo comparator won't re-render for
          // a text-only change to a block whose type/checked stay the same.
          const prevEl = blockRefs.current[prevBlock.id];
          if (prevEl) prevEl.textContent = mergedText;

          const next = prev.filter((b) => b.id !== id);
          next[idx - 1] = merged;
          pendingFocus.current = { id: prevBlock.id, offset: mergeOffset };
          return next;
        });
        return;
      }

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const idx = blocks.findIndex((b) => b.id === id);
        const targetIdx = e.key === 'ArrowUp' ? idx - 1 : idx + 1;
        const target = blocks[targetIdx];
        if (target) {
          e.preventDefault();
          const targetEl = blockRefs.current[target.id];
          if (targetEl) {
            targetEl.focus();
            setCaretOffset(targetEl, target.text.length);
          }
        }
      }
    },
    [blocks, updateBlocks]
  );

  return (
    <div className="editor">
      <div className="page-header">
        <button
          className="page-icon"
          onClick={() => {
            const next = window.prompt('아이콘으로 사용할 이모지를 입력하세요', page.icon);
            if (next) onChangeIcon(next);
          }}
        >
          {page.icon}
        </button>
        <div
          className="page-title"
          contentEditable
          suppressContentEditableWarning
          data-placeholder="제목 없음"
          onBlur={(e) => onChangeTitle(e.currentTarget.textContent)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.currentTarget.blur();
              blockRefs.current[blocks[0]?.id]?.focus();
            }
          }}
        >
          {page.title}
        </div>
      </div>

      <div className="block-list">
        {blocks.map((block) => (
          <MemoBlock
            key={block.id}
            block={block}
            ref={getRefSetter(block.id)}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onToggleCheck={handleToggleCheck}
          />
        ))}
      </div>
    </div>
  );
}
