const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA_DIR = process.env.DATA_DIR || (fs.existsSync('/var/data') ? '/var/data' : path.join(ROOT, 'online-data'));
fs.mkdirSync(DATA_DIR, { recursive: true });

const CREST_MANIFEST = path.join(ROOT, 'assets', 'crests', 'manifest.json');
function readCrestManifest() {
  try { return JSON.parse(fs.readFileSync(CREST_MANIFEST, 'utf8')); }
  catch { return {}; }
}

const rooms = new Map();

function code() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
function token() { return crypto.randomBytes(18).toString('hex'); }
function passHash(v){return crypto.createHash('sha256').update(String(v||'')).digest('hex');}
function fileFor(c) { return path.join(DATA_DIR, `${c}.json`); }
function persist(room) {
  fs.writeFileSync(fileFor(room.code), JSON.stringify(room), 'utf8');
}
function loadRooms() {
  for (const f of fs.readdirSync(DATA_DIR)) {
    if (!f.endsWith('.json')) continue;
    try { const r = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8')); rooms.set(r.code, r); } catch {}
  }
}
loadRooms();

function send(res, status, body, headers={}) {
  const data = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': typeof body === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8', 'Access-Control-Allow-Origin':'*', ...headers });
  res.end(data);
}
function json(req) {
  return new Promise((resolve,reject)=>{ let b=''; req.on('data',c=>{ b+=c; if(b.length>20_000_000) req.destroy(); }); req.on('end',()=>{ try{ resolve(b?JSON.parse(b):{}); }catch(e){reject(e);} }); });
}
function auth(room, t) { return room.players.find(p=>p.token===t); }
function publicRoom(room) {
  return { code:room.code, version:room.version, stateVersion:room.stateVersion||1, liveVersion:room.liveVersion||0, live:room.live||null, savedAt:room.savedAt||null, readyDeadline:room.readyDeadline||null, actions:(room.actions||[]).slice(-120), state:room.state, players:room.players.map(p=>({name:p.name,managerIndex:p.managerIndex,teamId:p.teamId,ready:!!room.ready[p.token],onlineAt:p.onlineAt})) };
}
function safeStatic(req,res){
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/') u='/index.html';
  const f=path.normalize(path.join(ROOT,u));
  if(!f.startsWith(ROOT)) return send(res,403,'Forbidden');
  fs.readFile(f,(e,d)=>{
    if(e)return send(res,404,'Not found');
    const ext=path.extname(f).toLowerCase();
    const m={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.webp':'image/webp'}[ext]||'application/octet-stream';
    const cache = ['.png','.jpg','.webp','.ico'].includes(ext) ? 'public, max-age=604800, immutable' : 'no-store';
    res.writeHead(200,{'Content-Type':m,'Cache-Control':cache});res.end(d);
  });
}

const server=http.createServer(async(req,res)=>{
  if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,PUT,OPTIONS','Access-Control-Allow-Headers':'Content-Type,X-Player-Token'});return res.end();}
  const parts=req.url.split('?')[0].split('/').filter(Boolean);
  try{

    if(req.method==='GET' && req.url.startsWith('/api/crests')){
      const map=readCrestManifest();
      return send(res,200,{ok:true,map,ready:Object.keys(map).length});
    }
    if(req.method==='POST' && req.url.startsWith('/api/rooms/create')){
      const b=await json(req); let c; do{c=code()}while(rooms.has(c));
      const t=token(); const room={code:c,hostToken:t,version:1,stateVersion:1,liveVersion:0,live:null,state:b.state,private:true,players:[{token:t,name:b.name||'Técnico 1',passwordHash:passHash(b.password||'1234'),managerIndex:0,teamId:b.teamId,onlineAt:Date.now()}],ready:{},actions:[{at:Date.now(),text:'Sala criada pelo anfitrião.'}],createdAt:Date.now(),savedAt:Date.now()};
      rooms.set(c,room);persist(room);return send(res,200,{code:c,token:t,managerIndex:0,room:publicRoom(room)});
    }
    if(parts[0]==='api'&&parts[1]==='rooms'&&parts[2]){
      const c=parts[2].toUpperCase(),room=rooms.get(c); if(!room)return send(res,404,{error:'Sala não encontrada.'});
      if(req.method==='POST'&&parts[3]==='join'){
        const b=await json(req); if(room.players.length>=2)return send(res,409,{error:'A sala já possui dois jogadores.'}); if(room.players.some(p=>p.name.toLowerCase()===(b.name||'').toLowerCase()))return send(res,409,{error:'Esse login já está sendo usado na sala.'});
        const t=token(),idx=room.players.length;
        if(!room.state || !room.state.teams)return send(res,409,{error:'A carreira ainda não foi iniciada pelo anfitrião.'});
        const used=new Set(room.players.map(p=>p.teamId));
        const available=room.state.teams.filter(x=>x.division==='C'&&!used.has(x.id));
        if(!available.length)return send(res,409,{error:'Não há clube disponível na Série C.'});
        const tm=available[crypto.randomInt(available.length)];
        tm.human=idx; room.state.managers.push({name:b.name||`Técnico ${idx+1}`,team:tm.id,reputation:10,careerPoints:0,seasons:0,titles:0,promotions:0,salary:0});
        room.players.push({token:t,name:b.name||`Técnico ${idx+1}`,passwordHash:passHash(b.password||'1234'),managerIndex:idx,teamId:tm.id,onlineAt:Date.now()}); room.actions=room.actions||[];room.actions.push({at:Date.now(),text:`${b.name||`Técnico ${idx+1}`} entrou na sala.`});room.version++;room.stateVersion=(Number(room.stateVersion)||1)+1;persist(room);
        return send(res,200,{code:c,token:t,managerIndex:idx,room:publicRoom(room)});
      }
      if(req.method==='POST'&&parts[3]==='reconnect'){
        const b=await json(req),player=room.players.find(p=>p.name.toLowerCase()===String(b.name||'').toLowerCase()&&p.passwordHash===passHash(b.password));
        if(!player)return send(res,401,{error:'Login ou senha inválidos.'});player.token=token();player.onlineAt=Date.now();if(player.managerIndex===0)room.hostToken=player.token;persist(room);return send(res,200,{code:c,token:player.token,managerIndex:player.managerIndex,room:publicRoom(room)});
      }
      const t=req.headers['x-player-token']; const player=auth(room,t); if(!player)return send(res,401,{error:'Sessão inválida.'}); player.onlineAt=Date.now(); if(!Number.isFinite(Number(room.stateVersion)))room.stateVersion=1;
      if(req.method==='GET'&&parts.length===3){return send(res,200,publicRoom(room));}
      if(req.method==='PUT'&&parts[3]==='state'){
        const b=await json(req); if(typeof b.version==='number'&&b.version<room.version-8)return send(res,409,{error:'Estado muito antigo.',room:publicRoom(room)});
        const incoming=b.state||{};
        const current=room.state||{};
        const isHost=t===room.hostToken;
        const currentSeason=Number(current.season)||0,incomingSeason=Number(incoming.season)||0;
        const currentRound=Number(current.round)||0,incomingRound=Number(incoming.round)||0;
        const currentCompleted=Number.isFinite(Number(current.lastCompletedRound))?Number(current.lastCompletedRound):-1;
        const incomingCompleted=Number.isFinite(Number(incoming.lastCompletedRound))?Number(incoming.lastCompletedRound):-1;
        if(incomingSeason<currentSeason||(incomingSeason===currentSeason&&(incomingRound<currentRound||incomingCompleted<currentCompleted))){
          return send(res,409,{error:'O estado local está em uma rodada anterior. Atualizando com o servidor.',room:publicRoom(room)});
        }
        if(!isHost&&current.teams){
          incoming.season=current.season;incoming.round=current.round;incoming.lastCompletedRound=current.lastCompletedRound;incoming.lastCompletedFixtureKey=current.lastCompletedFixtureKey;incoming.schedules=current.schedules;
          const standings=new Map((current.teams||[]).map(x=>[x.id,{played:x.played,w:x.w,d:x.d,l:x.l,gf:x.gf,ga:x.ga,pts:x.pts}]));
          (incoming.teams||[]).forEach(x=>{const st=standings.get(x.id);if(st)Object.assign(x,st)});
        }
        // Cada clube possui sua própria revisão. Uma cópia antiga enviada por outro
        // jogador jamais pode apagar investimentos, transferências ou alterações recentes.
        if(current.teams&&incoming.teams){
          const oldTeams=new Map(current.teams.map(x=>[x.id,x]));
          incoming.teams=incoming.teams.map(next=>{
            const prev=oldTeams.get(next.id);if(!prev)return next;
            const prevRev=Number(prev._syncRev)||0,nextRev=Number(next._syncRev)||0;
            return prevRev>nextRev?prev:next;
          });
          for(const prev of current.teams){if(!incoming.teams.some(x=>x.id===prev.id))incoming.teams.push(prev)}
        }
        room.state=incoming; room.version++; room.stateVersion=(Number(room.stateVersion)||1)+1;room.savedAt=Date.now();room.actions=room.actions||[];room.actions.push({at:Date.now(),text:`${player.name} sincronizou e salvou a carreira.`});room.actions=room.actions.slice(-300);persist(room);return send(res,200,{version:room.version,stateVersion:room.stateVersion,savedAt:room.savedAt});
      }
      if(req.method==='POST'&&parts[3]==='save'){
        if(t!==room.hostToken)return send(res,403,{error:'Somente o anfitrião pode salvar a carreira.'});
        room.savedAt=Date.now();persist(room);return send(res,200,{ok:true,savedAt:room.savedAt,code:room.code});
      }
      if(req.method==='POST'&&parts[3]==='live'){
        if(t!==room.hostToken)return send(res,403,{error:'Somente o anfitrião pode transmitir a rodada.'});
        const b=await json(req); room.live=b.live||null; room.liveVersion=(room.liveVersion||0)+1;persist(room);
        return send(res,200,{liveVersion:room.liveVersion});
      }
      if(req.method==='POST'&&parts[3]==='ready-reset'){
        if(t!==room.hostToken)return send(res,403,{error:'Somente o anfitrião pode limpar a prontidão da rodada.'});
        room.ready={};room.readyDeadline=null;room.version++;room.actions=room.actions||[];room.actions.push({at:Date.now(),text:'A prontidão dos jogadores foi reiniciada para a próxima rodada.'});room.actions=room.actions.slice(-300);persist(room);
        return send(res,200,{ok:true,room:publicRoom(room),allReady:false});
      }
      if(req.method==='POST'&&parts[3]==='ready'){
        const b=await json(req); room.ready[t]=b.ready!==false;if(room.ready[t]&&!room.readyDeadline)room.readyDeadline=Date.now()+120000;if(!Object.values(room.ready).some(Boolean))room.readyDeadline=null;room.version++;room.actions=room.actions||[];room.actions.push({at:Date.now(),text:`${player.name} ${room.ready[t]?'ficou pronto':'cancelou a prontidão'}.`});room.actions=room.actions.slice(-300);persist(room);
        return send(res,200,{room:publicRoom(room),allReady:room.players.length===2&&room.players.every(p=>room.ready[p.token])});
      }
      if(req.method==='POST'&&parts[3]==='action'){
        const b=await json(req),text=String(b.text||'').trim().slice(0,300);room.actions=room.actions||[];if(text)room.actions.push({at:Date.now(),text:`${player.name}: ${text}`});room.actions=room.actions.slice(-300);persist(room);return send(res,200,{ok:true});
      }
      if(req.method==='POST'&&parts[3]==='leave'){
        room.ready[t]=false;player.onlineAt=0;persist(room);return send(res,200,{ok:true});
      }
    }
    if(req.url.startsWith('/api/')) return send(res,404,{error:'Endpoint não encontrado.'});
    safeStatic(req,res);
  }catch(e){console.error(e);send(res,500,{error:'Erro interno do servidor.'});}
});
console.log(`Escudos locais: ${Object.keys(readCrestManifest()).length}`);
server.listen(PORT,'0.0.0.0',()=>console.log(`Brasileirão Manager Online: http://localhost:${PORT}`));
