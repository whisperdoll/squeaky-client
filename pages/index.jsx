// index.html
import { useEffect, useRef, useState } from 'react';
import Explorer from '../components/Explorer';
import Whiteboard from '../components/whiteboard';
import useApi from '../hooks/useApi';
import useWindowSize from '../hooks/useWindowSize';

import styles from './index.module.scss';

export default function HomePage() {
  const windowSize = useWindowSize();
  const explorerEl = useRef(null);
  const [canvasSize, setCanvasSize] = useState(calcCanvasSize());
  const [dirtree, setDirtree] = useState({ children: [] });
  const [currentPath, setCurrentPath] = useState('hi.json');
  const api = useApi();

  useEffect(() => {
    setCanvasSize(calcCanvasSize());
  }, [windowSize]);

  useEffect(() => {
    api.get('fs')
      .then(({ body }) => {
        setDirtree(body);
      });
  }, []);

  function calcCanvasSize() {
    if (!explorerEl.current) {
      return {
        width: 1,
        height: 1
      };
    }

    return {
      width: windowSize.width - explorerEl.current.getBoundingClientRect().width,
      height: windowSize.height
    };
  }

  function handleSelect(path) {
    setCurrentPath(path);
  }

  return (
    <div className={styles.container}>
      <Explorer ref={explorerEl} dirtree={dirtree} onSelect={handleSelect} />
      <Whiteboard path={currentPath} size={canvasSize} />
    </div>
  );
}