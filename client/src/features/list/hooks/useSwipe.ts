import { useState, useRef } from 'react';
import { SWIPE_ACTIONS_WIDTH } from '../../../global/helpers';

export function useSwipe(onOpen: () => void, onClose: () => void, isOpen: boolean) {
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const startOff = useRef(0);

  const handlers = {
    onTouchStart: (e: React.TouchEvent<HTMLDivElement>) => {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
      startOff.current = offset;
      setSwiping(false);
    },
    onTouchMove: (e: React.TouchEvent<HTMLDivElement>) => {
      const dx = startX.current - e.touches[0].clientX;
      const dy = Math.abs(e.touches[0].clientY - startY.current);

      if (!swiping && Math.abs(dx) > 10 && Math.abs(dx) > dy) {
        setSwiping(true);
        document.body.style.overflow = 'hidden';
      }

      if (swiping) {
        e.preventDefault();
        setOffset(Math.max(0, Math.min(SWIPE_ACTIONS_WIDTH, startOff.current + dx)));
      }
    },
    onTouchEnd: () => {
      document.body.style.overflow = '';
      if (swiping) {
        if (offset > 60) {
          setOffset(SWIPE_ACTIONS_WIDTH);
          onOpen();
        } else {
          setOffset(0);
          if (isOpen) onClose();
        }
      }
      setSwiping(false);
    }
  };

  const resetOffset = () => setOffset(0);

  return { offset, swiping, handlers, resetOffset };
}
