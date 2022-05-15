import { useCallback, useEffect, useRef, useMemo } from 'react';
import useAnimationFrame from '../hooks/useAnimationFrame';
import useApi from '../hooks/useApi';
import useCanvasListeners from '../hooks/useCanvasListeners';
import useWindowSize from '../hooks/useWindowSize';
import Canvas from './Canvas';
import styles from './Whiteboard.module.scss';

export default function Whiteboard({ path, size }) {
  const canvasEl = useRef(null);
  const data = useRef([]);
  const api = useApi();

  const lastScrollTime = useRef(0);
  const lastScrollDirections = useRef([]);

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

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

    data.current.forEach((datum) => {
      context.fillStyle = datum.color;
      context.strokeStyle = datum.color;
      context.lineWidth = datum.size;
      
      if (datum.action === 'erase') {
        context.globalCompositeOperation = 'destination-out';
      } else {
        context.globalCompositeOperation = 'source-over';
      }

      context.beginPath();

      context.moveTo(...xyFor(datum.points[0]));

      for (let i = 1; i < datum.points.length; i++) {
        context.lineTo(...xyFor(datum.points[i]));
      }

      context.stroke();
    });
  }, []);

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