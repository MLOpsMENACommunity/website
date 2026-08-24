/**
 * Runs before first paint, from <head>, so the page never flashes the wrong
 * theme. Light is the default: the system preference is deliberately NOT
 * consulted, only an explicit choice the visitor made with the nav toggle.
 */
export const themeScript = `(function(){try{
  var d = localStorage.getItem('theme') === 'dark';
  if (d) document.documentElement.classList.add('dark');
  document.documentElement.style.colorScheme = d ? 'dark' : 'light';
}catch(e){}})();`
