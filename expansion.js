(function(){
'use strict';
const XVER='18.4';
const extraLayouts={
 '4-1-4-1':[['GOL',50,91],['LE',14,72],['ZAG',38,76],['ZAG',62,76],['LD',86,72],['VOL',50,59],['MC',24,43],['MC',42,43],['MEI',62,43],['PD',82,35],['ATA',50,17]],
 '4-3-1-2':[['GOL',50,91],['LE',14,72],['ZAG',38,76],['ZAG',62,76],['LD',86,72],['VOL',50,56],['MC',30,47],['MC',70,47],['MEI',50,34],['ATA',36,18],['ATA',64,18]],
 '4-2-2-2':[['GOL',50,91],['LE',14,72],['ZAG',38,76],['ZAG',62,76],['LD',86,72],['VOL',38,55],['VOL',62,55],['MEI',28,37],['MEI',72,37],['ATA',38,18],['ATA',62,18]],
 '3-4-3':[['GOL',50,91],['ZAG',25,75],['ZAG',50,79],['ZAG',75,75],['LE',14,53],['VOL',39,51],['MC',61,51],['LD',86,53],['PE',18,25],['ATA',50,17],['PD',82,25]],
 '3-4-2-1':[['GOL',50,91],['ZAG',25,75],['ZAG',50,79],['ZAG',75,75],['LE',13,53],['VOL',40,52],['MC',60,52],['LD',87,53],['MEI',32,34],['MEI',68,34],['ATA',50,16]],
 '5-4-1':[['GOL',50,91],['LE',8,64],['ZAG',28,73],['ZAG',50,78],['ZAG',72,73],['LD',92,64],['MC',22,44],['VOL',42,49],['MEI',62,49],['MC',82,44],['ATA',50,17]]
};
Object.assign(FIELD_LAYOUTS,extraLayouts);
const fNeed={};Object.entries(extraLayouts).forEach(([k,v])=>{fNeed[k]={};v.forEach(x=>fNeed[k][x[0]]=(fNeed[k][x[0]]||0)+1)});Object.assign(FORMATIONS,fNeed);
const divRank=d=>d==='A'?3:d==='B'?2:1;
function fairInternationalValue(p){
 if(p.name==='Neymar')return 150000000;
 let base=p.rating>=90?255000000:p.rating>=88?220000000:p.rating>=85?165000000:p.rating>=82?115000000:p.rating>=80?85000000:p.rating>=75?48000000:p.rating>=70?24000000:9000000;
 let age=+p.age||27,mult=age<=22?1.24:age<=26?1.10:age<=29?1:age<=32?.84:age<=35?.66:.48;
 let v=Math.round(base*mult/500000)*500000;
 return Math.max(5000000,Math.min(300000000,v));
}
function rebalanceInternationalMarket(){
 if(S.marketPricingVersion>=4)return;
 (S.globalMarket||[]).forEach(p=>{
  if(p.name==='Neymar'){p.age=34;p.pos='MEI';p.rating=Math.max(84,p.rating||0)}
  if(!p.bought)p.value=fairInternationalValue(p);
 });
 S.marketPricingVersion=4;
}
function processTransferInstallments(){
 S.transferInstallments=S.transferInstallments||[];
 let next=[];
 S.transferInstallments.forEach(x=>{
  let t=team(x.teamId);if(!t||x.remaining<=0)return;
  let due=Math.min(x.amount,x.remaining),available=Math.max(0,t.cash),paid=Math.min(available,due);
  t.cash-=paid;x.remaining-=due;
  if(paid<due){let loan=due-paid;t.cash+=loan;t.cash-=loan;t.debt=(t.debt||0)+loan;addNews(`🏦 ${t.name} precisou financiar ${fmt(loan)} para pagar a parcela de ${x.player}.`)}
  else addNews(`💳 ${t.name} pagou ${fmt(due)} da transferência de ${x.player}.`);
  x.installmentsLeft=(x.installmentsLeft||1)-1;if(x.remaining>0&&x.installmentsLeft>0)next.push(x);
 });
 S.transferInstallments=next;
}


function debtReserve(t){return t.division==='A'?8000000:t.division==='B'?4000000:2000000}
function ensureDebtPlan(t){
 if((t.debt||0)<=0){t.debtPlan=null;t.transferCreditBlocked=false;return null}
 if(!t.debtPlan)t.debtPlan={openedSeason:S.season,dueSeason:S.season+3,originalDebt:t.debt,lastReviewSeason:S.season-1,overdue:false,missedPayments:0};
 t.debtPlan.originalDebt=Math.max(t.debtPlan.originalDebt||0,t.debt||0);
 t.debtPlan.dueSeason=Math.max(t.debtPlan.openedSeason+3,t.debtPlan.dueSeason||0);
 return t.debtPlan;
}
function debtRisk(t){
 if((t.debt||0)<=0)return'Nenhum';let p=ensureDebtPlan(t),years=Math.max(0,p.dueSeason-S.season),ratio=t.debt/Math.max(1,t.cash+t.debt);
 if(p.overdue||years===0)return'Crítico';if(years===1||ratio>.65)return'Alto';if(years===2||ratio>.4)return'Médio';return'Baixo';
}
function makeEmergencyAcademyPlayer(t){
 t.academy=t.academy||{level:1,prospects:[],graduates:[],investment:0};
 t.academy.prospects=t.academy.prospects||[];t.academy.graduates=t.academy.graduates||[];
 let p=t.academy.prospects.sort((a,b)=>(b.potential||b.rating||0)-(a.potential||a.rating||0)).shift();
 if(!p){
  const level=t.academy.level||1,age=rand(16,19),rating=rand(46+level*2,53+level*3),potential=Math.min(94,rating+rand(8,18)+level);
  p={id:'P-'+uid(),name:FIRST_NAMES[rand(0,FIRST_NAMES.length-1)]+' '+LAST_NAMES[rand(0,LAST_NAMES.length-1)],pos:POSITIONS[rand(0,POSITIONS.length-1)],age,rating,potential,value:marketBaseValue({rating,age},t.division),salary:9000+level*3500,development:0};
 }
 p.id=`Y-${t.id}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;p.contractYears=3;p.morale=78;p.fitness=100;p.form=6.2;p.starter=false;p.substitute=true;
 p.goals=p.goals||0;p.assists=p.assists||0;p.appearances=p.appearances||0;p.yellow=p.yellow||0;p.red=p.red||0;p.yellowAcc=p.yellowAcc||0;p.suspended=0;p.minutes=p.minutes||0;p.injury=null;p.listed=false;
 p.history=Array.isArray(p.history)?p.history:[{season:S.season,rating:p.rating,value:p.value}];p.fromAcademy=true;p.academyClub=t.name;
 t.players.push(p);t.academy.graduates.push({name:p.name,season:S.season,potential:p.potential,emergency:true});
 addNews(`🌱 ${t.name} promoveu ${p.name} da base para recompor o elenco após uma venda financeira.`);
 return p;
}
function sellForDebt(t,needed,forced=false){
 let raised=0,sold=[];
 const candidates=[...t.players].filter(p=>forced||positionDepthSafe(t,p)).sort((a,b)=>(b.value||0)-(a.value||0));
 for(const p of candidates){
  if(raised>=needed)break;
  if(!forced&&t.players.length<=18)break;
  const value=Math.max(100000,Math.round((p.value||1000000)*(forced?.82:.88)/50000)*50000);
  removePlayerFromTeam(t,p);t.cash+=value;raised+=value;sold.push(`${p.name} por ${fmt(value)}`);
  if(forced)while(t.players.length<18)makeEmergencyAcademyPlayer(t);
 }
 if(sold.length){while(t.players.length<18)makeEmergencyAcademyPlayer(t);repairLineup(t);addNews(`📉 ${t.name} vendeu ${sold.join(', ')} para cumprir o plano de dívidas.`);logAction(`${t.name} realizou venda financeira: ${sold.join(', ')}.`)}
 return raised;
}
function processAnnualDebtPlan(){
 ensureExpansion();const controlled=controlledIds();
 S.teams.forEach(t=>{
  if((t.debt||0)<=0){ensureDebtPlan(t);return}
  let p=ensureDebtPlan(t);if(p.lastReviewSeason===S.season)return;
  const interest=Math.round(t.debt*.08);t.debt+=interest;t.finance=t.finance||{};t.finance.interest=(t.finance.interest||0)+interest;
  const yearsLeft=Math.max(0,p.dueSeason-S.season);
  let required=yearsLeft<=0?t.debt:Math.max(Math.round(t.debt*.25),Math.ceil(t.debt/Math.max(1,yearsLeft+1)));
  const reserve=debtReserve(t);let available=Math.max(0,t.cash-reserve);
  if(available<required){
   const short=required-available;
   if(!controlled.has(t.id)||yearsLeft<=0)sellForDebt(t,short,yearsLeft<=0);
   available=Math.max(0,t.cash-reserve);
  }
  const paid=Math.min(t.debt,required,available);t.cash-=paid;t.debt-=paid;
  const missed=Math.max(0,required-paid);
  p.lastReviewSeason=S.season;
  if(missed>0){p.missedPayments=(p.missedPayments||0)+1;p.overdue=yearsLeft<=0||p.missedPayments>=2;t.transferCreditBlocked=true;addNews(`⚠️ ${t.name} pagou ${fmt(paid)} de ${fmt(required)} da dívida e ficou com ${fmt(missed)} em atraso.`)}
  else{p.missedPayments=0;p.overdue=false;t.transferCreditBlocked=false;addNews(`🏦 ${t.name} amortizou ${fmt(paid)} da dívida. Saldo: ${fmt(t.debt)}.`)}
  if(t.debt<=0){t.debt=0;t.debtPlan=null;t.transferCreditBlocked=false;addNews(`✅ ${t.name} quitou todas as dívidas.`)}
 });
}
function debtPanelHTML(t){
 let p=ensureDebtPlan(t);if(!p)return'<div class="card"><h3>Plano de dívidas</h3><p><b>Dívida:</b> Nenhuma.</p></div>';
 const years=Math.max(0,p.dueSeason-S.season),next=Math.max(Math.round(t.debt*.25),Math.ceil(t.debt/Math.max(1,years+1)));
 return `<div class="card"><h3>Plano de dívidas</h3><div class="kpis"><div class="kpi">Saldo devedor<b>${fmt(t.debt)}</b></div><div class="kpi">Prazo restante<b>${years} temporada(s)</b></div><div class="kpi">Pagamento mínimo<b>${fmt(next)}</b></div><div class="kpi">Risco financeiro<b>${debtRisk(t)}</b></div></div><p>Juros anuais de 8%. ${t.transferCreditBlocked?'<b style="color:#ff7f87">Compras parceladas bloqueadas por atraso.</b>':'Compras parceladas liberadas.'}</p></div>`;
}

const controlledIds=()=>new Set((S.managers||[]).map(m=>m.team));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
function addNews(s){S.news.unshift(s);if(typeof trimNewsHistory==='function')trimNewsHistory()}
function managerWinPct(m){let g=(m.wins||0)+(m.draws||0)+(m.losses||0);return g?((m.wins||0)*100/g):0}
function ensureManager(m,i){m.id=m.id||'M'+i;m.salary=m.salary||120000;m.reputation=m.reputation||10;m.wins=m.wins||0;m.draws=m.draws||0;m.losses=m.losses||0;m.careerHistory=m.careerHistory||[{season:S.season,teamId:m.team,teamName:team(m.team)?.name||'Clube',division:team(m.team)?.division||'C',joined:true}];m.trophies=m.trophies||[];m.youthUsed=m.youthUsed||0;m.jobStatus=m.jobStatus||'Empregado'}
function makeObjectives(t){
 let arr=[];if(t.division==='A'){arr.push(pos(t)>14?'Evitar rebaixamento':'Terminar na metade superior');if(t.cash>80000000)arr.push('Classificar para competição continental')}else arr.push(pos(t)>12?'Evitar rebaixamento':'Conseguir acesso');
 arr.push(Math.random()<.5?'Chegar à semifinal da Copa do Brasil':'Usar ao menos 3 jogadores da base');if(monthlyPayroll(t)>Math.max(1500000,t.cash/18))arr.push('Reduzir a folha salarial');return arr.slice(0,3)
}
function ensureExpansion(){
 if(!S)return;S.expansionVersion=XVER;rebalanceInternationalMarket();S.actionLog=S.actionLog||[];S.hallOfFame=S.hallOfFame||[];S.managerRankings=S.managerRankings||[];S.competitions=S.competitions||{};S.formHistory=S.formHistory||{};S.awards=S.awards||[];S.chat=S.chat||[];S.managerResultKeys=S.managerResultKeys||{};
 (S.managers||[]).forEach(ensureManager);
 S.teams.forEach(t=>{t.form=t.form||[];ensureDebtPlan(t);t.promotedLastSeason=!!t.promotedLastSeason;t.academy=t.academy||{level:1,prospects:[],lastScoutRound:-9};t.academy.investment=Math.max(0,Number(t.academy.investment)||0);t.academy.graduates=t.academy.graduates||[];t.academy.annualTrialSeason=t.academy.annualTrialSeason||0;t.board=t.board||{confidence:60,startCash:t.cash,targets:[]};if(!t.board.targets?.length)t.board.targets=makeObjectives(t);t.players.forEach(p=>{p.history=p.history||[{season:S.season,rating:p.rating,value:p.value}];p.fromAcademy=!!p.fromAcademy;p.potential=p.potential||Math.min(94,p.rating+rand(2,10));p.cards=p.cards||0})});
 initCompetitions();
}
function initCompetitions(){
 const c=S.competitions;
 c.stateals=c.stateals||{season:0,champions:[]};c.libertadores=c.libertadores||{season:0,history:[],qualified:[]};c.sulamericana=c.sulamericana||{season:0,history:[],qualified:[]};c.supercopa=c.supercopa||{season:0,history:[]};c.mundial=c.mundial||{season:0,history:[]};
}
let expansionSaveTimer=null;
function autoSaveExpansion(){clearTimeout(expansionSaveTimer);expansionSaveTimer=setTimeout(()=>{try{save()}catch(e){console.warn('Falha no salvamento automático da expansão:',e)}},120)}
function logAction(text){ensureExpansion();S.actionLog.unshift({at:Date.now(),season:S.season,round:S.round,manager:manager()?.name||'Técnico',text});S.actionLog=S.actionLog.slice(0,300)}
function playerRefusal(buyer,p){let req=divRank(teamOfPlayer(p)?.division||'A');let rep=manager()?.reputation||10;let weak=divRank(buyer.division)<req-1;let star=p.rating>=82;return (weak&&star&&Math.random()<.75)||(star&&rep<20&&Math.random()<.35)}
function teamOfPlayer(p){return S.teams.find(t=>t.players.some(x=>x.id===p.id))}
function needPosition(t){const count={};t.players.forEach(p=>count[p.pos]=(count[p.pos]||0)+1);if((count.GOL||0)<2)return'GOL';let desired={ZAG:4,LD:2,LE:2,VOL:2,MC:2,MEI:2,PD:2,PE:2,ATA:3};return Object.keys(desired).sort((a,b)=>((count[a]||0)/desired[a])-((count[b]||0)/desired[b]))[0]||'ATA'}
function willingPlayer(p,buyer,seller){let jump=divRank(buyer.division)-divRank(seller.division);let prestige=(buyer.cash>100000000?2:0)+(buyer.division==='A'?2:0)+(buyer.promotedLastSeason?1:0);return Math.random()*5+jump+prestige>1.2||p.rating<75}
function completeAITransfer(buyer,seller,p,offer,reason){buyer.cash-=offer;seller.cash+=offer;removePlayerFromTeam(seller,p);p.starter=false;p.contractYears=rand(2,5);p.morale=72;buyer.players.push(p);repairLineup(buyer);let msg=`${buyer.name} contratou ${p.name}, do ${seller.name}, por ${fmt(offer)} (${reason}).`;S.transferLog.unshift(msg);addNews(msg);logAction(msg)}
function smartAITransferWindow(){
 ensureExpansion();const human=controlledIds(),clubs=S.teams.filter(t=>!human.has(t.id));
 clubs.filter(t=>t.cash<5000000||(t.debt||0)>t.cash*.55).forEach(t=>{[...t.players].sort((a,b)=>b.value-a.value).slice(0,3).forEach(p=>{if(positionDepthSafe(t,p))p.listed=true})});
 const target=rand(1,3);let completed=0,attempts=0,usedBuyers=new Set();
 while(completed<target&&attempts++<28){
  let buyers=clubs.filter(t=>t.cash>3500000&&t.players.length<29);
  if(!buyers.length)break;
  buyers.sort((a,b)=>{
   const sa=(a.promotedLastSeason?30:0)+(a.cash>100000000?18:0)+(needPosition(a)==='GOL'?10:0)+Math.random()*24-(usedBuyers.has(a.id)?12:0);
   const sb=(b.promotedLastSeason?30:0)+(b.cash>100000000?18:0)+(needPosition(b)==='GOL'?10:0)+Math.random()*24-(usedBuyers.has(b.id)?12:0);
   return sb-sa;
  });
  const buyer=buyers[0],need=needPosition(buyer),starBudget=buyer.cash>100000000;
  let pool=S.teams.filter(s=>s.id!==buyer.id).flatMap(s=>s.players.filter(p=>positionDepthSafe(s,p)&&((p.pos===need)||(starBudget&&p.rating>=80))&&(!human.has(s.id)||p.listed)).map(p=>({s,p})));
  if(!pool.length)continue;
  pool.sort((a,b)=>{
   const an=(a.p.pos===need?25:0)+(a.p.listed?8:0)+(starBudget?a.p.rating:0)-a.p.value/5000000;
   const bn=(b.p.pos===need?25:0)+(b.p.listed?8:0)+(starBudget?b.p.rating:0)-b.p.value/5000000;
   return bn-an;
  });
  const pick=pool[Math.floor(Math.random()*Math.min(pool.length,10))],seller=pick.s,p=pick.p;
  if(!willingPlayer(p,buyer,seller))continue;
  const competition=clubs.filter(x=>x.id!==buyer.id&&x.cash>p.value*.95&&needPosition(x)===p.pos).length;
  let offer=Math.round(p.value*(.96+Math.random()*.20+Math.min(.16,competition*.025))/50000)*50000;
  const maxSpend=Math.max(0,buyer.cash-(buyer.division==='A'?8000000:buyer.division==='B'?4000000:2000000));
  if(buyer.promotedLastSeason)offer=Math.min(offer,Math.round(buyer.cash*.34));
  if(offer>maxSpend||offer<=0||!aiWillSell(seller,p,offer).accept)continue;
  completeAITransfer(buyer,seller,p,offer,competition>1?'disputa com outros clubes':p.pos===need?'necessidade do elenco':'oportunidade de mercado');
  usedBuyers.add(buyer.id);completed++;
 }
 return completed;
}
const buyBase=window.buy;window.buy=function(pid,oid){ensureExpansion();let p=team(oid)?.players.find(x=>x.id===pid),buyer=team(manager().team);if(p&&playerRefusal(buyer,p))return alert(`${p.name} recusou abrir negociação porque considera o projeto esportivo abaixo de suas expectativas.`);let r=buyBase.apply(this,arguments);logAction(`Negociação iniciada por ${p?.name||'jogador'}.`);return r};
window.buyForeign=function(pid){
 ensureExpansion();let buyer=team(manager().team),p=S.globalMarket.find(x=>x.id===pid);if(!p||p.bought)return;
 if(playerRefusal(buyer,p))return alert(`${p.name} recusou a proposta esportiva do clube.`);
 let minPct=p.rating>=88?.92:p.rating>=84?.88:.84;
 let proposal=+(prompt(`Valor estimado: ${fmt(p.value)}. O clube aceita negociar a partir de aproximadamente ${fmt(Math.round(p.value*minPct))}. Faça sua proposta:`,Math.round(p.value*.94))||0);
 if(proposal<=0)return;if(proposal<p.value*minPct)return alert('O clube recusou a oferta.');
 let parts=Math.max(1,Math.min(3,+(prompt('Pagamento em quantas parcelas anuais? Digite 1, 2 ou 3.',proposal>=80000000?3:1)||1)));
 if(parts>1&&buyer.transferCreditBlocked)return alert('Compras parceladas estão bloqueadas até o clube regularizar o plano de dívidas.');
 let first=Math.ceil(proposal/parts),remaining=proposal-first;
 if(buyer.cash<first)return alert(`Caixa insuficiente para a primeira parcela de ${fmt(first)}.`);
 buyer.cash-=first;p.bought=true;
 let wage=Math.max(30000,Math.round(proposal/900));
 let np={...p,id:'F-'+p.id+'-'+Date.now(),salary:wage,contractYears:4,morale:75,potential:Math.min(94,p.rating+3),starter:false,substitute:true,goals:0,assists:0,appearances:0,form:6.5,fitness:100,valueTrend:0,yellow:0,yellowAcc:0,red:0,suspended:0,minutes:0,injury:null,listed:false,history:[{season:S.season,rating:p.rating,value:proposal}]};
 buyer.players.push(np);repairLineup(buyer);
 if(remaining>0){S.transferInstallments=S.transferInstallments||[];S.transferInstallments.push({teamId:buyer.id,player:p.name,amount:Math.ceil(remaining/(parts-1)),remaining,installmentsLeft:parts-1})}
 let msg=`${buyer.name} contratou ${p.name}, do ${p.club}, por ${fmt(proposal)}${parts>1?` em ${parts} parcelas`:''}.`;S.news.unshift(msg);S.transferLog.unshift(msg);logAction(msg);save();market();
};
window.aiTransferWindow=smartAITransferWindow;
function annualTrial(t){
 if(t.academy.annualTrialSeason===S.season)return;t.academy.annualTrialSeason=S.season;let count=rand(4,7);t.academy.prospects=[];
 for(let i=0;i<count;i++){let age=rand(15,19),rating=rand(45+t.academy.level*2,54+t.academy.level*3),potential=Math.min(96,rating+rand(9,22)+t.academy.level);t.academy.prospects.push({id:'P-'+uid(),name:FIRST_NAMES[rand(0,FIRST_NAMES.length-1)]+' '+LAST_NAMES[rand(0,LAST_NAMES.length-1)],pos:POSITIONS[rand(0,POSITIONS.length-1)],age,rating,potential,value:marketBaseValue({rating,age},t.division),salary:9000+t.academy.level*3500,scoutedSeason:S.season,development:0})}
 addNews(`🧒 Peneira anual do ${t.name}: ${count} jovens foram selecionados para avaliação.`)
}
function developAcademy(){S.teams.forEach(t=>{annualTrial(t);t.academy.prospects.forEach(p=>{let gain=Math.max(.1,(p.potential-p.rating)*(.025+t.academy.level*.008));p.rating=Math.min(p.potential,Math.round((p.rating+gain)*10)/10);p.development=(p.development||0)+gain;p.value=marketBaseValue(p,t.division)})})}
const promoteBase=window.promoteYouth;window.promoteYouth=function(i){let t=team(manager().team),p=t.academy.prospects[i];if(p){p.history=p.history||[{season:S.season,rating:p.rating,value:p.value}];p.fromAcademy=true;p.academyClub=t.name;t.academy.graduates.push({name:p.name,season:S.season,potential:p.potential});manager().youthUsed=(manager().youthUsed||0)+1;logAction(`Promoveu ${p.name} da base.`)}return promoteBase.apply(this,arguments)};
window.sellProspect=function(i){let t=team(manager().team),p=t.academy.prospects[i];if(!p)return;let value=Math.round(p.value*(.35+Math.random()*.35));if(!confirm(`Vender os direitos de ${p.name} por ${fmt(value)}?`))return;t.cash+=value;t.academy.prospects.splice(i,1);addNews(`${t.name} vendeu a promessa ${p.name} por ${fmt(value)}.`);logAction(`Vendeu promessa ${p.name}.`);save();academy()};
window.investAcademy=function(){
 let t=team(manager().team);
 t.academy=t.academy||{level:1,prospects:[],graduates:[],investment:0};
 t.academy.level=Math.max(1,Number(t.academy.level)||1);
 t.academy.investment=Math.max(0,Number(t.academy.investment)||0);
 let raw=prompt('Quanto deseja investir na base?',1000000);
 if(raw===null)return;
 let amount=Number(String(raw).replace(/\./g,'').replace(',','.'));
 if(!Number.isFinite(amount)||amount<=0||amount>Number(t.cash||0))return alert('Valor inválido.');
 amount=Math.round(amount);
 t.cash=Number(t.cash||0)-amount;
 t.academy.investment=Number(t.academy.investment||0)+amount;
 let upgraded=false;
 while(t.academy.level<7){
  const required=t.academy.level*3000000;
  if(t.academy.investment<required)break;
  t.academy.investment-=required;
  t.academy.level++;
  upgraded=true;
  addNews(`🏗️ ${t.name} elevou a estrutura da base ao nível ${t.academy.level}.`)
 }
 if(t.academy.level>=7&&upgraded)t.academy.investment=0;
 save();academy()
};
function objectiveProgress(t,obj){if(obj.includes('Evitar'))return pos(t)<=16?100:30;if(obj.includes('metade'))return pos(t)<=10?100:Math.max(0,100-(pos(t)-10)*12);if(obj.includes('acesso'))return pos(t)<=4?100:Math.max(0,75-(pos(t)-4)*8);if(obj.includes('semifinal'))return S.cup?.stage==='Semifinal'||S.cup?.stage==='Final'||S.cup?.champion===t.id?100:30;if(obj.includes('folha'))return monthlyPayroll(t)<Math.max(1200000,t.board.startPayroll||monthlyPayroll(t))?100:35;if(obj.includes('base'))return t.players.filter(p=>p.fromAcademy&&p.appearances>0).length>=3?100:t.players.filter(p=>p.fromAcademy&&p.appearances>0).length*30;return 50}
function evaluateObjectives(){S.teams.forEach(t=>{let avg=t.board.targets.reduce((s,o)=>s+objectiveProgress(t,o),0)/Math.max(1,t.board.targets.length);t.board.confidence=Math.max(5,Math.min(100,Math.round(t.board.confidence+(avg-50)/12)))})}
function simulateKnockout(name,ids,prize){let teams=ids.map(team).filter(Boolean);if(teams.length<2)return null;while(teams.length>1){let next=[];teams.sort(()=>Math.random()-.5);for(let i=0;i<teams.length;i+=2){let a=teams[i],b=teams[i+1];if(!b){next.push(a);continue}next.push(strength(a)+Math.random()*12>strength(b)+Math.random()*12?a:b)}teams=next}let champ=teams[0];champ.cash+=prize;addNews(`🏆 ${champ.name} conquistou ${name} de ${S.season}.`);return champ}
function runSeasonCompetitions(){
 let A=standings('A'),cupChamp=S.cup?.champion!=null?team(S.cup.champion):A[0];
 let stateChamp=simulateKnockout('o Estadual',S.teams.sort(()=>Math.random()-.5).slice(0,16).map(t=>t.id),3000000);S.competitions.stateals.champions.unshift({season:S.season,champion:stateChamp?.name});
 let libIds=[...A.slice(0,6).map(t=>t.id),cupChamp?.id].filter((v,i,a)=>v!=null&&a.indexOf(v)===i);let lib=simulateKnockout('a Libertadores',libIds,35000000);S.competitions.libertadores.history.unshift({season:S.season,champion:lib?.name});
 let sul=simulateKnockout('a Sul-Americana',A.slice(6,12).map(t=>t.id),18000000);S.competitions.sulamericana.history.unshift({season:S.season,champion:sul?.name});
 let superC=simulateKnockout('a Supercopa',[A[0]?.id,cupChamp?.id].filter((v,i,a)=>v!=null&&a.indexOf(v)===i),8000000);S.competitions.supercopa.history.unshift({season:S.season,champion:superC?.name});
 if(lib){let mundial=simulateKnockout('o Mundial de Clubes',[lib.id,...A.slice(0,3).map(t=>t.id)],25000000);S.competitions.mundial.history.unshift({season:S.season,champion:mundial?.name})}
}
function registerManagerRoundResults(games,season,round){
 ensureExpansion();
 (S.managers||[]).forEach((m,i)=>{
  ensureManager(m,i);const g=(games||[]).find(x=>x.home===m.team||x.away===m.team);if(!g)return;
  const key=`${m.id}|${season}|${round}`;if(S.managerResultKeys[key])return;
  const gf=g.home===m.team?g.hg:g.ag,ga=g.home===m.team?g.ag:g.hg,result=gf>ga?'V':gf===ga?'E':'D';
  if(result==='V')m.wins=(m.wins||0)+1;else if(result==='E')m.draws=(m.draws||0)+1;else m.losses=(m.losses||0)+1;
  const t=team(m.team);if(t){t.form=t.form||[];t.form.push(result);t.form=t.form.slice(-8);S.formHistory[t.id]=t.form.slice()}
  S.managerResultKeys[key]=result;
 });
 const keys=Object.keys(S.managerResultKeys);if(keys.length>1200)keys.slice(0,keys.length-1000).forEach(k=>delete S.managerResultKeys[k]);
}
function updateRankings(){S.managerRankings=(S.managers||[]).map(m=>({name:m.name,team:team(m.team)?.name||'Sem clube',reputation:m.reputation,titles:m.titles||0,promotions:m.promotions||0,points:(m.careerPoints||0)+(m.titles||0)*40+(m.promotions||0)*25+managerWinPct(m)/2})).sort((a,b)=>b.points-a.points);S.managerRankings.forEach((x,i)=>x.rank=i+1)}
function awardSeason(){let all=S.teams.flatMap(t=>t.players.map(p=>({p,t}))),best=[...all].sort((a,b)=>(b.p.goals||0)*3+(b.p.assists||0)*2+(b.p.form||0)-((a.p.goals||0)*3+(a.p.assists||0)*2+(a.p.form||0)))[0],top=[...all].sort((a,b)=>(b.p.goals||0)-(a.p.goals||0))[0];let a={season:S.season,bestPlayer:best?.p.name,club:best?.t.name,topScorer:top?.p.name,goals:top?.p.goals||0};S.awards.unshift(a);addNews(`🏅 Premiações: ${a.bestPlayer} foi eleito o melhor jogador; ${a.topScorer} terminou como artilheiro com ${a.goals} gols.`)}
const finishBase=window.finishRound;window.finishRound=function(){const games=live&&live.games?live.games.map(g=>({...g})):[],season=S.season,round=S.round;let r=finishBase.apply(this,arguments);ensureExpansion();registerManagerRoundResults(games,season,round);if(S.round%4===0){developAcademy();evaluateObjectives()}autoSaveExpansion();return r};
function applyAnnualClubCosts(){
 const thresholds={A:180000000,B:100000000,C:60000000},base={A:42000000,B:18000000,C:8000000};
 S.teams.forEach(t=>{
  const threshold=thresholds[t.division]||80000000,excess=Math.max(0,t.cash-threshold);
  let cost=base[t.division]+excess*.18+monthlyPayroll(t)*4;
  cost=Math.min(cost,Math.max(0,t.cash-2000000),t.cash*.35);
  cost=Math.max(0,Math.round(cost/50000)*50000);t.cash-=cost;t.annualOperatingCost=cost;
  if(cost>=20000000)addNews(`🏟️ ${t.name} gastou ${fmt(cost)} com folha, estrutura e operação anual.`);
 });
}
const endBase=window.endSeason;window.endSeason=function(){ensureExpansion();awardSeason();runSeasonCompetitions();let oldDiv=new Map(S.teams.map(t=>[t.id,t.division]));let season=S.season;processAnnualDebtPlan();processTransferInstallments();applyAnnualClubCosts();let r=endBase.apply(this,arguments);ensureExpansion();S.teams.forEach(t=>{t.promotedLastSeason=divRank(t.division)>divRank(oldDiv.get(t.id));t.board.targets=makeObjectives(t);t.board.startPayroll=monthlyPayroll(t);t.players.forEach(p=>{p.history=Array.isArray(p.history)?p.history:[];p.history.push({season:S.season,rating:p.rating,value:p.value});if(p.history.length>20)p.history=p.history.slice(-20)});annualTrial(t)});(S.managers||[]).forEach((m,i)=>{ensureManager(m,i);m.careerHistory.push({season,teamId:m.team,teamName:team(m.team)?.name||'Clube',division:team(m.team)?.division||'C',position:pos(team(m.team))})});updateRankings();let best=S.managerRankings[0];if(best&&!S.hallOfFame.some(x=>x.name===best.name&&x.season===season))S.hallOfFame.unshift({season,name:best.name,team:best.team,points:Math.round(best.points)});autoSaveExpansion();return r};
function formHTML(t){return `<span class="form-strip">${(t.form||[]).slice(-5).map(x=>`<b class="f-${x}">${x}</b>`).join('')||'—'}</span>`}
function competitions(){ensureExpansion();let c=S.competitions,history=(title,obj)=>`<div class="card"><h3>${title}</h3>${(obj.history||obj.champions||[]).slice(0,8).map(x=>`<div class="news"><b>${x.season}</b> — ${x.champion||'Em andamento'}</div>`).join('')||'<p class="muted">Ainda sem campeão registrado.</p>'}</div>`;$('content').innerHTML=`<div class="card"><h2>Competições</h2><p class="muted">Calendário nacional e continental integrado à carreira.</p><div class="kpis"><div class="kpi">Copa do Brasil<b>${S.cup?.stage||'Aguardando'}</b></div><div class="kpi">Libertadores<b>Anual</b></div><div class="kpi">Sul-Americana<b>Anual</b></div><div class="kpi">Mundial<b>Anual</b></div></div></div><div class="stat-grid">${history('Estaduais',c.stateals)}${history('Libertadores',c.libertadores)}${history('Sul-Americana',c.sulamericana)}${history('Supercopa',c.supercopa)}${history('Mundial',c.mundial)}</div>`}
function career(){ensureExpansion();let m=manager(),hist=m.careerHistory||[];$('content').innerHTML=`<div class="card"><h2>Perfil do treinador — ${m.name}</h2><div class="kpis"><div class="kpi">Reputação<b>${m.reputation}</b></div><div class="kpi">Aproveitamento<b>${managerWinPct(m).toFixed(1)}%</b></div><div class="kpi">Títulos<b>${m.titles||0}</b></div><div class="kpi">Acessos<b>${m.promotions||0}</b></div><div class="kpi">Salário anual<b>${fmt(m.salary||0)}</b></div><div class="kpi">Jogadores da base usados<b>${m.youthUsed||0}</b></div></div></div><div class="card"><h3>Histórico de clubes</h3>${hist.slice().reverse().map(h=>`<div class="news"><b>${h.season}</b> — ${h.teamName} • Série ${h.division}${h.position?` • ${h.position}º`:''}</div>`).join('')}</div>${typeof renderOffers==='function'?renderOffers()||'':''}`}
function rankings(){ensureExpansion();updateRankings();$('content').innerHTML=`<div class="stat-grid"><div class="card"><h2>Ranking de técnicos</h2>${S.managerRankings.map(x=>`<div class="player"><b>${x.rank}. ${x.name}</b><span>${x.team}</span><span class="pill">Rep. ${x.reputation}</span><b>${Math.round(x.points)} pts</b><span></span></div>`).join('')}</div><div class="card"><h2>Hall da Fama</h2>${S.hallOfFame.slice(0,20).map(x=>`<div class="news">🏆 <b>${x.name}</b> — ${x.team} (${x.season})</div>`).join('')||'<p class="muted">Aguardando o primeiro imortal.</p>'}</div></div>`}
function resolvePlayerAnywhere(pid){
 let t=S.teams.find(t=>(t.players||[]).some(p=>p.id===pid));
 if(t){let p=t.players.find(p=>p.id===pid);return{p,t,source:'Elenco profissional'}}
 for(const club of S.teams){let p=club.academy?.prospects?.find(x=>x.id===pid);if(p)return{p,t:club,source:'Categorias de base'}}
 let p=(S.globalMarket||[]).find(x=>x.id===pid);if(p)return{p,t:{name:p.club||'Mercado internacional',color:'#334155',logo:null},source:p.league||'Mercado internacional'}
 p=(S.freeAgents||[]).find(x=>x.id===pid);if(p)return{p,t:{name:'Sem clube',color:'#475569',logo:null},source:'Agente livre'}
 return null
}
function playerModal(pid){
 let found=resolvePlayerAnywhere(pid);if(!found)return alert('Não foi possível localizar os dados desse jogador.');
 let {p,t,source}=found,hist=p.history||[],ratings=hist.map(x=>+x.rating||0).filter(Boolean),max=Math.max(1,...ratings,+p.rating||1),bars=hist.map(x=>`<div class="chart-bar" style="height:${Math.max(8,(+x.rating||0)/max*120)}px" title="${x.season}: ${x.rating}"><span>${x.rating}</span></div>`).join('');
 let clubCrest=t.logo?crest(t):'';
 let contract=p.contractYears!=null?`${p.contractYears} ano(s)`:'—',fitness=p.fitness!=null?`${Math.round(p.fitness)}%`:'—',form=p.form!=null?(+p.form).toFixed(1):'—';
 let d=document.createElement('div');d.className='xmodal';
 d.innerHTML=`<div class="xmodal-box"><button class="xclose">×</button><h2>${p.name}</h2><p>${clubCrest}<b>${t.name}</b> • ${source} • ${p.pos||p.naturalPos||'—'} • ${p.age||'—'} anos</p><div class="kpis"><div class="kpi">Nível<b>${p.rating??'—'}</b></div><div class="kpi">Potencial<b>${p.potential??'—'}</b></div><div class="kpi">Valor<b>${fmt(p.value||0)}</b></div><div class="kpi">Condição<b>${fitness}</b></div><div class="kpi">Forma<b>${form}</b></div><div class="kpi">Contrato<b>${contract}</b></div><div class="kpi">Gols<b>${p.goals||0}</b></div><div class="kpi">Assistências<b>${p.assists||0}</b></div><div class="kpi">Jogos<b>${p.appearances||0}</b></div><div class="kpi">Cartões<b>${(p.yellow||0)+(p.red||0)}</b></div><div class="kpi">Salário<b>${p.salary?fmt(p.salary)+'/mês':'—'}</b></div><div class="kpi">Origem<b>${p.originClub||p.academyClub||p.club||t.name}</b></div></div><h3>Evolução</h3><div class="mini-chart">${bars||'<span>Sem histórico de temporadas.</span>'}</div></div>`;
 document.body.appendChild(d);d.querySelector('.xclose').onclick=()=>d.remove();d.onclick=e=>{if(e.target===d)d.remove()}
}
function findPlayerIdByName(name){
 let n=String(name||'').trim();if(!n)return null;
 for(const t of S.teams){let p=(t.players||[]).find(x=>x.name===n);if(p)return p.id;let y=t.academy?.prospects?.find(x=>x.name===n);if(y)return y.id}
 let p=(S.globalMarket||[]).find(x=>x.name===n&&!x.bought)||(S.freeAgents||[]).find(x=>x.name===n);return p?.id||null
}
function makeAllPlayerNamesClickable(){
 document.querySelectorAll('#content .player b, #content .academy-card b').forEach(el=>{
  if(el.dataset.playerLinked==='1')return;
  let id=findPlayerIdByName(el.textContent);if(!id)return;
  el.dataset.playerLinked='1';el.classList.add('clickable');el.onclick=e=>{e.stopPropagation();playerModal(id)};
 });
}
window.playerModal=playerModal;window.makeAllPlayerNamesClickable=makeAllPlayerNamesClickable;
function comparison(){let all=S.teams.flatMap(t=>t.players.map(p=>({p,t}))).sort((a,b)=>b.p.rating-a.p.rating).slice(0,120);$('content').innerHTML=`<div class="card"><h2>Comparar jogadores</h2><div class="compare-select"><select id="cmpA">${all.map(x=>`<option value="${x.p.id}">${x.p.name} — ${x.t.name}</option>`).join('')}</select><select id="cmpB">${all.map((x,i)=>`<option value="${x.p.id}" ${i===1?'selected':''}>${x.p.name} — ${x.t.name}</option>`).join('')}</select><button class="btn primary" onclick="drawComparison()">Comparar</button></div><div id="cmpResult"></div></div>`}
window.drawComparison=function(){let ids=[$('cmpA').value,$('cmpB').value],ps=ids.map(id=>S.teams.flatMap(t=>t.players.map(p=>({p,t}))).find(x=>x.p.id===id));$('cmpResult').innerHTML=`<div class="compare-grid">${ps.map(x=>`<div class="card"><h3>${x.p.name}</h3><p>${crest(x.t)}${x.t.name}</p><div class="kpis"><div class="kpi">Nível<b>${x.p.rating}</b></div><div class="kpi">Potencial<b>${x.p.potential}</b></div><div class="kpi">Valor<b>${fmt(x.p.value)}</b></div><div class="kpi">Gols<b>${x.p.goals||0}</b></div><div class="kpi">Assistências<b>${x.p.assists||0}</b></div><div class="kpi">Condição<b>${Math.round(x.p.fitness)}%</b></div></div></div>`).join('')}</div>`};
const academyOld=window.academy;window.academy=function(){ensureExpansion();let t=team(manager().team),a=t.academy;if(a.annualTrialSeason!==S.season)annualTrial(t);$('content').innerHTML=`<div class="card"><h2>Centro de formação</h2><div class="kpis"><div class="kpi">Nível da base<b>${a.level}/7</b></div><div class="kpi">Investimento acumulado<b>${fmt(a.investment)}</b></div><div class="kpi">Promessas<b>${a.prospects.length}</b></div><div class="kpi">Formados pelo clube<b>${a.graduates.length}</b></div></div><div class="controls"><button class="btn primary" onclick="scoutYouth()">Relatório dos olheiros</button><button class="btn" onclick="investAcademy()">Investir na base</button></div></div>${a.prospects.sort((a,b)=>b.potential-a.potential).map((p,i)=>`<div class="card academy-card"><div class="player"><div><b onclick="playerModal('${p.id}')" class="clickable">${p.name}</b><br><span class="muted">${p.age} anos • Potencial ${p.potential-3}–${p.potential+2} • Evolução +${(p.development||0).toFixed(1)}</span></div><span class="pill">${p.pos}</span><b>${p.rating}</b><span>${fmt(p.value)}</span><span><button class="btn primary small" onclick="promoteYouth(${i})">Promover</button> <button class="btn small" onclick="sellProspect(${i})">Vender promessa</button></span></div></div>`).join('')||'<div class="card"><p class="muted">A próxima peneira anual revelará novos jogadores.</p></div>'}`};
const boardOld=window.board;window.board=function(){ensureExpansion();let t=team(manager().team),b=t.board;$('content').innerHTML=`<div class="card"><h2>Diretoria — Confiança ${b.confidence}%</h2><div class="progress"><span style="width:${b.confidence}%"></span></div><h3>Objetivos da temporada</h3>${b.targets.map(o=>{let p=Math.round(objectiveProgress(t,o));return `<div class="objective"><div><b>${o}</b><span>${p}%</span></div><div class="progress"><span style="width:${p}%"></span></div></div>`}).join('')}<p class="muted">A diretoria avalia resultados, finanças, Copa do Brasil e utilização da base.</p></div>`};
const squadOld=window.squad;window.squad=function(){squadOld();document.querySelectorAll('#content .player b').forEach(b=>{let name=b.textContent.trim(),p=team(manager().team).players.find(x=>x.name===name);if(p){b.classList.add('clickable');b.onclick=()=>playerModal(p.id)}})};
const tableOld=window.table;window.table=function(){tableOld.apply(this,arguments);document.querySelectorAll('#content .standings-row,#content tr').forEach(()=>{});let t=team(manager().team);$('content')?.insertAdjacentHTML('afterbegin',`<div class="card compact"><b>Forma recente do ${t.name}:</b> ${formHTML(t)}</div>`)};
const renderOld=window.render;window.render=function(v){ensureExpansion();header();({home,gameplay,squad,opponents,market,board,academy,stats,table,fixtures,news,competitions,career,rankings,comparison}[v]||home)();setTimeout(makeAllPlayerNamesClickable,0)};
function addNav(){let nav=document.querySelector('#game nav');if(!nav||nav.querySelector('[data-v="competitions"]'))return;[['competitions','Competições'],['career','Carreira'],['rankings','Ranking'],['comparison','Comparar']].forEach(([v,l])=>{let b=document.createElement('button');b.className='btn';b.dataset.v=v;b.textContent=l;nav.appendChild(b)});nav.querySelectorAll('button').forEach(b=>b.onclick=()=>{nav.querySelectorAll('button').forEach(x=>x.classList.remove('active'));b.classList.add('active');render(b.dataset.v)})}
const openBase=window.openGame;window.openGame=function(){let r=openBase.apply(this,arguments);ensureExpansion();addNav();return r};
const homeBase=window.home;window.home=function(){ensureExpansion();homeBase();let t=team(manager().team);$('content').insertAdjacentHTML('afterbegin',`<div class="card xhero"><div><h2>${crest(t)}${t.name}</h2><p>Forma recente ${formHTML(t)}</p></div><div><b>Versão ${XVER}</b><br><span class="muted">Expansão Manager Total</span></div></div>`)};
const homeDebtBase=window.home;window.home=function(){ensureExpansion();homeDebtBase();let t=team(manager().team);$('content').insertAdjacentHTML('beforeend',debtPanelHTML(t))};
function installStyles(){let s=document.createElement('style');s.textContent=`
:root{--ok:#22c55e;--bad:#ef4444;--draw:#eab308}.clickable{cursor:pointer;text-decoration:underline dotted}.form-strip{display:inline-flex;gap:4px;margin-left:8px}.form-strip b{width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:11px}.f-V{background:var(--ok)}.f-E{background:var(--draw)}.f-D{background:var(--bad)}.objective{padding:10px 0}.objective>div:first-child{display:flex;justify-content:space-between}.xmodal{position:fixed;inset:0;background:#000b;z-index:100000;display:flex;align-items:center;justify-content:center;padding:18px}.xmodal-box{width:min(720px,100%);max-height:90vh;overflow:auto;background:#111c31;border:1px solid #46618d;border-radius:18px;padding:22px;position:relative}.xclose{position:absolute;right:12px;top:10px;background:none;border:0;color:#fff;font-size:28px;cursor:pointer}.mini-chart{height:150px;display:flex;align-items:end;gap:9px;border-bottom:1px solid #51617d;padding:10px}.chart-bar{min-width:34px;background:linear-gradient(#4ea1ff,#2459b8);border-radius:6px 6px 0 0;position:relative}.chart-bar span{position:absolute;top:-20px;font-size:10px}.compare-select{display:flex;gap:12px;flex-wrap:wrap}.compare-select select{flex:1;min-width:230px}.compare-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:16px}.xhero{display:flex;justify-content:space-between;align-items:center}.crest{transform:scale(1.12);transform-origin:left center}@media(max-width:700px){#game nav{display:flex;overflow-x:auto;flex-wrap:nowrap;padding-bottom:8px}#game nav button{flex:0 0 auto}.compare-grid{grid-template-columns:1fr}.player{grid-template-columns:1fr auto!important}.player>.hideMob{display:none!important}.xhero{align-items:flex-start;gap:10px}.field{min-width:620px}.card:has(.field){overflow-x:auto}}
`;document.head.appendChild(s)}
installStyles();
window.addEventListener('load',()=>setTimeout(()=>{if(window.S){ensureExpansion();addNav()}},300));
})();
