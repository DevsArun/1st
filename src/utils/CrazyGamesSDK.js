/**
 * @file CrazyGamesSDK.js
 * @description  Stub wrapper for the CrazyGames SDK v3.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  HOW TO ACTIVATE THE REAL SDK
 * ══════════════════════════════════════════════════════════════════════════
 *
 *  1. In index.html, replace the placeholder comment with:
 *       <script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>
 *
 *  2. Set REAL_SDK_ENABLED = true in this file (or set window.CrazyGames
 *     before this module loads — the auto-detect below handles it).
 *
 *  3. No other changes needed — all game code already calls CrazyGamesSDK.*
 *     and this module transparently delegates to the real SDK.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  STUB BEHAVIOUR
 * ══════════════════════════════════════════════════════════════════════════
 *
 *  - All methods log to console in development so you can verify call sites.
 *  - requestAd() resolves successfully after a simulated 2-second delay
 *    so the GameOver double-scrap flow can be tested without the real SDK.
 *  - gameplayStart() / gameplayStop() are no-ops in stub mode.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  API SURFACE (matches CrazyGames SDK v3 interface)
 * ══════════════════════════════════════════════════════════════════════════
 *
 *  CrazyGamesSDK.init()                     → Promise<void>
 *  CrazyGamesSDK.requestAd(type)            → Promise<void>   type: 'midgame'|'rewarded'
 *  CrazyGamesSDK.gameplayStart()            → void
 *  CrazyGamesSDK.gameplayStop()             → void
 *  CrazyGamesSDK.isAdBlocked()              → boolean
 *  CrazyGamesSDK.getUserInfo()              → Promise<UserInfo>
 *  CrazyGamesSDK.saveGameData(data)         → Promise<void>
 *  CrazyGamesSDK.loadGameData()             → Promise<any>
 *  CrazyGamesSDK.inviteLink(params)         → string
 */

// ── Detect whether the real CrazyGames SDK script has been loaded ─────────
const _hasRealSDK = () =>
  typeof window !== 'undefined' &&
  typeof window.CrazyGames !== 'undefined' &&
  typeof window.CrazyGames.SDK !== 'undefined';

// ── Dev logging ───────────────────────────────────────────────────────────
const _log  = (...args) => console.log  ('[CrazyGamesSDK]', ...args);
const _warn = (...args) => console.warn ('[CrazyGamesSDK]', ...args);

// ── Stub user info shape ──────────────────────────────────────────────────
const STUB_USER = {
  isLoggedIn: false,
  username:   'Player',
  profilePictureUrl: '',
  gameplayToken: null,
};

// ─────────────────────────────────────────────────────────────────────────────
//  EXPORTED SINGLETON
// ─────────────────────────────────────────────────────────────────────────────

