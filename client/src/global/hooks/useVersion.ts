import { useState, useEffect, useCallback } from 'react';

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: string[];
}

export interface VersionInfo {
  version: string;
  buildDate: string;
  changelog: ChangelogEntry[];
}

const STORAGE_KEY = 'smartbasket_last_seen_version';

export function useVersion() {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [newChanges, setNewChanges] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch version info from server
  const fetchVersion = useCallback(async () => {
    try {
      // Add timestamp to prevent caching
      const response = await fetch(`/version.json?t=${Date.now()}`);
      if (!response.ok) throw new Error('Failed to fetch version');

      const data: VersionInfo = await response.json();
      setVersionInfo(data);

      // Check if this is a new version
      const lastSeenVersion = localStorage.getItem(STORAGE_KEY);

      if (lastSeenVersion !== data.version) {
        // Find all changes since last seen version
        const changes: ChangelogEntry[] = [];

        for (const entry of data.changelog) {
          if (!lastSeenVersion) {
            // First time user - show only latest version
            changes.push(entry);
            break;
          }

          // Compare versions (simple string comparison works for semver)
          if (entry.version > lastSeenVersion) {
            changes.push(entry);
          }
        }

        if (changes.length > 0) {
          setNewChanges(changes);
          setShowWhatsNew(true);
        }
      }
    } catch (error) {
      console.error('Failed to fetch version info:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchVersion();
  }, [fetchVersion]);

  // Mark version as seen
  const dismissWhatsNew = useCallback(() => {
    if (versionInfo) {
      localStorage.setItem(STORAGE_KEY, versionInfo.version);
    }
    setShowWhatsNew(false);
    setNewChanges([]);
  }, [versionInfo]);

  // Force check for updates
  const checkForUpdates = useCallback(async () => {
    setLoading(true);
    await fetchVersion();
  }, [fetchVersion]);

  return {
    version: versionInfo?.version || '0.0.0',
    buildDate: versionInfo?.buildDate || '',
    changelog: versionInfo?.changelog || [],
    showWhatsNew,
    newChanges,
    loading,
    dismissWhatsNew,
    checkForUpdates,
  };
}
