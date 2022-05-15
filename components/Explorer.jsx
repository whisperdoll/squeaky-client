import { forwardRef, useState } from 'react';
import styles from './Explorer.module.scss';

function FileNode({ node, onSelect }) {
  function handleClick(e) {
    e.stopPropagation();
    onSelect(node.path.split('\\').slice(1).join('/'));
  }

  return (
    <div
      className={[styles.node, styles.file].join(' ')}
      onClick={handleClick}
    >
      {node.name}
    </div>
  );
}

function FolderNode({ node, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);

  function handleClick(e) {
    e.stopPropagation();
    setIsOpen(prev => !prev);
  }

  return (
    <div
      className={[styles.node, styles.folder, isOpen ? styles.open : styles.closed].join(' ')}
      onClick={handleClick}
    >
      <div className={styles.label}>{node.name}</div>
      {isOpen && (
        <ChildContainer node={node} onSelect={onSelect} />
      )}
    </div>
  )
}

function ChildContainer({ node, onSelect }) {
  return (
    <div className={styles.children}>
      {node.children.map((child) => {
        if (child.children) {
          return <FolderNode node={child} key={child.path} onSelect={onSelect} />;
        } else {
          return <FileNode node={child} key={child.path} onSelect={onSelect} />;
        }
      })}
    </div>
  );
}

const Explorer = forwardRef(({ onSelect, dirtree }, ref) => {
  return (
    <div ref={ref} className={styles.explorer}>
      <ChildContainer node={dirtree} onSelect={onSelect} />
    </div>
  );
});

export default Explorer;