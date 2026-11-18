/* Device-only reading preference, independent of the shared visual editor. */
(function(){'use strict';
 const key='bazar-display-mode';
 function apply(dark){
  document.documentElement.classList.toggle('bazar-dark',dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#202326':'#f5efdf');
 }
 let dark=false;try{dark=localStorage.getItem(key)==='dark';}catch{}
 apply(dark);
 window.BazarDisplayMode={
  isDark:()=>document.documentElement.classList.contains('bazar-dark'),
  set(dark){apply(dark);try{localStorage.setItem(key,dark?'dark':'light');}catch{}}
 };
 window.addEventListener('storage',event=>{if(event.key===key)apply(event.newValue==='dark');});
})();
