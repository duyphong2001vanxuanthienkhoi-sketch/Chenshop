export const THEME_KEY = "chen-theme";

/** Runs in <head> before the page paints, so a dark-mode visitor never sees a white flash. */
export const THEME_BOOT = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.setAttribute('data-theme','dark');}catch(e){}})();`;
