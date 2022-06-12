import { forwardRef } from 'react';
import styles from './Toolbar.module.scss';

const Toolbar = forwardRef(({ tool, onToolChange }, ref) => {
  return (
    <div className={styles.row} ref={ref}>
      <button className={tool === 'draw' ? styles.selected : undefined} onClick={() => onToolChange('draw')}>Draw</button>
      <button className={tool === 'select' ? styles.selected : undefined} onClick={() => onToolChange('select')}>Select</button>
    </div>
  );
});

export default Toolbar;