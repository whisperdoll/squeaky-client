import { useCallback, useEffect, useRef, useMemo } from 'react';
import useAnimationFrame from '../hooks/useAnimationFrame';
import useApi from '../hooks/useApi';
import useCanvasListeners from '../hooks/useCanvasListeners';
import useWindowSize from '../hooks/useWindowSize';
import Canvas from './Canvas';
import styles from './Whiteboard.module.scss';

function rectContainsPt(rect, pt) {
  const right = rect.x + rect.w;
  const bottom = rect.y + rect.h;

  return (
    pt.x >= rect.x && pt.x <= right &&
    pt.y >= rect.y && pt.y <= bottom
  );
}

export default function Whiteboard({ path, size, tool }) {
  const canvasEl = useRef(null);
  const data = useRef([]);
  const api = useApi();

  const lastScrollTime = useRef(0);
  const lastScrollDirections = useRef([]);

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  console.log(normalizedPath);

  const selectedIndexes = useRef([]);
  const moveAction = useRef('select'); // 'select' or 'move'
  const selectRect = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const originalMovePt = useRef({ x: 0, y: 0 });

  useEffect(() => {
    api.get(`/note${normalizedPath}`)
      .then((d) => {
        data.current = d.body.map(JSON.parse);
        offset.current = { x: 0, y: 0 };
      });
  }, [path]);

  useEffect(() => {
    if (!canvasEl.current) return;

    const context = canvasEl.current.getContext('2d');

    const imageData = context.getImageData(0, 0, canvasEl.current.width, canvasEl.current.height);
  
    canvasEl.current.width = size.width;
    canvasEl.current.height = size.height;
  
    context.putImageData(imageData, 0, 0);
  }, [size]);

  const mouseDown = useRef(false);
  const isErasing = useRef(false);
  const lastRecorded = useRef({ x: 0, y: 0 });
  const mousePosition = useRef({ x: 0, y: 0 });
  const lastPosition = useRef({ x: 0, y: 0 });
  const offset = useRef({ x: 0, y: 0 });

  function adjust(point, sign=1) {
    return {
      x: point.x + sign * offset.current.x,
      y: point.y + sign * offset.current.y
    };
  }

  function xyFor(point) {
    const p = adjust(point);
    return [p.x, p.y];
  }

  useEffect(() => {
    if (!canvasEl.current) {
      return;
    }

    const fn = (e) => {
      e.preventDefault();
      return false;
    };

    const scrollFn = (e) => {
      if (e.shiftKey) {
        offset.current = {
          x: offset.current.x - e.deltaY,
          y: offset.current.y - e.deltaX
        };
      } else {
        offset.current = {
          x: offset.current.x - e.deltaX,
          y: offset.current.y - e.deltaY
        };
      }
    };

    canvasEl.current.addEventListener('contextmenu', fn);
    canvasEl.current.addEventListener('wheel', scrollFn);

    return () => {
      if (!canvasEl.current) {
        return;
      }

      canvasEl.current.removeEventListener('contextmenu', fn);
      canvasEl.current.removeEventListener('wheel', scrollFn);
    };
  }, []);

  useCanvasListeners(canvasEl.current, {
    move(pos, e, lastPos, originalPos, isDown) {
      e.preventDefault();
      e.stopPropagation();

      const adjustedPos = adjust(pos, -1);
      mousePosition.current = adjustedPos;

      if (!isDown) return false;

      // touch scrolling
      if (e.pointerType === 'touch') {
        offset.current = { 
          x: offset.current.x + (pos.x - lastPos.x),
          y: offset.current.y + (pos.y - lastPos.y)
        };

        return false;
      }

      // select and move
      if (tool === 'select') {
        if (e.button !== -1) {
          return false;
        }

        if (moveAction.current === 'select') {
          selectRect.current = {
            x: Math.min(originalPos.x, pos.x) - offset.current.x,
            y: Math.min(originalPos.y, pos.y) - offset.current.y,
            w: Math.abs(originalPos.x - pos.x),
            h: Math.abs(originalPos.y - pos.y)
          };
        } else {
          selectedIndexes.current.forEach((i) => {
            data.current[i].points.forEach((pt) => {
              pt.x += (pos.x - lastPos.x),
              pt.y += (pos.y - lastPos.y)
            });
          });

          selectRect.current.x += (pos.x - lastPos.x);
          selectRect.current.y += (pos.y - lastPos.y);
        }
        return false;
      }

      const distance = Math.sqrt((adjustedPos.x - lastRecorded.current.x)**2 + (adjustedPos.y - lastRecorded.current.y)**2);

      // normal recording
      if (!isErasing.current) {
        if (distance < data.current.at(-1).size / 2) return false;
        
        data.current.at(-1).points.push(adjustedPos);
        lastRecorded.current = adjustedPos;

        return false;
      }

      // erasing
      if (distance < 8) return false;

      const a = lastRecorded.current;
      const b = adjustedPos;

      function ccw(a, b, c) {
        return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
      }

      function intersect(a, b, c, d, r) {
        // make dots easier to erase
        if (c.x === d.x && c.y === d.y) {
          const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          return Math.sqrt((mid.x - c.x)**2 + (mid.y - c.y)**2) <= r;
        }
  
        return ccw(a, c, d) != ccw(b, c, d) && ccw(a, b, c) != ccw(a, b, d);
      }

      const toErase = [];

      for (let i = 0; i < data.current.length; i++) {
        const points = data.current[i].points;
        
        for (let j = 0; j < points.length - 1; j++) {
          const c = points[j];
          const d = points[j + 1];

          if (intersect(a, b, c, d, data.current[i].size)) {
            data.current.splice(i, 1);
            toErase.push(i);
            i--;
            break;
          }
        }
      }

      if (toErase.length > 0) {
        api.post('/note/erase', { path, toErase });
      }
      
      lastRecorded.current = adjustedPos;

      return false;
    },
    up(pos, e, originalPos) {
      e.preventDefault();
      e.stopPropagation();

      const adjustedPos = adjust(pos, -1);

      mouseDown.current = false;
      mousePosition.current = adjustedPos;

      // touch scrolling or erasing
      if (e.pointerType === 'touch' || isErasing.current) {
        return false;
      }

      // select and move
      if (tool === 'select') {
        if (moveAction.current === 'select') {
          selectRect.current = {
            x: Math.min(originalPos.x, pos.x) - offset.current.x,
            y: Math.min(originalPos.y, pos.y) - offset.current.y,
            w: Math.abs(originalPos.x - pos.x),
            h: Math.abs(originalPos.y - pos.y)
          };
          moveAction.current = 'move';

          let leftMost, rightMost, topMost, bottomMost;

          selectedIndexes.current = data.current.map((stroke, i) => {
            if (stroke.points.filter(pt => rectContainsPt(selectRect.current, pt)).length > stroke.points.length / 2) {
              stroke.points.forEach((pt) => {
                if (leftMost === undefined || pt.x - stroke.size * 4 < leftMost) {
                  leftMost = pt.x - stroke.size * 4;
                }
                if (rightMost === undefined || pt.x + stroke.size * 4 > rightMost) {
                  rightMost = pt.x + stroke.size * 4;
                }
                if (topMost === undefined || pt.y - stroke.size * 4 < topMost) {
                  topMost = pt.y - stroke.size * 4;
                }
                if (bottomMost === undefined || pt.y + stroke.size * 4 > bottomMost) {
                  bottomMost = pt.y + stroke.size * 4;
                }
              });

              return i;
            } else {
              return null;
            }
          }).filter(i => i !== null);

          if (selectedIndexes.current.length === 0) {
            selectRect.current = null;
          } else if (leftMost && rightMost && topMost && bottomMost) {
            selectRect.current = {
              x: leftMost,
              y: topMost,
              w: rightMost - leftMost,
              h: bottomMost - topMost
            };
          }
        } else {
          api.post('/note/move', {
            path,
            toMove: selectedIndexes.current,
            offset: {
              x: adjustedPos.x - originalMovePt.current.x,
              y: adjustedPos.y - originalMovePt.current.y
            }
          });
        }
        return false;
      }

      data.current.at(-1).points.push(adjustedPos);
      api.post('/note/draw', { path, data: data.current.at(-1) });
    },
    down(pos, e) {
      e.preventDefault();
      e.stopPropagation();

      const adjustedPos = adjust(pos, -1);

      mouseDown.current = true;
      lastPosition.current = adjustedPos;
      mousePosition.current = adjustedPos;
      lastRecorded.current = adjustedPos;
      isErasing.current = e.button === 2 || e.button === 5;

      if (e.button === 2  || e.button === 5) return false;

      // select and move
      if (tool === 'select') {
        if (selectRect.current && rectContainsPt(selectRect.current, adjustedPos)) {
          moveAction.current = 'move';
          originalMovePt.current = adjustedPos;
        } else {
          moveAction.current = 'select';
        }

        return false;
      }

      data.current.push({
        action: e.button === 2 ? 'erase' : 'draw',
        size: 5,
        color: '#eeeeee',
        points: [adjustedPos]
      });

      return false;
    },
    leave(pos, e) {

    }
  });

  const handleCanvasLogic = useCallback(() => {
    const context = canvasEl.current.getContext('2d');

    context.lineCap = 'round';
    context.lineJoin = 'round';

    context.globalCompositeOperation = 'source-over';

    context.clearRect(0, 0, canvasEl.current.width, canvasEl.current.height);

    data.current.forEach((stroke, strokeIndex) => {
      if (selectedIndexes.current.includes(strokeIndex)) {
        context.fillStyle = '#773';
        context.strokeStyle = '#773';
        context.lineWidth = stroke.size * 2;

        context.beginPath();
  
        context.moveTo(...xyFor(stroke.points[0]));
  
        for (let i = 1; i < stroke.points.length; i++) {
          context.lineTo(...xyFor(stroke.points[i]));
        }
  
        context.stroke();
      }

      context.fillStyle = stroke.color;
      context.strokeStyle = stroke.color;
      context.lineWidth = stroke.size;
      
      if (stroke.action === 'erase') {
        context.globalCompositeOperation = 'destination-out';
      } else {
        context.globalCompositeOperation = 'source-over';
      }

      context.beginPath();

      context.moveTo(...xyFor(stroke.points[0]));

      for (let i = 1; i < stroke.points.length; i++) {
        context.lineTo(...xyFor(stroke.points[i]));
      }

      context.stroke();
    });

    if (tool === 'select' && selectRect.current) {
      if (rectContainsPt(selectRect.current, mousePosition.current)) {
        canvasEl.current.style.cursor = 'move';
      } else {
        canvasEl.current.style.cursor = '';
      }

      context.globalCompositeOperation = 'source-over';
      context.fillStyle = 'white';
      context.strokeStyle = 'white';
      context.lineWidth = 1;

      context.beginPath();
      context.rect(...xyFor(selectRect.current), selectRect.current.w, selectRect.current.h);
      context.stroke();
    } else if (tool === 'select' && !selectRect.current) {
      canvasEl.current.style.cursor = '';
    }
  }, [tool]);

  useAnimationFrame(handleCanvasLogic);

  const canvas = useMemo(() => {
    return <canvas ref={canvasEl} className={styles.whiteboard} />;
  }, [])

  return (
    <div>
      {canvas}
    </div>
  );
}