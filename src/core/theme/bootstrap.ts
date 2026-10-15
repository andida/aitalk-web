// Return literal source, never Function.toString(): server bundlers can inject
// helper references into serialized functions that do not exist in the browser.
export function themeBootstrap(defaultTheme: string) {
  const fallback =
    defaultTheme === 'dark' || defaultTheme === 'light'
      ? defaultTheme
      : 'system';
  return `(function () {
    var theme = ${JSON.stringify(fallback)};
    try { var stored = localStorage.getItem('theme'); if (stored === 'light' || stored === 'dark' || stored === 'system') theme = stored; } catch (_) {}
    if (theme === 'system') theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    document.documentElement.style.colorScheme = theme;
  })();`;
}
