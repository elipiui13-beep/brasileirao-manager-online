(function(){
'use strict';
const MP={code:null,token:null,index:0,version:0,liveVersion:0,host:false,poll:null,applying:false,online:false,players:[],allReady:false,lastLivePush:0,installed:false};
const api=(path,opt={})=>fetch(path,{...opt,headers:{'Content-Type':'application/json',...(MP.token?{'X-Player-Token':MP.token}:{}),...(opt.headers||{})}}).then(async r=>{const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Falha de conexão');return j});
function cTeams(){return (typeof DB!=='undefined'?DB:[]).filter(t=>t.division==='C')}
function randomItem(a){return a[Math.floor(Math.random()*a.length)]}
function buildState(name){
  let ts=makeTeams(),chosen=randomItem(ts.filter(t=>t.division==='C'));chosen.human=0;
  S={season:2026,round:0,turn:0,teams:ts,globalMarket:WORLD.map(p=>({...p,bought:false})),managers:[{name:name||'Técnico 1',team:chosen.id,reputation:10,careerPoints:0,seasons:0,titles:0,promotions:0,salary:0}],news:[`🌐 Carreira online criada por ${name||'Técnico 1'} no ${chosen.name}.`],offers:[],marketModelVersion:2,finished:false};S.schedules=buildSchedules();
  if(typeof ensureV14==='function')ensureV14(); return chosen;
}
function overlay(){
  const el=document.createElement('div');el.id='mpLobby';el.innerHTML=`<style>
  #mpLobby{position:fixed;inset:0;background:rgba(5,12,24,.96);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;color:#eef}
  #mpLobby .box{width:min(760px,100%);background:#111c31;border:1px solid #33466b;border-radius:18px;padding:24px;box-shadow:0 25px 80px #0009}
  #mpLobby h1{margin-top:0}#mpLobby .tabs{display:flex;gap:8px;margin:18px 0}#mpLobby input,#mpLobby select{width:100%;padding:12px;margin:6px 0 12px;border-radius:9px;border:1px solid #42577e;background:#091326;color:#fff}
  #mpLobby .row{display:grid;grid-template-columns:1fr 1fr;gap:18px}#mpLobby button{padding:12px 16px;border:0;border-radius:9px;font-weight:800;cursor:pointer;background:#2f75ff;color:white}.muted{opacity:.72}.err{color:#ff7f87;font-weight:700}
  #mpTop{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end;margin-top:6px;max-width:760px;color:#fff}
  #mpTop .mp-summary{background:#0c1729;border:1px solid #4a76bd;border-radius:12px;padding:7px 10px;box-shadow:0 6px 18px #0005}
  #mpTop .mp-room{font-size:11px;opacity:.8}.mp-status{display:flex;gap:10px;flex-wrap:wrap;margin-top:3px;font-size:12px}.mp-ok{color:#79e89a;font-weight:800}.mp-wait{color:#ffd36b;font-weight:800}
  #mpTop .mp-actions{display:flex;gap:6px;align-items:center}#mpTop button{border:0;border-radius:9px;cursor:pointer;font-weight:900;min-height:34px;padding:7px 11px}
  .mp-inline-actions{display:inline-flex;gap:10px;align-items:center;flex-wrap:wrap}.mp-inline-ready{font-size:inherit!important}
  #mpCopyBtn{background:#344967;color:#fff}.mp-live-badge{display:inline-flex;align-items:center;gap:7px;background:#9c1d2c;color:#fff;border-radius:999px;padding:4px 8px;font-weight:900;font-size:11px;animation:mpPulse 1.2s infinite}
  @keyframes mpPulse{50%{opacity:.65}}@media(max-width:760px){#mpLobby .row{grid-template-columns:1fr}#mpTop{justify-content:flex-start;width:100%;max-width:none}main#game header{align-items:flex-start;flex-wrap:wrap}#mpTop .mp-summary{width:100%}}
  </style><div class="box"><h1>🌐 Brasileirão Manager Online</h1><p class="muted">Crie uma carreira ou entre usando o código enviado pelo seu amigo.</p><div class="row"><section><h2>Criar sala</h2><input id="mpCreateName" placeholder="Seu nome"><div class="muted" style="margin:4px 0 14px">Seu clube será sorteado aleatoriamente entre os times da Série C.</div><button id="mpCreate">Criar carreira online</button></section><section><h2>Entrar na sala</h2><input id="mpCode" maxlength="6" placeholder="Código da sala"><input id="mpJoinName" placeholder="Seu nome"><div class="muted" style="margin:4px 0 14px">Você receberá outro clube aleatório da Série C.</div><button id="mpJoin">Entrar na carreira</button></section></div><p id="mpMsg" class="err"></p><hr><button id="mpSolo" style="background:#47556d">Continuar no modo individual</button></div>`;document.body.appendChild(el);
  el.querySelector('#mpSolo').onclick=()=>el.remove();el.querySelector('#mpCreate').onclick=createRoom;el.querySelector('#mpJoin').onclick=joinRoom;
}
function msg(x){const e=document.getElementById('mpMsg');if(e)e.textContent=x||''}
async function createRoom(){try{msg('Criando sala...');const name=document.getElementById('mpCreateName').value.trim()||'Técnico 1';const chosen=buildState(name);const r=await api('/api/rooms/create',{method:'POST',body:JSON.stringify({name,teamId:chosen.id,state:S})});enter(r,true);document.getElementById('mpLobby').remove();saveLocal();openGame();alert(`Sala criada!\nSeu time: ${chosen.name}\nCódigo: ${r.code}\nEnvie esse código ao seu amigo.`)}catch(e){msg(e.message)}}
async function joinRoom(){try{msg('Entrando...');const code=document.getElementById('mpCode').value.trim().toUpperCase(),name=document.getElementById('mpJoinName').value.trim()||'Técnico 2';const r=await api(`/api/rooms/${code}/join`,{method:'POST',body:JSON.stringify({name})});enter(r,false);document.getElementById('mpLobby').remove();applyRoom(r.room,true);saveLocal();openGame();alert(`Você entrou na sala ${code}.\nSeu time: ${team(manager().team).name}`)}catch(e){msg(e.message)}}
function enter(r,host){MP.code=r.code;MP.token=r.token;MP.index=r.managerIndex;MP.host=host;MP.online=true;sessionStorage.setItem('bm_mp',JSON.stringify({code:MP.code,token:MP.token,index:MP.index,host}));applyRoom(r.room,true);install();startPoll()}
function applyLiveSnapshot(snapshot){
  if(MP.host)return;
  if(!snapshot){if(live&&live._remote){live=null;const active=document.querySelector('nav button.active')?.dataset.v;if(active==='gameplay')render('gameplay')}return}
  const wasActive=!!(live&&live.active),oldMinute=live&&live.minute;
  live={...snapshot,_remote:true,timer:null};
  const nav=document.querySelector('nav button.active')?.dataset.v;
  if(snapshot.active&&!wasActive){setActiveNav('gameplay');render('gameplay')}
  else if(nav==='gameplay'&&oldMinute!==snapshot.minute){gameplay(gameplayDivision||team(manager().team)?.division||'C')}
}
function applyRoom(room,forceState=false){if(!room)return;const stateChanged=forceState||room.version>MP.version;MP.version=Math.max(MP.version,room.version||0);MP.players=room.players||[];MP.allReady=MP.players.length===2&&MP.players.every(p=>p.ready);if(stateChanged&&room.state){MP.applying=true;S=room.state;S.turn=MP.index;MP.applying=false;}if((room.liveVersion||0)>MP.liveVersion||forceState){MP.liveVersion=room.liveVersion||0;applyLiveSnapshot(room.live||null)}drawBar()}
function saveLocal(){try{localStorage.setItem('brCareerV12',JSON.stringify(S))}catch{}}
let saveTimer=null;
function pushState(){if(!MP.online||MP.applying||!S)return;clearTimeout(saveTimer);saveTimer=setTimeout(async()=>{try{S.turn=MP.index;const r=await api(`/api/rooms/${MP.code}/state`,{method:'PUT',body:JSON.stringify({version:MP.version,state:S})});MP.version=r.version;drawBar()}catch(e){console.warn('Falha ao sincronizar:',e.message)}},180)}
let livePushBusy=false;
async function pushLive(force=false){
  if(!MP.online||!MP.host||livePushBusy)return;
  const now=Date.now();if(!force&&now-MP.lastLivePush<420)return;MP.lastLivePush=now;livePushBusy=true;
  try{
    const snapshot=live?{minute:live.minute,games:live.games,events:live.events,speed:live.speed,paused:live.paused,active:live.active,finished:live.finished,userSubs:live.userSubs||0}:null;
    const r=await api(`/api/rooms/${MP.code}/live`,{method:'POST',body:JSON.stringify({live:snapshot})});MP.liveVersion=r.liveVersion||MP.liveVersion;
  }catch(e){console.warn('Falha ao transmitir partida:',e.message)}finally{livePushBusy=false}
}
function readyLabel(){const me=MP.players.find(p=>p.managerIndex===MP.index);return {ready:!!(me&&me.ready),label:me&&me.ready?'Cancelar pronto':'✓ ESTOU PRONTO'}}
function enhanceGameButtons(){
  if(!MP.online)return;
  document.body.classList.toggle('mp-host',!!MP.host);document.body.classList.toggle('mp-guest',!MP.host);
  const starts=[...document.querySelectorAll('button[onclick*="startLive"]')];
  starts.forEach(btn=>{
    let wrap=btn.parentElement;
    if(!wrap||!wrap.classList.contains('mp-inline-actions')){
      const nw=document.createElement('span');nw.className='mp-inline-actions';
      btn.parentNode.insertBefore(nw,btn);nw.appendChild(btn);wrap=nw;
    }
    if(!MP.host){btn.style.display='none';btn.setAttribute('aria-hidden','true')}
    else{btn.style.display='';btn.removeAttribute('aria-hidden')}
    let ready=wrap.querySelector('.mp-inline-ready');
    if(!ready){ready=document.createElement('button');ready.type='button';ready.className='btn primary mp-inline-ready';ready.onclick=window.mpToggleReady;wrap.insertBefore(ready,btn)}
    const st=readyLabel();ready.className='btn primary mp-inline-ready';ready.classList.toggle('ready',st.ready);ready.textContent=st.label;
  });
}
function install(){
  if(MP.installed)return;MP.installed=true;
  const oldSave=window.save;window.save=function(){saveLocal();if(MP.online)pushState();else if(oldSave)oldSave();};
  window.manager=function(){return S.managers[MP.online?MP.index:S.turn]};
  const oldHeader=window.header;window.header=function(){S.turn=MP.online?MP.index:S.turn;oldHeader();drawBar()};
  const oldStart=window.startLive;window.startLive=function(){if(!MP.online)return oldStart();if(!MP.host)return alert('O anfitrião inicia a rodada quando os dois estiverem prontos. Você acompanhará tudo ao vivo.');if(!MP.allReady)return alert('Os dois técnicos precisam marcar “Estou pronto” para iniciar a rodada.');oldStart();setTimeout(()=>pushLive(true),80)};
  const oldTick=window.liveTick;window.liveTick=function(){oldTick();if(MP.online&&MP.host)pushLive(false)};
  const oldPause=window.toggleLivePause;window.toggleLivePause=function(){if(MP.online&&!MP.host)return alert('Somente o anfitrião controla a pausa.');oldPause();pushLive(true)};
  const oldSpeed=window.changeLiveSpeed;window.changeLiveSpeed=function(){if(MP.online&&!MP.host)return alert('Somente o anfitrião controla a velocidade.');oldSpeed();pushLive(true)};
  const oldFinish=window.finishRound;window.finishRound=function(){oldFinish();if(MP.online){pushLive(true);api(`/api/rooms/${MP.code}/ready`,{method:'POST',body:JSON.stringify({ready:false})}).catch(()=>{});setTimeout(()=>{pushState();pushLive(true)},300)}};
  window.mpToggleReady=async function(){try{const me=MP.players.find(p=>p.managerIndex===MP.index),r=await api(`/api/rooms/${MP.code}/ready`,{method:'POST',body:JSON.stringify({ready:!(me&&me.ready)})});applyRoom(r.room)}catch(e){alert(e.message)}};
  window.mpCopyCode=()=>navigator.clipboard?.writeText(MP.code).then(()=>alert('Código copiado: '+MP.code)).catch(()=>prompt('Copie o código:',MP.code));
  const observer=new MutationObserver(()=>enhanceGameButtons());observer.observe(document.body,{childList:true,subtree:true});setTimeout(enhanceGameButtons,0);
}
function drawBar(){
  if(!MP.online)return;
  const header=document.querySelector('main#game header');if(!header)return;
  let b=document.getElementById('mpTop');
  if(!b){b=document.createElement('div');b.id='mpTop';header.appendChild(b)}
  const me=MP.players.find(p=>p.managerIndex===MP.index),other=MP.players.find(p=>p.managerIndex!==MP.index),isLive=!!(live&&live.active);
  b.innerHTML=`<div class="mp-summary"><div><b>🌐 Sala ${MP.code}</b> <span class="mp-room">${MP.host?'• Anfitrião':'• Conectado'}</span> ${isLive?'<span class="mp-live-badge">● AO VIVO</span>':''}</div><div class="mp-status"><span class="${me&&me.ready?'mp-ok':'mp-wait'}">Você: ${me&&me.ready?'✓ Pronto':'○ Não pronto'}</span><span class="${other&&other.ready?'mp-ok':'mp-wait'}">${other?other.name:'Aguardando amigo'}: ${other?(other.ready?'✓ Pronto':'○ Não pronto'):'—'}</span></div></div><div class="mp-actions"><button id="mpCopyBtn" onclick="mpCopyCode()">Copiar código</button></div>`;
  setTimeout(enhanceGameButtons,0)
}
function startPoll(){clearInterval(MP.poll);MP.poll=setInterval(async()=>{if(!MP.online||document.hidden)return;try{const r=await api(`/api/rooms/${MP.code}`);const changed=r.version>MP.version||(r.liveVersion||0)>MP.liveVersion;applyRoom(r,changed&&r.version>MP.version);if(changed)saveLocal()}catch(e){console.warn(e.message)}},650)}
async function resume(){try{const x=JSON.parse(sessionStorage.getItem('bm_mp')||'null');if(!x)return false;MP.code=x.code;MP.token=x.token;MP.index=x.index;MP.host=x.host;MP.online=true;const r=await api(`/api/rooms/${MP.code}`);applyRoom(r,true);install();startPoll();document.getElementById('mpLobby')?.remove();saveLocal();openGame();return true}catch{return false}}
window.addEventListener('load',async()=>{overlay();await resume()});
})();
