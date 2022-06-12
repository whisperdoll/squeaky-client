import { forwardRef, useState } from 'react';
import { Menu, Item, Separator, Submenu, MenuProvider, useContextMenu } from 'react-contexify';
import useApi from '../hooks/useApi';
import styles from './Explorer.module.scss';
import 'react-contexify/dist/ReactContexify.css';

function FileNode({ node, onSelect, showContextMenu }) {
  function handleClick(e) {
    e.stopPropagation();
    onSelect(node.path);
  }

  function handleContextMenu(e) {
    e.preventDefault();
    e.stopPropagation();

    showContextMenu(e, node);
  }

  return (
    <div
      className={[styles.node, styles.file].join(' ')}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      {node.name}
    </div>
  );
}

function FolderNode({ node, onSelect, showContextMenu }) {
  const [isOpen, setIsOpen] = useState(false);

  function handleClick(e) {
    e.stopPropagation();
    setIsOpen(prev => !prev);
  }

  function handleContextMenu(e) {
    e.preventDefault();
    e.stopPropagation();

    showContextMenu(e, node);
  }

  return (
    <div
      className={[styles.node, styles.folder, isOpen ? styles.open : styles.closed].join(' ')}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      <div className={styles.label}>{node.name}</div>
      {isOpen && (
        <ChildContainer node={node} onSelect={onSelect} showContextMenu={showContextMenu} />
      )}
    </div>
  )
}

function ChildContainer({ node, onSelect, showContextMenu }) {
  return (
    <div className={styles.children}>
      {node.children.map((child) => {
        if (child.children) {
          return <FolderNode node={child} key={child.path} onSelect={onSelect} showContextMenu={showContextMenu} />;
        } else {
          return <FileNode node={child} key={child.path} onSelect={onSelect} showContextMenu={showContextMenu} />;
        }
      })}
    </div>
  );
}

const Explorer = forwardRef(({ onSelect, dirtree, updateDirtree }, ref) => {
  const { show } = useContextMenu({ id: 'explorer' });
  const api = useApi();

  function showContextMenu(e, node) {
    show(e, {
      props: {
        node
      }
    });
  }

  function addFile({ props }) {
    const name = prompt('Enter name for new file');
    if (!name) return;

    console.log(props);

    api.post('/fs', { type: 'file', path: props.node?.path ?? '/', name }).then((res) => {
      updateDirtree(res.body);
    });
  }

  function addFolder({ props }) {
    const name = prompt('Enter name for new folder');
    if (!name) return;

    api.post('/fs', { type: 'folder', path: props.node?.path ?? '/', name }).then((res) => {
      updateDirtree(res.body);
    });
  }

  function deleteItem({ props }) {
    if (!props.node) return;

    api.delete(`/fs${props.node.path}`).then((res) => {
      updateDirtree(res.body);
    });
  }

  return (
    <>
      <div ref={ref} className={styles.explorer} onContextMenu={e => showContextMenu(e, null)}>
        <ChildContainer node={dirtree} onSelect={onSelect} showContextMenu={showContextMenu} />
      </div>
      <Menu id="explorer">
        <Item onClick={addFile}>New File</Item>
        <Item onClick={addFolder}>New Folder</Item>
        <Item onClick={deleteItem} hidden={({props}) => !props.node}>Delete</Item>
      </Menu>
    </>
  );
});

export default Explorer;