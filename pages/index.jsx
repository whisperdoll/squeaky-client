// index.html
import { useEffect, useRef, useState } from 'react';
import Explorer from '../components/Explorer';
import Toolbar from '../components/Toolbar';
import Whiteboard from '../components/whiteboard';
import useApi from '../hooks/useApi';
import useWindowSize from '../hooks/useWindowSize';

import styles from './index.module.scss';

export default function HomePage() {
  const windowSize = useWindowSize();
  const explorerEl = useRef(null);
  const toolbarEl = useRef(null);
  const [canvasSize, setCanvasSize] = useState(calcCanvasSize());
  const [dirtree, setDirtree] = useState({ children: [] });
  const [currentPath, setCurrentPath] = useState('hi.json');
  const [tool, setTool] = useState('draw');
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
    if (!explorerEl.current || !toolbarEl.current) {
      return {
        width: 100,
        height: 100
      };
    }

    console.log({
      width: windowSize.width - explorerEl.current.getBoundingClientRect().width,
      height: windowSize.height - toolbarEl.current.getBoundingClientRect().height
    });

    return {
      width: windowSize.width - explorerEl.current.getBoundingClientRect().width,
      height: windowSize.height - toolbarEl.current.getBoundingClientRect().height
    };
  }

  function handleSelect(path) {
    setCurrentPath(path);
  }

  return (
    <div className={styles.container}>
      <Explorer ref={explorerEl} dirtree={dirtree} updateDirtree={setDirtree} onSelect={handleSelect} />
      <div className={styles.col}>
        <Toolbar tool={tool} onToolChange={setTool} ref={toolbarEl} />
        <Whiteboard path={currentPath} size={canvasSize} tool={tool} />
      </div>
    </div>
  );
}