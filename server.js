const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA_DIR = process.env.DATA_DIR || (fs.existsSync('/var/data') ? '/var/data' : path.join(ROOT, 'online-data'));
fs.mkdirSync(DATA_DIR, { recursive: true });

const CREST_DIR = path.join(ROOT, 'assets', 'crests');
const CREST_MANIFEST = path.join(CREST_DIR, 'manifest.json');
fs.mkdirSync(CREST_DIR, { recursive: true });
const CREST_HINTS = {
  'Flamengo':['Clube de Regatas do Flamengo','Flamengo'],'Palmeiras':['SE Palmeiras','Palmeiras'],'Cruzeiro':['Cruzeiro Esporte Clube','Cruzeiro'],'Corinthians':['Sport Club Corinthians Paulista','Corinthians'],'Botafogo':['Botafogo de Futebol e Regatas','Botafogo'],'Fluminense':['Fluminense Football Club','Fluminense'],'Bahia':['Esporte Clube Bahia','Bahia'],'Santos':['Santos Futebol Clube','Santos'],'Vasco':['CR Vasco da Gama','Vasco da Gama'],'Grêmio':['Grêmio Foot-Ball Porto Alegrense','Grêmio'],'Bragantino':['Red Bull Bragantino','Bragantino'],'Atlético-MG':['Clube Atlético Mineiro','Atlético Mineiro'],'São Paulo':['São Paulo Futebol Clube','São Paulo'],'Athletico-PR':['Club Athletico Paranaense','Athletico Paranaense','Athletico-PR'],'Internacional':['Sport Club Internacional','Internacional'],'Vitória':['Esporte Clube Vitória','Vitória'],'Coritiba':['Coritiba Foot Ball Club','Coritiba'],'Mirassol':['Mirassol Futebol Clube','Mirassol'],'Remo':['Clube do Remo','Remo'],'Chapecoense':['Associação Chapecoense de Futebol','Chapecoense'],'Vila Nova':['Vila Nova Futebol Clube','Vila Nova'],'Fortaleza':['Fortaleza Esporte Clube','Fortaleza'],'Ceará':['Ceará Sporting Club','Ceará'],'Novorizontino':['Grêmio Novorizontino','Novorizontino'],'Avaí':['Avaí Futebol Clube','Avaí'],'Athletic Club':['Athletic Club','Athletic Club MG'],'Operário-PR':['Operário Ferroviário Esporte Clube','Operário Ferroviário','Operário-PR'],'Botafogo-SP':['Botafogo Futebol Clube (Ribeirão Preto)','Botafogo-SP'],'São Bernardo':['São Bernardo Futebol Clube','São Bernardo'],'Criciúma':['Criciúma Esporte Clube','Criciúma'],'Juventude':['Esporte Clube Juventude','Juventude'],'Goiás':['Goiás Esporte Clube','Goiás'],'Sport':['Sport Club do Recife','Sport Recife','Sport'],'Náutico':['Clube Náutico Capibaribe','Náutico'],'Cuiabá':['Cuiabá Esporte Clube','Cuiabá'],'Londrina':['Londrina Esporte Clube','Londrina'],'Atlético-GO':['Atlético Goianiense','Atlético-GO'],'Ponte Preta':['Associação Atlética Ponte Preta','Ponte Preta'],'CRB':['Clube de Regatas Brasil','CRB'],'América-MG':['América Futebol Clube','América Mineiro','América-MG'],'Amazonas':['Amazonas Futebol Clube','Amazonas'],'Ypiranga-RS':['Ypiranga Futebol Clube','Ypiranga-RS'],'Brusque':['Brusque Futebol Clube','Brusque'],'Maringá':['Maringá Futebol Clube','Maringá'],'Botafogo-PB':['Botafogo Futebol Clube','Botafogo-PB'],'Guarani':['Guarani Futebol Clube','Guarani'],'Floresta':['Floresta Esporte Clube','Floresta'],'Paysandu':['Paysandu Sport Club','Paysandu'],'Barra-SC':['Barra Futebol Clube','Barra-SC','Barra FC'],'Inter de Limeira':['Associação Atlética Internacional','Inter de Limeira'],'Santa Cruz':['Santa Cruz Futebol Clube','Santa Cruz'],'Figueirense':['Figueirense Futebol Clube','Figueirense'],'Ituano':['Ituano Futebol Clube','Ituano'],'Caxias':['Sociedade Esportiva e Recreativa Caxias do Sul','Caxias'],'Confiança':['Associação Desportiva Confiança','Confiança'],'Volta Redonda':['Volta Redonda Futebol Clube','Volta Redonda'],'Itabaiana':['Associação Olímpica de Itabaiana','Itabaiana'],'Ferroviária':['Associação Ferroviária de Esportes','Ferroviária'],'Maranhão':['Maranhão Atlético Clube','Maranhão'],'Anápolis':['Anápolis Futebol Clube','Anápolis']
};
function slugify(v){return String(v||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')}
function readCrestManifest(){ try{return JSON.parse(fs.readFileSync(CREST_MANIFEST,'utf8'))}catch{return {}} }
function writeCrestManifest(map){ fs.writeFileSync(CREST_MANIFEST, JSON.stringify(map,null,2),'utf8'); }
async function fetchJson(url){ const r=await fetch(url,{headers:{'User-Agent':'BrasileiraoManager/18.7'}}); if(!r.ok) throw new Error('http '+r.status); return r.json(); }
async function fetchBytes(url){ const r=await fetch(url,{headers:{'User-Agent':'BrasileiraoManager/18.7'}}); if(!r.ok) throw new Error('http '+r.status); const ab=await r.arrayBuffer(); return Buffer.from(ab); }
async function ensureCrests(){
  const manifest=readCrestManifest();
  const teams=Object.keys(CREST_HINTS);
  let changed=false;
  for(const name of teams){
    if(manifest[name] && fs.existsSync(path.join(ROOT, manifest[name]))) continue;
    const aliases=CREST_HINTS[name]||[name];
    for(const alias of aliases){
      try{
        const url='https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t='+encodeURIComponent(alias);
        const data=await fetchJson(url); const teamsFound=data&&data.teams||[];
        const found=teamsFound.find(t=>String(t.strTeam||'').toLowerCase().includes(String(alias).toLowerCase().split(' ')[0])) || teamsFound[0];
        const badge=found&&(found.strBadge||found.strTeamBadge||found.strLogo);
        if(!badge) continue;
        let ext=((badge.split('?')[0].match(/\.(png|jpg|jpeg|webp|svg)$/i)||[])[1]||'png').toLowerCase();
        if(ext==='jpeg') ext='jpg';
        const rel=path.join('assets','crests',`${slugify(name)}.${ext}`);
        const abs=path.join(ROOT, rel);
        const buf=await fetchBytes(badge);
        fs.writeFileSync(abs, buf);
        manifest[name]=rel.split(path.sep).join('/');
        changed=true;
        break;
      }catch(e){}
    }
  }
  if(changed) writeCrestManifest(manifest);
  return manifest;
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
  return { code:room.code, version:room.version, liveVersion:room.liveVersion||0, live:room.live||null, savedAt:room.savedAt||null, readyDeadline:room.readyDeadline||null, chat:(room.chat||[]).slice(-80), actions:(room.actions||[]).slice(-120), state:room.state, players:room.players.map(p=>({name:p.name,managerIndex:p.managerIndex,teamId:p.teamId,ready:!!room.ready[p.token],onlineAt:p.onlineAt})) };
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
    res.writeHead(200,{'Content-Type':m,'Cache-Control':'no-store'});res.end(d);
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
      const t=token(); const room={code:c,hostToken:t,version:1,liveVersion:0,live:null,state:b.state,private:true,players:[{token:t,name:b.name||'Técnico 1',passwordHash:passHash(b.password||'1234'),managerIndex:0,teamId:b.teamId,onlineAt:Date.now()}],ready:{},chat:[],actions:[{at:Date.now(),text:'Sala criada pelo anfitrião.'}],createdAt:Date.now(),savedAt:Date.now()};
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
        room.players.push({token:t,name:b.name||`Técnico ${idx+1}`,passwordHash:passHash(b.password||'1234'),managerIndex:idx,teamId:tm.id,onlineAt:Date.now()}); room.actions=room.actions||[];room.actions.push({at:Date.now(),text:`${b.name||`Técnico ${idx+1}`} entrou na sala.`});room.version++;persist(room);
        return send(res,200,{code:c,token:t,managerIndex:idx,room:publicRoom(room)});
      }
      if(req.method==='POST'&&parts[3]==='reconnect'){
        const b=await json(req),player=room.players.find(p=>p.name.toLowerCase()===String(b.name||'').toLowerCase()&&p.passwordHash===passHash(b.password));
        if(!player)return send(res,401,{error:'Login ou senha inválidos.'});player.token=token();player.onlineAt=Date.now();if(player.managerIndex===0)room.hostToken=player.token;persist(room);return send(res,200,{code:c,token:player.token,managerIndex:player.managerIndex,room:publicRoom(room)});
      }
      const t=req.headers['x-player-token']; const player=auth(room,t); if(!player)return send(res,401,{error:'Sessão inválida.'}); player.onlineAt=Date.now();
      if(req.method==='GET'&&parts.length===3){return send(res,200,publicRoom(room));}
      if(req.method==='PUT'&&parts[3]==='state'){
        const b=await json(req); if(typeof b.version==='number'&&b.version<room.version-8)return send(res,409,{error:'Estado muito antigo.',room:publicRoom(room)});
        room.state=b.state; room.version++; room.ready={};room.readyDeadline=null;room.savedAt=Date.now();room.actions=room.actions||[];room.actions.push({at:Date.now(),text:`${player.name} sincronizou e salvou a carreira.`});room.actions=room.actions.slice(-300);persist(room);return send(res,200,{version:room.version,savedAt:room.savedAt});
      }
      if(req.method==='POST'&&parts[3]==='save'){
        if(t!==room.hostToken)return send(res,403,{error:'Somente o anfitrião pode salvar a carreira.'});
        room.savedAt=Date.now();persist(room);return send(res,200,{ok:true,savedAt:room.savedAt,code:room.code});
      }
      if(req.method==='POST'&&parts[3]==='live'){
        if(t!==room.hostToken)return send(res,403,{error:'Somente o anfitrião pode transmitir a rodada.'});
        const b=await json(req); room.live=b.live||null; room.liveVersion=(room.liveVersion||0)+1;
        return send(res,200,{liveVersion:room.liveVersion});
      }
      if(req.method==='POST'&&parts[3]==='ready'){
        const b=await json(req); room.ready[t]=b.ready!==false;if(room.ready[t]&&!room.readyDeadline)room.readyDeadline=Date.now()+120000;if(!Object.values(room.ready).some(Boolean))room.readyDeadline=null;room.version++;room.actions=room.actions||[];room.actions.push({at:Date.now(),text:`${player.name} ${room.ready[t]?'ficou pronto':'cancelou a prontidão'}.`});room.actions=room.actions.slice(-300);persist(room);
        return send(res,200,{room:publicRoom(room),allReady:room.players.length===2&&room.players.every(p=>room.ready[p.token])});
      }
      if(req.method==='POST'&&parts[3]==='chat'){
        const b=await json(req),text=String(b.text||'').trim().slice(0,300);if(!text)return send(res,400,{error:'Mensagem vazia.'});room.chat=room.chat||[];room.chat.push({at:Date.now(),name:player.name,text});room.chat=room.chat.slice(-100);room.version++;persist(room);return send(res,200,{chat:room.chat});
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
ensureCrests().then(m=>console.log(`Escudos em cache: ${Object.keys(m||{}).length}`)).catch(e=>console.log('Falha ao baixar escudos:',e.message));
server.listen(PORT,'0.0.0.0',()=>console.log(`Brasileirão Manager Online: http://localhost:${PORT}`));
