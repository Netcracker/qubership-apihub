// Browser preferences combined with shared repository, bot, and detection configuration.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { applyLinkColumns, applyLinkOrder, cleanBots, groupsToSave, linkWithGroups, moveStoredBots, readLinkSettings, withDefaultBots } from '../board/link.ts';
import { groupsToText } from '../board/groups.ts';
import { loadSettings, saveSettings } from '../settings.ts';
import type { Settings } from '../settings.ts';
import { BUILD_DEFAULTS } from '../config.ts';
import { areaCriteriaQuery } from '../model/areas.ts';

export function useBoardSettings() {
  const [start] = useState(() => {
    const botsSpecified = new URLSearchParams(window.location.search).has('bots');
    const bots = moveStoredBots(loadSettings(BUILD_DEFAULTS.groups), readLinkSettings(), botsSpecified);
    const link = withDefaultBots(bots.link, BUILD_DEFAULTS.bots, botsSpecified || bots.moved);
    const columns = applyLinkColumns(bots.settings, link);
    const order = applyLinkOrder(columns.settings, columns.link);
    return {
      settings: order.settings,
      link: { ...linkWithGroups(order.link, order.settings.repoGroups),
        criteria: order.link.criteria ?? order.settings.rules.areaCriteria },
      changed: bots.moved || columns.changed || order.changed,
    };
  });
  const [stored, setStored] = useState(start.settings);
  const [link, setLink] = useState(start.link);
  useEffect(() => { if (start.changed) saveSettings(start.settings); }, [start]);

  const shownGroups = link.groups || stored.repoGroups;
  const settings = useMemo(() => ({ ...stored, repoGroups: shownGroups,
    rules: { ...stored.rules, extraBots: link.bots, areaCriteria: link.criteria ?? stored.rules.areaCriteria } }),
    [stored, shownGroups, link.bots, link.criteria]);
  const setSettings = useCallback((next: Settings) => {
    // Reset also saves defaults when a shared link already shows them over older browser preferences.
    const criteriaChanged = next.rules.areaCriteria !== settings.rules.areaCriteria;
    const kept = { ...next, repoGroups: groupsToSave(next.repoGroups, shownGroups, stored.repoGroups),
      rules: { ...next.rules, extraBots: [], areaCriteria: criteriaChanged ? next.rules.areaCriteria : stored.rules.areaCriteria } };
    saveSettings(kept);
    setStored(kept);
    // The same link object when bots, columns, and groups did not change: a theme change then leaves the address alone.
    const bots = cleanBots(next.rules.extraBots);
    const hidden = next.hiddenColumns;
    const order = next.columnOrder;
    const groups = next.repoGroups;
    setLink((prev) => (bots.join(',') === prev.bots.join(',') && hidden.join(',') === (prev.hidden || []).join(',')
      && order.join(',') === (prev.order || []).join(',')
      && groupsToText(groups) === groupsToText(prev.groups || [])
      && areaCriteriaQuery(next.rules.areaCriteria) === areaCriteriaQuery(prev.criteria ?? stored.rules.areaCriteria)
      ? prev : { ...prev, bots, hidden, order, groups, criteria: next.rules.areaCriteria }));
  }, [shownGroups, stored, settings.rules.areaCriteria]);
  const setRepos = useCallback((repos: string[]) => setLink((prev) => ({ ...prev, repos })), []);
  return { settings, setSettings, link, setRepos };
}
