'use strict';
const locales=window.GALACTICA_GALLERY_LOCALES;
const requested=new URLSearchParams(location.search).get('lang') || (navigator.language || 'en').split('-')[0];
const language=Object.hasOwn(locales,requested)?requested:'en';
const t=(key,...values)=>(locales[language][key] || key).replace(/\{(\d+)\}/g,(_,i)=>values[Number(i)] ?? '{'+i+'}');
document.documentElement.lang=language;
document.title='Galactica-4 · '+t('Art comparison');
const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let textNode;
while((textNode=walker.nextNode())){const key=textNode.textContent.trim();if(locales.en[key])textNode.textContent=textNode.textContent.replace(key,t(key));}
document.querySelector('footer').firstChild.textContent='Galactica-4 · '+t('AI-generated alternate artwork')+' · ';
document.querySelector('#close-viewer').setAttribute('aria-label',t('Close image viewer'));
const languageSelect=document.querySelector('#language');languageSelect.value=language;languageSelect.onchange=()=>{const url=new URL(location.href);url.searchParams.set('lang',languageSelect.value);location.href=url;};
const styles=['anime','realistic','classic'];
const hulls=['Satellite','Scout','Colony','Traveller','Rama','Falcon','Hawk','Raven','Riviel','Wolven','Valkyrie','Avenger','Banshee'];
const cache=new Map();
const viewer=document.querySelector('#viewer');
let failures=0;
function element(tag,props={},children=[]){const e=document.createElement(tag);Object.assign(e,props);e.append(...children);return e;}
function openImage(title,url){document.querySelector('#viewer-title').textContent=title;const img=document.querySelector('#large-image');img.src=url;img.alt=title;const a=document.querySelector('#download');a.href=url;a.download=title.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.png';viewer.showModal();}
document.querySelector('#close-viewer').onclick=()=>viewer.close();
viewer.onclick=e=>{if(e.target===viewer)viewer.close();};
document.querySelector('#surface').onchange=e=>{document.documentElement.style.setProperty('--surface',{checker:'repeating-conic-gradient(#202838 0% 25%,#283244 0% 50%) 0 / 24px 24px',dark:'#070a10',light:'#e7eaf0'}[e.target.value]);};
function route(style,path){
 const hull=/^events\/layers\/pict-30(?:0[0-9]|1[0-2])\.png$/.test(path);
 const scene=/^events\/(labback|labtop|victory|defeat)\.png$/.test(path);
 const dock=/^events\/layers\/pict-(2000|2100)\.png$/.test(path);
 if(style==='anime')return {url:'../'+path,original:!(hull||scene||dock)};
 if(hull||scene||dock&&style==='classic')return {url:'../../old-art/art-styles/'+style+'/'+path,original:false};
 if(dock)return {url:'../../old-art/original-default/'+path,original:true};
 return {url:'../'+path,original:true};
}
function load(style,layer){const {url,original}=route(style,layer.path);const key=url+':'+layer.mode;if(!cache.has(key))cache.set(key,new Promise((resolve,reject)=>{
 const img=new Image();img.onload=()=>{
  try{const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);
   if(original && (layer.mode===36 || layer.mode===33)){
    const pixels=ctx.getImageData(0,0,c.width,c.height);const color=layer.mode===33?[0,0,0]:layer.background.map(v=>Math.round(v/257));
    for(let i=0;i<pixels.data.length;i+=4)if(color.every((v,j)=>Math.abs(pixels.data[i+j]-v)<=1))pixels.data[i+3]=0;
    ctx.putImageData(pixels,0,0);
   }
   resolve({image:c,url,original});
  }catch(error){reject(Error(t('Could not load {0}',url)+'. '+t('Serve the project or dist over HTTP.')+' '+error.message));}
 };img.onerror=()=>reject(Error(t('Could not load {0}',url)));img.src=url;
}));return cache.get(key);}
function imageButton(title){const button=element('button',{className:'art-button',type:'button',title:t('Inspect {0}',title)});button.setAttribute('aria-label',t('Inspect {0}',title));return button;}
function report(error){failures++;const status=document.querySelector('#status');status.className='failed';status.textContent=error.message;console.error(error);}
function selectControl(label,options){const select=element('select');for(const [value,text] of options)select.append(element('option',{value,textContent:t(text)}));return {node:element('label',{},[document.createTextNode(t(label)),select]),select};}
function checkbox(label){const input=element('input',{type:'checkbox',checked:true});return {node:element('label',{},[input,document.createTextNode(t(label))]),input};}
function scene(kind,title){
 const section=element('div',{className:'scene',id:'scene-'+kind});section.append(element('h3',{textContent:t(title)}));
 const controls=element('div',{className:'controls'});const hull=selectControl('Hull',hulls.map((h,i)=>[String(i),h]));
 const blueprint=selectControl('Research class',Object.keys(window.GALACTICA_ART_LAYERS).filter(k=>Number(k)>=400&&Number(k)<500).map(k=>[k,t('Class {0}',Number(k)-399)]));
 const space=selectControl('Space background',Array.from({length:7},(_,i)=>[String(i),['Blue nebula','Violet nebula','Red starfield','Golden nebula','Dense starfield','Pink nebula','Orange nebula'][i]]));
 if(kind==='lab')controls.append(blueprint.node);else controls.append(hull.node);
 if(kind==='movement')controls.append(space.node);
 const background=checkbox('Background'),subject=checkbox(kind==='lab'?'Blueprint':'Hull'),foreground=checkbox(kind==='movement'?'Propulsion effects':'Foreground');
 controls.append(background.node,subject.node,foreground.node);section.append(controls);
 const row=element('div',{className:'comparison'});const cards=styles.map(style=>{
  const canvas=element('canvas',{width:1632,height:960});const button=imageButton(t(style[0].toUpperCase()+style.slice(1))+' '+t(title));button.append(canvas);
  button.onclick=()=>openImage(t(style[0].toUpperCase()+style.slice(1))+' '+t(title),canvas.toDataURL('image/png'));
  const caption=element('p',{className:'caption'});row.append(element('div',{},[button,caption]));return {style,canvas,caption};
 });section.append(row);document.querySelector('#scene-list').append(section);
 let version=0;
 const render=async()=>{
  const token=++version;section.dataset.ready='false';
  const resource=kind==='stardock'?300+Number(hull.select.value):kind==='lab'?Number(blueprint.select.value):3000+Number(space.select.value)*100+Number(hull.select.value);
  const layers=window.GALACTICA_ART_LAYERS[resource];
  try{await Promise.all(cards.map(async card=>{
   const prepared=await Promise.all(layers.map(layer=>load(card.style,layer)));if(token!==version)return;
   const ctx=card.canvas.getContext('2d');ctx.clearRect(0,0,card.canvas.width,card.canvas.height);
   layers.forEach((layer,i)=>{
    const role=layer.mode===0?'background':kind==='lab'?(layer.mode===33?'subject':'foreground'):(layer.mode===33 || layer.picture===2100?'foreground':'subject');
    if(!({background,subject,foreground}[role].input.checked))return;
    ctx.globalCompositeOperation=layer.mode===33?'lighter':'source-over';ctx.drawImage(prepared[i].image,0,0,1632,960);
   });ctx.globalCompositeOperation='source-over';
   card.caption.textContent=(kind==='lab'?blueprint.select.selectedOptions[0].textContent:hulls[Number(hull.select.value)])+(kind==='movement'?' · '+space.select.selectedOptions[0].textContent:'')+(card.style==='realistic'&&kind==='stardock'?' · '+t('Original dock'):'');
  }));if(token===version)section.dataset.ready='true';}catch(error){report(error);}
 };
 controls.addEventListener('change',render);return render();
}
function asset(title,path,mode=0,outcome=false){
 const section=element('div',{className:'asset'+(outcome?' outcome':'')});section.append(element('h3',{textContent:t(title)}));const row=element('div',{className:'comparison'});section.append(row);document.querySelector('#asset-list').append(section);
 return Promise.all(styles.map(async style=>{
  const button=imageButton(t(style[0].toUpperCase()+style.slice(1))+' '+t(title)),caption=element('p',{className:'caption'});row.append(element('div',{},[button,caption]));
  try{const loaded=await load(style,{path,mode,background:[0,65535,0]});const img=element('img',{src:loaded.image.toDataURL('image/png'),alt:t(style[0].toUpperCase()+style.slice(1))+' '+t(title),loading:'lazy'});button.append(img);button.onclick=()=>openImage(t(style[0].toUpperCase()+style.slice(1))+' '+t(title),img.src);caption.textContent=loaded.original?t('Original shared artwork'):style+'/'+path;}catch(error){report(error);}
 }));
}
window.artGalleryReady=(async()=>{
 await Promise.all([scene('stardock','Stardock'),scene('lab','Research laboratory'),scene('movement','Ship in movement')]);
 const jobs=hulls.map((h,i)=>asset(h,'events/layers/pict-'+(3000+i)+'.png',36));
 for(const [title,path,mode] of [['Lab background','events/labback.png',0],['Lab foreground','events/labtop.png',36],['Stardock background','events/layers/pict-2000.png',0],['Stardock foreground','events/layers/pict-2100.png',36]])jobs.push(asset(title,path,mode));
 jobs.push(asset('Victory','events/victory.png',0,true),asset('Defeat','events/defeat.png',0,true));
 await Promise.all(jobs);
 if(!failures){document.querySelector('#status').textContent=t('All artwork loaded. Scene controls are ready.');document.documentElement.dataset.ready='true';}
 return {failures,artworkRows:jobs.length};
})();
