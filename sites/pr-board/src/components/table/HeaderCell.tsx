import { COLUMNS } from '../../board/columns.ts';
import type { Column, ResizeHandlers } from '../../board/columns.ts';
import type { SortKey, View } from '../../board/view.ts';
import { ColumnResizer } from './ColumnResizer.tsx';

// Header cells stack above the rows from this layer up; see .col-resizer in styles/table.css.
const HEADER_LAYER = 2;

export function HeaderCell({ col, index, view, onSort, width, resize }: {
  col: Column;
  index: number;
  view: View;
  onSort: (key: SortKey) => void;
  width: number;
  resize: ResizeHandlers;
}) {
  const resizer = <ColumnResizer col={col} width={width} {...resize} />;
  // Each cell sits above the next one, so its resize handle stays usable where it overlaps the neighbor.
  const style = { zIndex: HEADER_LAYER + COLUMNS.length - index };
  const sort = col.sort;
  if (!sort) {
    return <th className={col.cls} scope="col" title={col.hint || ''} style={style}><span>{col.label}</span>{resizer}</th>;
  }
  const active = view.sort === sort;
  const ariaSort = active ? (view.dir === 'asc' ? 'ascending' : 'descending') : 'none';
  return (
    <th className={col.cls} scope="col" aria-sort={ariaSort} title={col.hint || ''} style={style}>
      <button type="button" onClick={() => onSort(sort)}>
        {col.label}
        <span className="arrow" aria-hidden="true">{active ? (view.dir === 'asc' ? '▲' : '▼') : ''}</span>
      </button>
      {resizer}
    </th>
  );
}
