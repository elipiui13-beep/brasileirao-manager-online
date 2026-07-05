const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'online-data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const rooms = new Map();

function code() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
function token() { return crypto.randomBytes(18).toString('hex'); }
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
  return { code:room.code, version:room.version, state:room.state, hostToken:room.hostToken, players:room.players.map(p=>({name:p.name,managerIndex:p.managerIndex,teamId:p.teamId,ready:!!room.ready[p.token],onlineAt:p.onlineAt})) };
}
function safeStatic(req,res){
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/') u='/index.html';
  const f=path.normalize(path.join(ROOT,u));
  if(!f.startsWith(ROOT)) return send(res,403,'Forbidden');
  fs.readFile(f,(e,d)=>{
    if(e)return send(res,404,'Not found');
    const ext=path.extname(f).toLowerCase();
    const m={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon'}[ext]||'application/octet-stream';
    res.writeHead(200,{'Content-Type':m,'Cache-Control':'no-store'});res.end(d);
  });
}

const server=http.createServer(async(req,res)=>{
  if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,PUT,OPTIONS','Access-Control-Allow-Headers':'Content-Type,X-Player-Token'});return res.end();}
  const parts=req.url.split('?')[0].split('/').filter(Boolean);
  try{
    if(req.method==='POST' && req.url.startsWith('/api/rooms/create')){
      const b=await json(req); let c; do{c=code()}while(rooms.has(c));
      const t=token(); const room={code:c,hostToken:t,version:1,state:b.state,players:[{token:t,name:b.name||'Técnico 1',managerIndex:0,teamId:b.teamId,onlineAt:Date.now()}],ready:{},createdAt:Date.now()};
      rooms.set(c,room);persist(room);return send(res,200,{code:c,token:t,managerIndex:0,room:publicRoom(room)});
    }
    if(parts[0]==='api'&&parts[1]==='rooms'&&parts[2]){
      const c=parts[2].toUpperCase(),room=rooms.get(c); if(!room)return send(res,404,{error:'Sala não encontrada.'});
      if(req.method==='POST'&&parts[3]==='join'){
        const b=await json(req); if(room.players.length>=2)return send(res,409,{error:'A sala já possui dois jogadores.'});
        const t=token(),idx=room.players.length;
        if(!room.state || !room.state.teams)return send(res,409,{error:'A carreira ainda não foi iniciada pelo anfitrião.'});
        const used=new Set(room.players.map(p=>p.teamId));
        const available=room.state.teams.filter(x=>x.division==='C'&&!used.has(x.id));
        if(!available.length)return send(res,409,{error:'Não há clube disponível na Série C.'});
        const tm=available[crypto.randomInt(available.length)];
        tm.human=idx; room.state.managers.push({name:b.name||`Técnico ${idx+1}`,team:tm.id,reputation:10,careerPoints:0,seasons:0,titles:0,promotions:0,salary:0});
        room.players.push({token:t,name:b.name||`Técnico ${idx+1}`,managerIndex:idx,teamId:tm.id,onlineAt:Date.now()}); room.version++;persist(room);
        return send(res,200,{code:c,token:t,managerIndex:idx,room:publicRoom(room)});
      }
      const t=req.headers['x-player-token']; const player=auth(room,t); if(!player)return send(res,401,{error:'Sessão inválida.'}); player.onlineAt=Date.now();
      if(req.method==='GET'&&parts.length===3){return send(res,200,publicRoom(room));}
      if(req.method==='PUT'&&parts[3]==='state'){
        const b=await json(req); if(typeof b.version==='number'&&b.version<room.version-8)return send(res,409,{error:'Estado muito antigo.',room:publicRoom(room)});
        room.state=b.state; room.version++; room.ready={};persist(room);return send(res,200,{version:room.version});
      }
      if(req.method==='POST'&&parts[3]==='ready'){
        const b=await json(req); room.ready[t]=b.ready!==false; room.version++;persist(room);
        return send(res,200,{room:publicRoom(room),allReady:room.players.length===2&&room.players.every(p=>room.ready[p.token])});
      }
      if(req.method==='POST'&&parts[3]==='leave'){
        room.ready[t]=false;player.onlineAt=0;persist(room);return send(res,200,{ok:true});
      }
    }
    if(req.url.startsWith('/api/')) return send(res,404,{error:'Endpoint não encontrado.'});
    safeStatic(req,res);
  }catch(e){console.error(e);send(res,500,{error:'Erro interno do servidor.'});}
});
server.listen(PORT,'0.0.0.0',()=>console.log(`Brasileirão Manager Online: http://localhost:${PORT}`));
