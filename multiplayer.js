(function(){
'use strict';
const MP={code:null,token:null,index:0,version:0,liveVersion:0,host:false,poll:null,applying:false,online:false,players:[],allReady:false,lastLivePush:0,installed:false,remoteEventKeys:new Set(),remoteLiveActive:false};
window.MP=MP;
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
  #mpTop{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end;color:#fff;max-width:760px}
  #mpTop .mp-summary{background:#0c1729;border:1px solid #4a76bd;border-radius:11px;padding:6px 9px;box-shadow:0 5px 14px #0004}
  #mpTop .mp-room{font-size:11px;opacity:.8}.mp-status{display:flex;flex-direction:column;align-items:flex-start;gap:4px;margin-top:5px;font-size:12px}.mp-status-line{display:block}.mp-ok{color:#79e89a;font-weight:800}.mp-wait{color:#ffd36b;font-weight:800}
  #mpTop .mp-actions{display:flex;gap:6px;align-items:center}#mpTop button{border:0;border-radius:9px;cursor:pointer;font-weight:900;min-height:34px;padding:7px 11px}
  .mp-inline-actions{display:inline-flex;flex-direction:row;gap:2cm!important;align-items:center;flex-wrap:nowrap}.mp-inline-actions>button{width:auto}.mp-inline-ready{border:0!important;border-radius:12px!important;cursor:pointer;font-weight:900;min-height:44px;padding:10px 16px;color:#fff!important;font-size:15px;line-height:1}.mp-inline-ready.not-ready{background:#dc2626!important;background-image:linear-gradient(135deg,#b91c1c,#ef4444)!important;box-shadow:0 6px 18px #991b1b66!important}.mp-inline-ready.ready{background:#16a34a!important;background-image:linear-gradient(135deg,#15803d,#22c55e)!important;box-shadow:0 6px 18px #16653466!important}.mp-inline-ready:hover{filter:brightness(1.05)}.mp-inline-actions button[onclick*="startLive"]{margin-top:4px!important}.mp-save-btn{background:#2563eb!important;color:#fff!important;border:0;border-radius:9px;padding:7px 11px;font-weight:900;cursor:pointer}.mp-chat-page{height:min(620px,calc(100vh - 245px));min-height:360px;display:flex;flex-direction:column;background:#0b1527;border:1px solid #33466b;border-radius:12px;padding:14px;overflow:hidden}.mp-chat-page h2{margin:0 0 10px}.mp-chat-page .mp-chat-log{flex:1 1 auto;min-height:0;overflow-y:auto;padding:10px;background:#071020;border:1px solid #243657;border-radius:9px;font-size:14px}.mp-chat-message{padding:5px 3px;border-bottom:1px solid #ffffff10;overflow-wrap:anywhere}.mp-chat-send{display:flex;gap:8px;flex:0 0 auto;margin-top:10px}.mp-chat-send input{flex:1;background:#071020;color:#fff;border:1px solid #42577e;border-radius:7px;padding:10px;min-width:0}.mp-chat-send button{flex:0 0 auto}.mp-actions-log{flex:0 0 auto;max-height:90px;overflow-y:auto;display:flex;flex-direction:column;gap:3px;opacity:.72;margin-top:9px;border-top:1px solid #243657;padding-top:7px}@media(max-width:600px){.mp-chat-page{height:calc(100vh - 220px);min-height:330px;padding:9px}.mp-chat-send{gap:5px}.mp-chat-send input{padding:9px}}}
  .mp-live-badge{display:inline-flex;align-items:center;gap:7px;background:#9c1d2c;color:#fff;border-radius:999px;padding:4px 8px;font-weight:900;font-size:11px;animation:mpPulse 1.2s infinite}
  @keyframes mpPulse{50%{opacity:.65}}@media(max-width:760px){#mpLobby .row{grid-template-columns:1fr}main#game header{align-items:flex-start;flex-wrap:wrap}#mpTop{width:100%;justify-content:flex-start}#mpTop .mp-summary{width:100%}.mp-inline-actions{width:100%;gap:2cm!important;justify-content:flex-start}.mp-inline-ready{flex:0 0 auto}}
  </style><div class="box"><h1>🌐 Brasileirão Manager Online</h1><p class="muted">Crie uma carreira ou entre usando o código enviado pelo seu amigo.</p><div class="row"><section><h2>Criar sala</h2><input id="mpCreateName" placeholder="Seu login"><input id="mpCreatePass" type="password" placeholder="Crie uma senha"><div class="muted" style="margin:4px 0 14px">Seu clube será sorteado aleatoriamente entre os times da Série C.</div><button id="mpCreate">Criar carreira online</button></section><section><h2>Entrar na sala</h2><input id="mpCode" maxlength="6" placeholder="Código da sala"><input id="mpJoinName" placeholder="Seu login"><input id="mpJoinPass" type="password" placeholder="Sua senha"><div class="muted" style="margin:4px 0 14px">Você receberá outro clube aleatório da Série C.</div><button id="mpJoin">Entrar na carreira</button></section></div><p id="mpMsg" class="err"></p><div id="mpResumeBox"></div><hr><button id="mpSolo" style="background:#47556d">Continuar no modo individual</button></div>`;document.body.appendChild(el);
  el.querySelector('#mpSolo').onclick=()=>el.remove();el.querySelector('#mpCreate').onclick=createRoom;el.querySelector('#mpJoin').onclick=joinRoom;
  const saved=getSavedAccess();const rb=el.querySelector('#mpResumeBox');if(saved&&rb){rb.innerHTML=`<hr><h2>Carreira online salva</h2><p class="muted">Sala <b>${saved.code}</b> — ${saved.host?'Anfitrião':'Jogador 2'}</p><button id="mpResume">Continuar carreira online</button>`;rb.querySelector('#mpResume').onclick=()=>resume(true)}
}
function msg(x){const e=document.getElementById('mpMsg');if(e)e.textContent=x||''}
function getSavedAccess(){try{return JSON.parse(localStorage.getItem('bm_mp_access')||sessionStorage.getItem('bm_mp')||'null')}catch{return null}}
function storeAccess(){const data={code:MP.code,token:MP.token,index:MP.index,host:MP.host,name:MP.name||'',password:MP.password||''};sessionStorage.setItem('bm_mp',JSON.stringify(data));localStorage.setItem('bm_mp_access',JSON.stringify(data))}
async function createRoom(){try{msg('Criando sala...');const name=document.getElementById('mpCreateName').value.trim()||'Técnico 1',password=document.getElementById('mpCreatePass').value||'1234';if(password.length<4)throw new Error('A senha deve ter pelo menos 4 caracteres.');MP.name=name;MP.password=password;const chosen=buildState(name);const r=await api('/api/rooms/create',{method:'POST',body:JSON.stringify({name,password,teamId:chosen.id,state:S})});enter(r,true);document.getElementById('mpLobby')?.remove();saveLocal();openGame();setTimeout(drawBar,0);alert(`Sala criada!\nSeu time: ${chosen.name}\nCódigo: ${r.code}\nEnvie esse código ao seu amigo.`)}catch(e){msg(e.message)}}
async function joinRoom(){try{msg('Entrando...');const code=document.getElementById('mpCode').value.trim().toUpperCase(),name=document.getElementById('mpJoinName').value.trim()||'Técnico 2',password=document.getElementById('mpJoinPass').value||'1234';if(password.length<4)throw new Error('A senha deve ter pelo menos 4 caracteres.');MP.name=name;MP.password=password;const r=await api(`/api/rooms/${code}/join`,{method:'POST',body:JSON.stringify({name,password})});enter(r,false);document.getElementById('mpLobby')?.remove();applyRoom(r.room,true);saveLocal();openGame();setTimeout(drawBar,0);alert(`Você entrou na sala ${code}.\nSeu time: ${team(manager().team).name}`)}catch(e){msg(e.message)}}
function enter(r,host){MP.code=r.code;MP.token=r.token;MP.index=r.managerIndex;MP.host=host;MP.online=true;storeAccess();applyRoom(r.room,true);install();startPoll()}
function remoteEventKey(e){return `${e.min}|${e.type}|${e.teamId}|${e.division||''}|${e.text||''}`}
function playRemoteEventSounds(snapshot,previousKeys){
  if(typeof playSound!=='function')return;
  const mine=manager()?.team,opp=typeof currentOpponentId==='function'?currentOpponentId():null;
  const fresh=(snapshot.events||[]).filter(e=>!previousKeys.has(remoteEventKey(e))).reverse();
  fresh.forEach(e=>{
    if(e.teamId!==mine&&e.teamId!==opp)return;
    const own=e.teamId===mine,text=e.text||'';
    if(e.type==='goal')playSound('goal',own);
    else if(e.type==='penalty')playSound(text.includes('converte')?'goal':'penalty',own);
    else if(e.type==='redcard')playSound('red');
    else if(e.type==='cardev')playSound('yellow');
    else if(e.type==='injury')playSound('injury');
    else if(e.type==='save')playSound('save');
    else if(e.type==='chance')playSound('chance');
  });
}
function applyLiveSnapshot(snapshot){
  if(MP.host)return;
  const previousKeys=new Set(MP.remoteEventKeys),wasActive=MP.remoteLiveActive;
  if(!snapshot){
    if(wasActive){if(typeof playSound==='function')playSound('whistleEnd');if(typeof stopCrowd==='function')stopCrowd()}
    MP.remoteLiveActive=false;MP.remoteEventKeys.clear();
    if(live&&live._remote){live=null;const active=document.querySelector('nav button.active')?.dataset.v;if(active==='gameplay')render('gameplay')}
    return;
  }
  const oldMinute=live&&live.minute;
  live={...snapshot,_remote:true,timer:null};
  MP.remoteLiveActive=!!snapshot.active;
  if(snapshot.active&&!wasActive){
    if(typeof ensureAudio==='function')ensureAudio();
    if(typeof playSound==='function')playSound('whistleStart');
    if(typeof startCrowd==='function')startCrowd();
  }
  playRemoteEventSounds(snapshot,previousKeys);
  MP.remoteEventKeys=new Set((snapshot.events||[]).map(remoteEventKey));
  if(!snapshot.active&&wasActive){
    if(typeof playSound==='function')playSound('whistleEnd');
    if(typeof stopCrowd==='function')stopCrowd();
  }
  const nav=document.querySelector('nav button.active')?.dataset.v;
  if(snapshot.active&&!wasActive){setActiveNav('gameplay');render('gameplay')}
  else if(nav==='gameplay'&&oldMinute!==snapshot.minute){gameplay(gameplayDivision||team(manager().team)?.division||'C')}
}
function applyRoom(room,forceState=false){if(!room)return;const stateChanged=forceState||room.version>MP.version;MP.version=Math.max(MP.version,room.version||0);MP.players=room.players||[];MP.chat=room.chat||[];MP.actions=room.actions||[];MP.readyDeadline=room.readyDeadline||null;MP.allReady=MP.players.length===2&&MP.players.every(p=>p.ready);if(stateChanged&&room.state){MP.applying=true;S=room.state;S.turn=MP.index;MP.applying=false;}if((room.liveVersion||0)>MP.liveVersion||forceState){MP.liveVersion=room.liveVersion||0;applyLiveSnapshot(room.live||null)}drawBar()}
function saveLocal(){try{if(typeof trimNewsHistory==='function')trimNewsHistory();localStorage.setItem('brCareerV12',JSON.stringify(S))}catch{}}
let saveTimer=null;
async function pushStateNow(){
  if(!MP.online||MP.applying||!S)return;
  clearTimeout(saveTimer);S.turn=MP.index;
  const r=await api(`/api/rooms/${MP.code}/state`,{method:'PUT',body:JSON.stringify({version:MP.version,state:S})});
  MP.version=r.version;saveLocal();drawBar();return r;
}
function pushState(){if(!MP.online||MP.applying||!S)return;clearTimeout(saveTimer);saveTimer=setTimeout(()=>pushStateNow().catch(e=>console.warn('Falha ao sincronizar:',e.message)),180)}
let livePushBusy=false;
async function pushLive(force=false){
  if(!MP.online||!MP.host||livePushBusy)return;
  const now=Date.now();if(!force&&now-MP.lastLivePush<420)return;MP.lastLivePush=now;livePushBusy=true;
  try{
    const snapshot=live?{minute:live.minute,games:live.games,events:live.events,speed:live.speed,paused:live.paused,active:live.active,finished:live.finished,userSubs:live.userSubs||0}:null;
    const r=await api(`/api/rooms/${MP.code}/live`,{method:'POST',body:JSON.stringify({live:snapshot})});MP.liveVersion=r.liveVersion||MP.liveVersion;
  }catch(e){console.warn('Falha ao transmitir partida:',e.message)}finally{livePushBusy=false}
}
function readyLabel(){const me=MP.players.find(p=>p.managerIndex===MP.index);return {ready:!!(me&&me.ready),label:me&&me.ready?'✓ ESTOU PRONTO':'ESTOU PRONTO'}}
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
    const shouldShow=!!MP.host;
    if((btn.style.display!=='none')!==shouldShow)btn.style.display=shouldShow?'':'none';
    if(shouldShow)btn.removeAttribute('aria-hidden');else btn.setAttribute('aria-hidden','true');
    let ready=wrap.querySelector('.mp-inline-ready');
    if(!ready){ready=document.createElement('button');ready.type='button';ready.className='mp-inline-ready btn primary';ready.onclick=window.mpToggleReady;wrap.insertBefore(ready,btn)}
    const st=readyLabel();
    ready.classList.toggle('ready',st.ready);ready.classList.toggle('not-ready',!st.ready);
    ready.style.setProperty('background',st.ready?'linear-gradient(135deg,#15803d,#22c55e)':'linear-gradient(135deg,#b91c1c,#ef4444)','important');
    ready.style.setProperty('color','#fff','important');
    if(ready.textContent!==st.label)ready.textContent=st.label;
    if(MP.host){wrap.style.setProperty('display','inline-flex','important');wrap.style.setProperty('flex-direction','row','important');wrap.style.setProperty('gap','2cm','important');wrap.style.setProperty('align-items','center','important');wrap.style.setProperty('flex-wrap','nowrap','important');btn.style.setProperty('margin-top','0','important')}
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
  window.mpToggleReady=async function(){try{if(typeof ensureAudio==='function')ensureAudio();const me=MP.players.find(p=>p.managerIndex===MP.index),r=await api(`/api/rooms/${MP.code}/ready`,{method:'POST',body:JSON.stringify({ready:!(me&&me.ready)})});applyRoom(r.room)}catch(e){alert(e.message)}};
  window.mpSaveCareer=async function(){try{if(!MP.host)return alert('Somente o anfitrião pode salvar a carreira online.');await pushStateNow();const r=await api(`/api/rooms/${MP.code}/save`,{method:'POST',body:JSON.stringify({})});storeAccess();alert(`Carreira salva com sucesso!\nSala: ${MP.code}\nVocê poderá continuar depois neste mesmo navegador.`);drawBar()}catch(e){alert('Não foi possível salvar: '+e.message)}};
  window.mpSaveSilent=async function(){try{if(MP.host){await pushStateNow();await api(`/api/rooms/${MP.code}/save`,{method:'POST',body:'{}'})}}catch(e){console.warn('Autosave online:',e.message)}};
  window.mpSendChat=async function(){try{let i=document.getElementById('mpChatInput'),text=(i?.value||MP.chatDraft||'').trim();if(!text)return;const r=await api(`/api/rooms/${MP.code}/chat`,{method:'POST',body:JSON.stringify({text})});MP.chat=r.chat||[];MP.chatDraft='';drawBar();window.mpRenderChat?.();setTimeout(()=>document.getElementById('mpChatInput')?.focus(),0)}catch(e){alert(e.message)}};
  window.mpLogAction=function(text){api(`/api/rooms/${MP.code}/action`,{method:'POST',body:JSON.stringify({text})}).catch(()=>{})};
  const observer=new MutationObserver(()=>enhanceGameButtons());observer.observe(document.body,{childList:true,subtree:true});setTimeout(enhanceGameButtons,0);
}
window.mpRenderChat=function(){
  const c=document.getElementById('content');if(!c)return;
  if(!MP.online){c.innerHTML='<div class="card"><h2>Chat</h2><p class="muted">O chat fica disponível quando você entra em uma sala multiplayer.</p></div>';return}
  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const input=document.getElementById('mpChatInput'),wasFocused=document.activeElement===input;
  if(input)MP.chatDraft=input.value;
  c.innerHTML=`<div class="mp-chat-page"><h2>💬 Chat da sala ${esc(MP.code)}</h2><div id="mpChatLog" class="mp-chat-log">${(MP.chat||[]).slice(-100).map(x=>`<div class="mp-chat-message"><b>${esc(x.name)}:</b> ${esc(x.text)}</div>`).join('')||'<span class="muted">Sem mensagens.</span>'}</div><div class="mp-chat-send"><input id="mpChatInput" maxlength="300" placeholder="Digite uma mensagem" value="${esc(MP.chatDraft||'')}" oninput="MP.chatDraft=this.value" onkeydown="if(event.key==='Enter'){event.preventDefault();mpSendChat()}"><button class="btn primary" onclick="mpSendChat()">Enviar</button></div><div class="mp-actions-log">${(MP.actions||[]).slice(-8).reverse().map(x=>`<small>${esc(x.text)}</small>`).join('')}</div></div>`;
  const log=document.getElementById('mpChatLog');if(log)log.scrollTop=log.scrollHeight;
  const ni=document.getElementById('mpChatInput');if(ni&&(wasFocused||!MP.chatDraft))setTimeout(()=>{ni.focus();ni.setSelectionRange(ni.value.length,ni.value.length)},0);
};
function drawBar(){
  if(!MP.online)return;
  try{
    const header=document.querySelector('main#game header');if(!header)return;
    let b=document.getElementById('mpTop');
    if(!b){b=document.createElement('div');b.id='mpTop';header.appendChild(b)}
    const me=MP.players.find(p=>p.managerIndex===MP.index),other=MP.players.find(p=>p.managerIndex!==MP.index),isLive=!!(typeof live!=='undefined'&&live&&live.active);
    const left=MP.readyDeadline?Math.max(0,Math.ceil((MP.readyDeadline-Date.now())/1000)):0;const html=`<div class="mp-summary"><div><b>🌐 Sala ${MP.code}</b> <span class="mp-room">${MP.host?'• Anfitrião':'• Conectado'}</span> ${isLive?'<span class="mp-live-badge">● AO VIVO</span>':''}</div><div class="mp-status"><div class="mp-status-line ${me&&me.ready?'mp-ok':'mp-wait'}">Você: ${me&&me.ready?'✓ Pronto':'○ Não pronto'}</div><div class="mp-status-line ${other&&other.ready?'mp-ok':'mp-wait'}">${other?other.name:'Aguardando amigo'}: ${other?(other.ready?'✓ Pronto':'○ Não pronto'):'—'}</div>${left?`<div class="mp-status-line">⏱️ ${left}s para confirmar</div>`:''}</div></div>${MP.host?'<div class="mp-actions"><button class="mp-save-btn" onclick="mpSaveCareer()">💾 Salvar carreira</button></div>':''}`;
    if(b.innerHTML!==html)b.innerHTML=html;if(document.querySelector('nav button.active')?.dataset.v==='chat')window.mpRenderChat?.();
    setTimeout(enhanceGameButtons,0);
  }catch(e){console.warn('Falha ao desenhar painel online:',e)}
}
function startPoll(){clearInterval(MP.poll);MP.poll=setInterval(async()=>{if(!MP.online||document.hidden)return;try{const r=await api(`/api/rooms/${MP.code}`);const changed=r.version>MP.version||(r.liveVersion||0)>MP.liveVersion;applyRoom(r,changed&&r.version>MP.version);if(changed)saveLocal()}catch(e){console.warn(e.message)}},650)}
async function resume(showError=false){
  try{
    const x=getSavedAccess();if(!x)return false;
    MP.code=x.code;MP.token=x.token;MP.index=x.index;MP.host=!!x.host;MP.online=true;
    let r;try{r=await api(`/api/rooms/${MP.code}`)}catch(e){if(x.name&&x.password){const rr=await fetch(`/api/rooms/${MP.code}/reconnect`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:x.name,password:x.password})}).then(z=>z.json().then(j=>{if(!z.ok)throw new Error(j.error);return j}));MP.token=rr.token;MP.index=rr.managerIndex;MP.host=MP.index===0;r=rr.room}else throw e}applyRoom(r,true);install();startPoll();storeAccess();
    document.getElementById('mpLobby')?.remove();saveLocal();openGame();setTimeout(drawBar,0);return true;
  }catch(e){MP.online=false;if(showError)msg('Não foi possível continuar: '+e.message);return false}
}
window.addEventListener('load',async()=>{overlay();await resume(false)});
})();
