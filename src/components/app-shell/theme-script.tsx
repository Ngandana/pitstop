const THEME_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("pitstop-theme");
    var dark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", dark);
  } catch (e) {}
})();
`;

/**
 * Sets the .dark class before hydration so there's no flash of the wrong
 * theme. Must run in <head>, synchronously, before first paint.
 */
export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />;
}
