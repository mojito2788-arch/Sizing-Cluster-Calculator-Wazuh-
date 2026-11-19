(function(){
const tip=document.createElement('div');tip.id='field-tooltip';tip.className='field-tooltip';tip.setAttribute('role','tooltip');tip.hidden=true;document.body.appendChild(tip);
let owner=null,timer=null;
function hide(){clearTimeout(timer);if(owner)owner.removeAttribute('aria-describedby');owner=null;tip.hidden=true;}
function show(button){clearTimeout(timer);if(owner&&owner!==button)owner.removeAttribute('aria-describedby');owner=button;tip.textContent=button.dataset.help;tip.hidden=false;button.setAttribute('aria-describedby',tip.id);const r=button.getBoundingClientRect();tip.style.left=Math.max(12,Math.min(r.left,innerWidth-tip.offsetWidth-12))+'px';const below=r.bottom+9;tip.style.top=(below+tip.offsetHeight<innerHeight-12?below:Math.max(12,r.top-tip.offsetHeight-9))+'px';}
function deferHide(){clearTimeout(timer);timer=setTimeout(()=>{if(owner&&document.activeElement!==owner)hide();},120);}
document.addEventListener('pointerover',e=>{const button=e.target.closest('.help-icon');if(button)show(button);else if(tip.contains(e.target))clearTimeout(timer);});
document.addEventListener('pointerout',e=>{if(e.target.closest('.help-icon')||tip.contains(e.target))deferHide();});
document.addEventListener('focusin',e=>{if(e.target.matches('.help-icon'))show(e.target);else hide();});
document.addEventListener('click',e=>{const button=e.target.closest('.help-icon');if(button)show(button);else if(!tip.contains(e.target))hide();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});
document.addEventListener('change',hide);window.addEventListener('resize',hide);window.addEventListener('scroll',()=>{if(owner&&owner.isConnected)show(owner);else hide();},true);
})();

