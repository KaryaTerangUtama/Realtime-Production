export const APP_CLIENT_VERSION = '2.6.0-20261031-03';

/**
 * Completely purges stale caches, updates/unregisters old service workers,
 * and performs a hard reload to ensure the client is on the newest version.
 */
export async function forceUpdateApp(silent = false) {
  try {
    if (!silent) {
      console.log('[VersionManager] Purging caches and updating to latest version...');
    }

    // 1. Clear CacheStorage
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      } catch (err) {
        console.warn('[VersionManager] Error deleting caches:', err);
      }
    }

    // 2. Tell active service worker to clear caches and skip waiting
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          if (reg.active) {
            reg.active.postMessage({ type: 'CLEAR_ALL_CACHES' });
            reg.active.postMessage({ type: 'SKIP_WAITING' });
          }
          await reg.update();
        }
      } catch (err) {
        console.warn('[VersionManager] Error updating service worker:', err);
      }
    }

    // 3. Mark current version in localStorage
    localStorage.setItem('fms_ktu_client_version', APP_CLIENT_VERSION);
    sessionStorage.setItem('fms_ktu_last_reloaded_version', APP_CLIENT_VERSION);

    // 4. Reload page
    window.location.reload();
  } catch (err) {
    console.error('[VersionManager] Force update error:', err);
    window.location.reload();
  }
}

/**
 * Checks server version and automatically refreshes if an outdated build is detected.
 */
export async function checkVersionAndAutoUpdate(): Promise<boolean> {
  try {
    const res = await fetch(`/api/version?t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (!res.ok) return false;

    const data = await res.json();
    if (data.version && data.version !== APP_CLIENT_VERSION) {
      const lastReloaded = sessionStorage.getItem('fms_ktu_last_reloaded_version');
      if (lastReloaded !== data.version) {
        sessionStorage.setItem('fms_ktu_last_reloaded_version', data.version);
        console.log(`[VersionManager] New version detected: ${data.version} (current: ${APP_CLIENT_VERSION}). Updating...`);
        await forceUpdateApp(true);
        return true;
      }
    }
  } catch (err) {
    // Network or server temporarily unreachable
  }
  return false;
}

/**
 * Initializes automatic version monitoring on tab focus, visibility change, and interval.
 */
export function initVersionMonitoring() {
  if (typeof window === 'undefined') return;

  // Immediate check on startup
  checkVersionAndAutoUpdate();

  // Check whenever user switches back to this tab or unlocks their device
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkVersionAndAutoUpdate();
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((r) => r.update());
        });
      }
    }
  });

  window.addEventListener('focus', () => {
    checkVersionAndAutoUpdate();
  });

  // Periodic background check every 60 seconds
  setInterval(() => {
    checkVersionAndAutoUpdate();
  }, 60 * 1000);

  // Listen to Service Worker controllerchange to reload seamlessly
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[VersionManager] New service worker controller activated. Reloading...');
      window.location.reload();
    });
  }
}
