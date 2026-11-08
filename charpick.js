// ═══ 캐릭터 개별(객체 단위) 선택 ═══
// 세계관 토글(태그) 모드는 그대로 두고, 추가로 인물 단위로 골라 무대에 올린다. 아무것도 고르지 않으면 기본(세계관 대표 태그전).
// CPICK(선택 키) 는 localStorage 에 저장. window.rebuild(teams.js 노출) 로 필드 갱신.
(function () {
  if (typeof CH === 'undefined' || typeof window.setCharPick !== 'undefined') return;
  const KEY = 'arenaCharPick';
  let CPICK = [];
  try { const a = JSON.parse(localStorage.getItem(KEY) || '[]'); if (Array.isArray(a)) CPICK = a.filter(k => CH[k]); } catch (e) { }

  const fresh = f => { f.tire = 0; f.tireLim = R(7, 12); f.fieldT = 0; f.timeLim = R(25, 45); f.swapCd = 4; };
  function fieldPick() {
    if (!CPICK.length) return;
    F.forEach(f => { if (f.model && f.model.root) f.model.root.visible = false; });
    const fs = [];
    CPICK.forEach((k, i) => { const ch = CH[k]; if (!ch) return; const f = mkF(null); f.team = ch.world; f.ti = Math.max(0, ((window.TEAMS && TEAMS[ch.world]) || []).indexOf(k)); setChar(f, ch); fresh(f); const a = i / Math.max(1, CPICK.length) * Math.PI * 2 + Math.PI / 4; f.pos.set(Math.cos(a) * 45, 0, Math.sin(a) * 30); fs.push(f); });
    if (fs.length) { F = fs; F.forEach((f, i) => { const t = F.find(x => x !== f && x.team !== f.team) || F[(i + 1) % F.length]; f.target = t; f.faceT = t; }); }
  }
  const _if = initFighters;
  initFighters = function () { const r = _if.apply(this, arguments); try { fieldPick(); } catch (e) { } return r; };

  window.CPICK = CPICK;
  window.setCharPick = keys => { CPICK = (Array.isArray(keys) ? keys : []).filter(k => CH[k]); window.CPICK = CPICK; try { localStorage.setItem(KEY, JSON.stringify(CPICK)); } catch (e) { } if (window.rebuild) rebuild(); return CPICK; };
  window.toggleCharPick = k => { const i = CPICK.indexOf(k); if (i >= 0) CPICK.splice(i, 1); else CPICK.push(k); return window.setCharPick(CPICK); };

  // ── 칩 바 UI(세계관별 인물) ──
  const bar = document.createElement('div'); bar.id = 'charBar';
  bar.style.cssText = 'margin-top:3px;display:flex;flex-wrap:wrap;gap:3px;align-items:center;font-family:inherit';
  const lbl = document.createElement('span'); lbl.textContent = '인물 직접 선택'; lbl.style.cssText = 'font-size:10px;color:#c8b89a;margin-right:2px';
  bar.appendChild(lbl);
  const chip = document.createElement('span'); chip.style.cssText = 'font-size:10px;color:#8a7a5a;margin-right:4px'; chip.id = 'charCount';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const worldKeys = Object.keys(window.TEAMS || {}).filter(w => CH[(TEAMS[w] || [])[0]]);
  worldKeys.forEach(w => { const wr = document.createElement('span'); wr.style.cssText = 'display:inline-flex;gap:3px;align-items:center;padding:0 4px;border-left:1px solid #4a3418'; const wn = document.createElement('i'); wn.textContent = (window.WORLD[w] && WORLD[w].name) || w; wn.style.cssText = 'font-style:normal;font-size:10px;color:' + ((WORLD[w] && WORLD[w].stroke) || '#e8b84a'); wr.appendChild(wn); (TEAMS[w] || []).forEach(k => { const b = document.createElement('button'); b.dataset.k = k; b.textContent = (CH[k].name || k); b.style.cssText = 'font:inherit;font-size:10px;color:#c9c2b4;background:#000a;border:1px solid #4a3418;border-radius:4px;padding:2px 5px;cursor:pointer'; wr.appendChild(b); }); bar.appendChild(wr); });
  bar.appendChild(chip);
  const clr = document.createElement('button'); clr.textContent = '선택 해제'; clr.style.cssText = 'font:inherit;font-size:10px;color:#ffcf7a;background:#000a;border:1px solid #7a5a2a;border-radius:4px;padding:2px 6px;cursor:pointer;margin-left:6px'; clr.onclick = () => { window.setCharPick([]); paint(); }; bar.appendChild(clr);
  function paint() { Array.prototype.forEach.call(bar.querySelectorAll('button[data-k]'), b => { const on = CPICK.indexOf(b.dataset.k) >= 0; b.style.background = on ? '#2a1c10' : '#000a'; b.style.borderColor = on ? '#e8b84a' : '#4a3418'; b.style.color = on ? '#fff' : '#c9c2b4'; }); chip.textContent = CPICK.length ? ('선택 ' + CPICK.length) : ''; }
  bar.onclick = e => { const b = e.target.closest('button[data-k]'); if (!b) return; window.toggleCharPick(b.dataset.k); paint(); };
  const tb = document.getElementById('teamBar'); if (tb && tb.parentNode) tb.parentNode.insertBefore(bar, tb.nextSibling); else document.body.appendChild(bar);
  paint();
  if (CPICK.length && typeof window.rebuild === 'function') { try { rebuild(); } catch (e) { } }
})();