export const CrazyGamesSDK = {

  /** True after init() resolves successfully with the real SDK. */
  _initialized: false,

  /** Ad is currently showing — block gameplay during this window. */
  _adActive: false,

  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Initialize the CrazyGames SDK.
   * Must be called before any other method.
   * Called by main.js before Phaser boots.
   *
   * @returns {Promise<void>}
   */
  async init() {
    if (_hasRealSDK()) {
      try {
        await window.CrazyGames.SDK.init();
        this._initialized = true;
        _log('Real SDK initialized ✓');
      } catch (err) {
        _warn('Real SDK init() threw:', err);
        throw err;
      }
    } else {
      // Stub mode
      _log('Running in STUB mode. Drop real SDK script into index.html to enable.');
      this._initialized = true;
      // Simulate brief async init
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  },

  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Request an advertisement.
   *
   * IMPORTANT: You MUST pause all game audio, physics, and rendering while
   * the ad plays. CrazyGames fires adStarted/adFinished events — our wrapper
   * handles this automatically.
   *
   * @param {'midgame'|'rewarded'} type
   * @returns {Promise<void>}  Resolves when the ad completes or is skipped.
   *                           Rejects if the ad fails / is blocked.
   */
  async requestAd(type = 'midgame') {
    if (_hasRealSDK()) {
      _log(`requestAd('${type}') → real SDK`);

      return new Promise((resolve, reject) => {
        const callbacks = {
          adStarted: () => {
            _log('Ad started');
            this._adActive = true;
            // Notify the game via a custom event so GameScene can pause
            window.dispatchEvent(new CustomEvent('mkr:adStart'));
          },
          adFinished: () => {
            _log('Ad finished');
            this._adActive = false;
            window.dispatchEvent(new CustomEvent('mkr:adEnd'));
            resolve();
          },
          adError: (err) => {
            _warn('Ad error:', err);
            this._adActive = false;
            window.dispatchEvent(new CustomEvent('mkr:adEnd'));
            reject(new Error(err));
          },
        };

        window.CrazyGames.SDK.ad.requestAd(type, callbacks);
      });

    } else {
      // Stub: simulate 2-second ad
      _log(`requestAd('${type}') → STUB (2 s simulated delay)`);
      this._adActive = true;
      window.dispatchEvent(new CustomEvent('mkr:adStart'));
      await new Promise((resolve) => setTimeout(resolve, 2000));
      this._adActive = false;
      window.dispatchEvent(new CustomEvent('mkr:adEnd'));
    }
  },

  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Signal to CrazyGames that active gameplay has started.
   * Call this when: run begins, pause menu closed.
   * CrazyGames uses this to throttle mid-game ad injection.
   */
  gameplayStart() {
    if (_hasRealSDK()) {
      window.CrazyGames.SDK.game.gameplayStart();
      _log('gameplayStart()');
    } else {
      _log('gameplayStart() [stub]');
    }
  },

  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Signal to CrazyGames that gameplay has stopped.
   * Call this when: run ends, pause menu opened, game over screen shown.
   */
  gameplayStop() {
    if (_hasRealSDK()) {
      window.CrazyGames.SDK.game.gameplayStop();
      _log('gameplayStop()');
    } else {
      _log('gameplayStop() [stub]');
    }
  },

  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Check if the user has an ad blocker active.
   * Use this to decide whether to offer the "watch ad for double scrap" UI.
   *
   * @returns {boolean}
   */
  isAdBlocked() {
    if (_hasRealSDK()) {
      return window.CrazyGames.SDK.ad.isAdBlocked ?? false;
    }
    _log('isAdBlocked() → false [stub]');
    return false;
  },

  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get CrazyGames user info (logged-in state, username, avatar).
   * Useful for leaderboards or personalized UI.
   *
   * @returns {Promise<{ isLoggedIn:boolean, username:string, profilePictureUrl:string }>}
   */
  async getUserInfo() {
    if (_hasRealSDK()) {
      try {
        const user = await window.CrazyGames.SDK.user.getUser();
        return user ?? STUB_USER;
      } catch {
        return STUB_USER;
      }
    }
    _log('getUserInfo() → stub user');
    return { ...STUB_USER };
  },

  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Persist game data to CrazyGames cloud save (overwrites previous save).
   * Falls back to localStorage silently if SDK unavailable.
   *
   * @param {Object} data   Any JSON-serializable object.
   * @returns {Promise<void>}
   */
  async saveGameData(data) {
    if (_hasRealSDK()) {
      try {
        await window.CrazyGames.SDK.data.setItem('mkr_save', JSON.stringify(data));
        _log('saveGameData() → cloud save OK');
      } catch (err) {
        _warn('saveGameData() cloud save failed, falling back to localStorage:', err);
        try { localStorage.setItem('mkr_cloudsave', JSON.stringify(data)); } catch {}
      }
    } else {
      _log('saveGameData() → localStorage [stub]');
      try { localStorage.setItem('mkr_cloudsave', JSON.stringify(data)); } catch {}
    }
  },

  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Load previously saved game data from CrazyGames cloud save.
   *
   * @returns {Promise<Object|null>}
   */
  async loadGameData() {
    if (_hasRealSDK()) {
      try {
        const raw = await window.CrazyGames.SDK.data.getItem('mkr_save');
        return raw ? JSON.parse(raw) : null;
      } catch (err) {
        _warn('loadGameData() cloud load failed:', err);
        return null;
      }
    } else {
      _log('loadGameData() → localStorage [stub]');
      try {
        const raw = localStorage.getItem('mkr_cloudsave');
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }
  },

  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Generate a shareable invite link with optional custom parameters.
   * Used for referral / social share buttons.
   *
   * @param {Object} [params]  Key/value pairs appended as query string.
   * @returns {string}         The full invite URL.
   */
  inviteLink(params = {}) {
    if (_hasRealSDK()) {
      return window.CrazyGames.SDK.game.inviteLink(params) ?? window.location.href;
    }
    const qs = new URLSearchParams(params).toString();
    const url = `${window.location.origin}${window.location.pathname}${qs ? '?' + qs : ''}`;
    _log('inviteLink() → stub:', url);
    return url;
  },
};
