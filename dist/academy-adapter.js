// Only the selected learner is sent to the shared family backend.
export function sudokuAdapter({ getData, levels, makeProfile, validProfile, validRun, persist, refresh }) {
  const current = () => getData().profiles.find(p => p.id === getData().activeProfileId);
  return {
    game: 'sudokuquest', identity: () => current().id,
    select(id) { const d=getData(); if(!d.profiles.some(p=>p.id===id))return false; d.activeProfileId=id;persist();refresh();return true; },
    create(hero) { const d=getData();if(d.profiles.length>=5)throw Error('All five local hero spaces are in use.');const p=makeProfile(String(hero.name||'Explorer').slice(0,25));d.profiles.push(p);d.activeProfileId=p.id;persist();refresh();return p.id; },
    snapshot: () => ({version:1,...structuredClone(current())}),
    restore(remote) {
      if(!validProfile(remote)||remote.completed.some(id=>!levels.some(l=>l.id===id))||!Number.isFinite(remote.xp)||remote.xp<0)throw Error('Invalid Sudoku journey');
      const p=structuredClone(remote);p.id=current().id;p.name=p.name.slice(0,25);
      if(!['🦊','🐻','🐰','🐸','🦄','🐼','🦁','🐧'].includes(p.avatar))p.avatar='🦊';
      const count=n=>Number.isFinite(n)?Math.floor(Math.max(0,Math.min(1e9,n))):0;
      for(const key of ['totalSeconds','hints','attempts'])p[key]=count(p[key]);
      p.completed=[...new Set(p.completed)];
      p.replays=Object.fromEntries(Object.entries(p.replays||{}).filter(([id])=>levels.some(l=>l.id===id)).map(([id,n])=>[id,count(n)]));
      const cleanRun=r=>{if(!validRun(r))return null;for(const k of ['seconds','attempts','hints'])r[k]=count(r[k]);r.notes=Object.fromEntries(Object.entries(r.notes||{}).filter(([i,v])=>/^\d+$/.test(i)&&Number(i)<r.board.length&&Array.isArray(v)).map(([i,v])=>[i,[...new Set(v.filter(n=>Number.isInteger(n)&&n>=1&&n<=r.size))]]));return r;};
      p.runs=Object.fromEntries(Object.entries(p.runs||{}).filter(([id,r])=>id===r?.levelId&&validRun(r)));
      for(const id of Object.keys(p.runs))p.runs[id]=cleanRun(p.runs[id]);
      p.run=p.run?cleanRun(p.run):null;
      const d=getData();d.profiles[d.profiles.findIndex(v=>v.id===p.id)]=p;persist();refresh();
    },
    milestones: () => current().completed.map(id=>levels.findIndex(l=>l.id===id)).filter(n=>n>=0),
  };
}
