import { forwardRef, memo, useMemo } from 'react';

const Canvas = memo(forwardRef((props, ref) => {
  return <canvas ref={ref} {...props}></canvas>;
}));

export default Canvas;