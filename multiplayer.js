(function(){
'use strict';
const MP={code:null,token:null,index:0,version:0,host:false,poll:null,applying:false,online:false,players:[],allReady:false};
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
  #mpBar{position:fixed;right:12px;bottom:12px;z-index:9000;background:#0c1729ee;border:1px solid #365078;border-radius:12px;padding:10px 12px;min-width:260px;color:#fff;box-shadow:0 8px 30px #0008}#mpBar button{margin-top:8px;margin-right:6px;padding:7px 10px;border:0;border-radius:7px;cursor:pointer;font-weight:700}.mp-ok{color:#79e89a}.mp-wait{color:#ffd36b}
  @media(max-width:650px){#mpLobby .row{grid-template-columns:1fr}}
  </style><div class="box"><h1>🌐 Brasileirão Manager Online</h1><p class="muted">Crie uma carreira ou entre usando o código enviado pelo seu amigo.</p><div class="row"><section><h2>Criar sala</h2><input id="mpCreateName" placeholder="Seu nome"><div class="muted" style="margin:4px 0 14px">Seu clube será sorteado aleatoriamente entre os times da Série C.</div><button id="mpCreate">Criar carreira online</button></section><section><h2>Entrar na sala</h2><input id="mpCode" maxlength="6" placeholder="Código da sala"><input id="mpJoinName" placeholder="Seu nome"><div class="muted" style="margin:4px 0 14px">Você receberá outro clube aleatório da Série C.</div><button id="mpJoin">Entrar na carreira</button></section></div><p id="mpMsg" class="err"></p><hr><button id="mpSolo" style="background:#47556d">Continuar no modo individual</button></div>`;document.body.appendChild(el);
  el.querySelector('#mpSolo').onclick=()=>el.remove();el.querySelector('#mpCreate').onclick=createRoom;el.querySelector('#mpJoin').onclick=joinRoom;
}
function msg(x){const e=document.getElementById('mpMsg');if(e)e.textContent=x||''}
async function createRoom(){try{msg('Criando sala...');const name=document.getElementById('mpCreateName').value.trim()||'Técnico 1';const chosen=buildState(name);const r=await api('/api/rooms/create',{method:'POST',body:JSON.stringify({name,teamId:chosen.id,state:S})});enter(r,true);document.getElementById('mpLobby').remove();saveLocal();openGame();alert(`Sala criada!\nSeu time: ${chosen.name}\nCódigo: ${r.code}\nEnvie esse código ao seu amigo.`)}catch(e){msg(e.message)}}
async function joinRoom(){try{msg('Entrando...');const code=document.getElementById('mpCode').value.trim().toUpperCase(),name=document.getElementById('mpJoinName').value.trim()||'Técnico 2';const r=await api(`/api/rooms/${code}/join`,{method:'POST',body:JSON.stringify({name})});enter(r,false);document.getElementById('mpLobby').remove();applyRoom(r.room);saveLocal();openGame();alert(`Você entrou na sala ${code}.\nSeu time: ${team(manager().team).name}`)}catch(e){msg(e.message)}}
function enter(r,host){MP.code=r.code;MP.token=r.token;MP.index=r.managerIndex;MP.host=host;MP.online=true;sessionStorage.setItem('bm_mp',JSON.stringify({code:MP.code,token:MP.token,index:MP.index,host}));applyRoom(r.room);install();startPoll();}
function applyRoom(room){if(!room)return;MP.version=room.version;MP.players=room.players||[];MP.allReady=MP.players.length===2&&MP.players.every(p=>p.ready);if(room.state){MP.applying=true;S=room.state;S.turn=MP.index;MP.applying=false;}drawBar();}
function saveLocal(){try{localStorage.setItem('brCareerV12',JSON.stringify(S))}catch{}}
let saveTimer=null;
function pushState(){if(!MP.online||MP.applying||!S)return;clearTimeout(saveTimer);saveTimer=setTimeout(async()=>{try{S.turn=MP.index;const r=await api(`/api/rooms/${MP.code}/state`,{method:'PUT',body:JSON.stringify({version:MP.version,state:S})});MP.version=r.version;drawBar()}catch(e){console.warn('Falha ao sincronizar:',e.message)}},180)}
function install(){
  const oldSave=window.save;window.save=function(){saveLocal();if(MP.online)pushState();else if(oldSave)oldSave();};
  window.manager=function(){return S.managers[MP.online?MP.index:S.turn]};
  const oldHeader=window.header;window.header=function(){S.turn=MP.online?MP.index:S.turn;oldHeader();drawBar()};
  const oldStart=window.startLive;window.startLive=function(){if(!MP.online)return oldStart();if(!MP.host)return alert('Somente o anfitrião simula a rodada depois que os dois estiverem prontos.');if(!MP.allReady)return alert('Os dois técnicos precisam marcar Pronto para a rodada.');oldStart();};
  const oldFinish=window.finishRound;window.finishRound=function(){oldFinish();if(MP.online){api(`/api/rooms/${MP.code}/ready`,{method:'POST',body:JSON.stringify({ready:false})}).catch(()=>{});setTimeout(pushState,250)}};
  window.mpToggleReady=async function(){try{const me=MP.players.find(p=>p.managerIndex===MP.index),r=await api(`/api/rooms/${MP.code}/ready`,{method:'POST',body:JSON.stringify({ready:!(me&&me.ready)})});applyRoom(r.room)}catch(e){alert(e.message)}};
  window.mpCopyCode=()=>navigator.clipboard?.writeText(MP.code).then(()=>alert('Código copiado: '+MP.code)).catch(()=>prompt('Copie o código:',MP.code));
}
function drawBar(){if(!MP.online)return;let b=document.getElementById('mpBar');if(!b){b=document.createElement('div');b.id='mpBar';document.body.appendChild(b)}const me=MP.players.find(p=>p.managerIndex===MP.index),other=MP.players.find(p=>p.managerIndex!==MP.index);b.innerHTML=`<b>🌐 Sala ${MP.code}</b> ${MP.host?'• Anfitrião':''}<br><span class="${me&&me.ready?'mp-ok':'mp-wait'}">Você: ${me&&me.ready?'Pronto':'Aguardando'}</span><br><span class="${other&&other.ready?'mp-ok':'mp-wait'}">${other?other.name:'Amigo não entrou'}: ${other?(other.ready?'Pronto':'Aguardando'):'—'}</span><br><button onclick="mpToggleReady()">${me&&me.ready?'Cancelar pronto':'Estou pronto'}</button><button onclick="mpCopyCode()">Copiar código</button>`;}
function startPoll(){clearInterval(MP.poll);MP.poll=setInterval(async()=>{if(!MP.online||document.hidden)return;try{const r=await api(`/api/rooms/${MP.code}`);if(r.version>MP.version){const oldRound=S&&S.round,oldSeason=S&&S.season;applyRoom(r);saveLocal();if(document.getElementById('game')&&!document.getElementById('game').classList.contains('hidden')&&(oldRound!==S.round||oldSeason!==S.season)){live=null;render(document.querySelector('nav button.active')?.dataset.v||'home')}}}catch(e){console.warn(e.message)}},1600)}
async function resume(){try{const x=JSON.parse(sessionStorage.getItem('bm_mp')||'null');if(!x)return false;MP.code=x.code;MP.token=x.token;MP.index=x.index;MP.host=x.host;MP.online=true;const r=await api(`/api/rooms/${MP.code}`);applyRoom(r);install();startPoll();document.getElementById('mpLobby')?.remove();saveLocal();openGame();return true}catch{return false}}
window.addEventListener('load',async()=>{overlay();await resume()});
})();
