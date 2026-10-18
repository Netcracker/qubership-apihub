import { ActionType, DiffType } from '@netcracker/qubership-apihub-api-diff';
import { Box } from '@stoplight/mosaic';
import { useAtom } from 'jotai';
import React, { CSSProperties } from 'react';
import ReactDOM from 'react-dom';

import { DIFF_TYPE_COLOR_MAP, DIFF_TYPE_NAME_MAP } from './constants'
import { useDiffBlockIdPrefixContext } from './DiffBlockIdPrefixContext';
import { useDiffContext } from './DiffContext';
import { diffBlockHeight, diffBlockTop } from './state';
import { useChangeSeverityFilters } from "@stoplight/elements/containers/ChangeSeverityFiltersContext";

// eslint-disable-next-line
const resetTypeIfExcluded = (
  type: DiffType | undefined,
  filters: DiffType[] | undefined
): DiffType | undefined => {
  if (type && filters && filters.length > 0) {
    return filters.includes(type) ? type : undefined;
  }
  return type;
};

export const DiffBlock: React.FunctionComponent<{
  type: DiffType | undefined;
  action: ActionType | undefined;
  cause: string | undefined;
  id: string;
}> = props => {
  const { action, cause, id, children } = props;
  const { side, containerElement } = useDiffContext();
  const filters = useChangeSeverityFilters()
  const type = resetTypeIfExcluded(props.type, filters);
  const idPrefix = useDiffBlockIdPrefixContext();
  const [minHeight, setBlockHeight] = useAtom(diffBlockHeight(idPrefix + id));
  const [highlightTop, setHighlightTop] = useAtom(diffBlockTop(idPrefix + id));
  const ref = React.useRef<HTMLDivElement>(null);

  const invisible = React.useMemo(
    () => (action === 'add' && side === 'before') || (action === 'remove' && side === 'after'),
    [action, side],
  );

  const highlight = React.useMemo(() => {
    const sharedStyle = {
      minHeight,
      position: 'absolute',
      width: side === 'before' ? 'calc(50% - 8px)' : '50%',
      left: side === 'before' ? '8px' : '50%',
      top: `${highlightTop}px`,
    } as const;

    let highlightBoxBackgroundColor = null;

    if (invisible) {
      // invisible
      highlightBoxBackgroundColor = '#F2F3F5';
    } else if (action === 'add' && side === 'after') {
      // add
      highlightBoxBackgroundColor = '#eff9f1';
    } else if (action === 'remove' && side === 'before') {
      // remove
      highlightBoxBackgroundColor = '#fff1f2';
    } else if (action === 'replace') {
      // replace
      highlightBoxBackgroundColor = '#fff9ef';
    }

    return highlightBoxBackgroundColor ? (
      <Box
        data-id={idPrefix + id}
        style={{
          background: type && highlightBoxBackgroundColor,
          ...sharedStyle,
        }}
      />
    ) : null;
  }, [type, action, highlightTop, id, idPrefix, invisible, minHeight, side]);

  const badge = React.useMemo(() => {
    if (side === 'before' || type === undefined) {
      return null;
    }

    const background = DIFF_TYPE_COLOR_MAP[type];

    return (
      <Box
        className="diff-block-type"
        data-diff-type={`${DIFF_TYPE_NAME_MAP[type]}${cause ? ', ' + cause : ''}`}
        style={{
          minHeight,
          background,
          width: '3px',
          top: `${highlightTop}px`,
        }}
        pos="absolute"
        left={0}
        zIndex={20}
      />
    );
  }, [cause, highlightTop, minHeight, side, type]);

  const innerStyle = React.useMemo((): CSSProperties => {
    if (invisible) return { opacity: 0, userSelect: 'none', pointerEvents: 'none' };
    return {};
  }, [invisible]);

  React.useEffect(() => {
    const refCurrent = ref.current;
    if (!refCurrent || !side) return;

    const resizeObserver = new ResizeObserver(entries => {
      requestAnimationFrame(() => {
        const height = entries[0].contentRect.height;
        setBlockHeight([side!, height]);
      });
    });

    resizeObserver.observe(refCurrent);
    return () => {
      resizeObserver.unobserve(refCurrent);
    };
  }, [setBlockHeight, side]);

  React.useEffect(() => {
    const refCurrent = ref.current;

    if (!containerElement || !refCurrent) return;

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        setHighlightTop(refCurrent.getBoundingClientRect().top - containerElement.getBoundingClientRect().top);
      });
    });

    resizeObserver.observe(containerElement);
    return () => {
      resizeObserver.unobserve(containerElement);
    };
  }, [containerElement, setHighlightTop]);

  return (
    <>
      <Box style={{ minHeight }} title={type ? DIFF_TYPE_NAME_MAP[type] : ''}>
        <Box ref={ref} style={{ ...innerStyle, display: 'flex', flexDirection: 'column' }}>
          {invisible ? null : children}
        </Box>
      </Box>
      {containerElement &&
        ReactDOM.createPortal(
          <>
            {badge}
            {highlight}
          </>,
          containerElement,
        )}
    </>
  );
};
