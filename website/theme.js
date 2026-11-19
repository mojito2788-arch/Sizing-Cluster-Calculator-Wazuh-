(function(){
const button=document.getElementById('theme-toggle');
function apply(dark){document.documentElement.dataset.theme=dark?'dark':'light';button.setAttribute('aria-checked',String(dark));button.title=dark?'Switch to light mode':'Switch to dark mode';}
apply(document.documentElement.dataset.theme==='dark');
button.addEventListener('click',()=>{const dark=document.documentElement.dataset.theme!=='dark';apply(dark);try{localStorage.setItem('cluster-theme',dark?'dark':'light');}catch{}});
window.addEventListener('storage',event=>{if(event.key==='cluster-theme')apply(event.newValue==='dark');});
})();
