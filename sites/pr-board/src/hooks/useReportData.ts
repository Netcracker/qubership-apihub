// Loads prs.json once; a live load replaces the data through showLive. The published page has no prs.json
// (DATA-3): a 404 means no snapshot, and the page then loads live data itself (DATA-23).

import { useCallback, useEffect, useState } from 'react';
import { parseReport } from '../model/report.ts';
import type { Report } from '../types.ts';

const DATA_URL = 'prs.json';

export interface ReportData {
  // 'none': no snapshot is published; the data, if any, comes from Refresh.
  status: 'loading' | 'ready' | 'none' | 'error';
  report: Report | null;
  source: 'scheduled' | 'live' | null;
  error: string | null;
  // Set once the load finds no prs.json; it stays set after Refresh.
  noSnapshot: boolean;
}

class NoSnapshot extends Error {}

export function useReportData() {
  const [state, setState] = useState<ReportData>({ status: 'loading', report: null, source: null, error: null, noSnapshot: false });
  useEffect(() => {
    const controller = new AbortController();
    // A Refresh that finished first holds newer data, so a late snapshot or its error must not replace it.
    const unlessLive = (next: ReportData) => setState((prev) => (prev.source === 'live' ? { ...prev, noSnapshot: next.noSnapshot } : next));
    fetch(DATA_URL, { cache: 'no-store', signal: controller.signal })
      .then((response) => {
        if (response.status === 404) throw new NoSnapshot();
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then(parseReport)
      .then((report) => unlessLive({ status: 'ready', report, source: 'scheduled', error: null, noSnapshot: false }))
      .catch((error: Error) => {
        if (controller.signal.aborted) return;
        if (error instanceof NoSnapshot) {
          unlessLive({ status: 'none', report: null, source: null, error: null, noSnapshot: true });
          return;
        }
        unlessLive({ status: 'error', report: null, source: null, error: 'Cannot load ' + DATA_URL + ' (' + error.message + ').', noSnapshot: false });
      });
    return () => controller.abort();
  }, []);
  const showLive = useCallback((report: Report) => {
    setState((prev) => ({ ...prev, status: 'ready', report, source: 'live', error: null }));
  }, []);
  return { data: state, showLive };
}
