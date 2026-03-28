import { useCallback, useEffect, useRef } from 'react';

interface ResizeHandleProps {
  onResize: (delta: number) => void;
  visible?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export function ResizeHandle({ onResize, visible = true, onDragStart, onDragEnd }: ResizeHandleProps) {
  const dragging = useRef(false);
  const lastX = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    lastX.current = e.clientX;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    onDragStart?.();
  }, [onDragStart]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = lastX.current - e.clientX;
      lastX.current = e.clientX;
      onResize(delta);
    };

    const onMouseUp = () => {
      if (dragging.current) {
        dragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        onDragEnd?.();
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onResize, onDragEnd]);

  return (
    <div
      onMouseDown={onMouseDown}
      className={`cursor-col-resize bg-border-subtle hover:bg-accent/40 active:bg-accent/60 flex-shrink-0 transition-all duration-200 ease-smooth ${
        visible ? 'w-1 opacity-100' : 'w-0 opacity-0 pointer-events-none'
      }`}
    />
  );
}
