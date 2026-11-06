// 시스템/조작 개선층: ① viewBar 에 연출 토글 단추(빛효과·위험오라·체력바) ② 전투 통계 HUD(F/AI/TACTICS/HP 카운터, K 로 여닫기) ③ 키보드 단축키 — 아무 게임 로직도 고치지 않고 공개된 set/on 스타터와 st 카운터만 읽는다.
// 단축키: F=빛_EFFECT(lightfx) · G=위험오라(fx-danger) · H=체력바(hp) · K=전투통계 패널
(function () {
  if (typeof F === 'undefined') return;
  const SYS = window.SYSSYS = { st: {} };
  const on = o => !!(o && o.on);
  // ── 전투 통계 패널 ──
  const css = document.createElement('style');
  css.textContent = `#sysStat{position:absolute;right:8px;bottom:8px;z-index:7;display:none;background:rgba(8,6,12,.82);border:1px solid #5a7ac8;border-radius:6px;padding:6px 9px;font:600 10px/1.55 'Noto Sans KR',monospace;color:#cfe0ff;pointer-events:none;white-space:pre;max-width:46vw;max-height:70vh;overflow:hidden}
#sysStat.show{display:block}
#sysStat b{color:#ffd27a}`;
  document.head.appendChild(css);
  const stage = document.getElementById('stage');
  const panel = document.createElement('div'); panel.id = 'sysStat';
  if (stage) stage.appendChild(panel);
  const pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '-';
  function statsText() {
    const L = window.LIGHTFX && LIGHTFX.st, A = window.AIFSM && AIFSM.st, T = window.TACTICS && TACTICS.st, H = window.HP && HP.st, D = window.FXDANGER && FXDANGER.st, B = window.BUFFS;
    const def = T && T.def;
    const rows = [];
    if (A) rows.push(`<b>AI</b> 재계획:${A.watchdog || 0} 표적변경:${A.retarget || 0} 시야회피:${A.losRepos || 0} 겹침분리:${A.sepFix || 0} AI평균:${Math.round((window.AIFSM.ms || 0) * 10) / 10}ms`);
    if (T && def) { const att = T.def.attempts || 0; rows.push(`<b>전술</b> 방어시도:${att} 회피:${def.evade} 가드:${def.guard} 쳐내기:${def.parry} 탈출:${def.escape} 반사:${def.reflect} | 성공률 ${pct((def.evade || 0) + (def.guard || 0) + (def.parry || 0) + (def.escape || 0), att)}`);
      rows.push(`<b>필살</b> 맞받아치기:${T.ult.counter} 끊기:${T.ult.interrupt} 상쇄승:${T.clash.win} 무승부:${T.clash.draw} 시전차단:${T.castDrop || 0}`); }
    if (H) rows.push(`<b>체력</b> 적중:${H.hits} 카운터:${H.counter} 가드천:${H.chip} K.O.:${H.ko} 교대:${H.swaps} 회복:${H.heal}${B && B._adr ? ' 아드레날린:' + B._adr : ''}`);
    if (L) rows.push(`<b>연출</b> 광원:${L.light} 화면:${L.edge} 강한번쩍임:${L.strong} 차단:${L.blocked} 대시흐림:${L.dash}`);
    if (D) rows.push(`<b>위험</b> 위험오라활성:${D.active}`);
    rows.push(`<b>운영</b> F:빛 G:오라 H:체력바 K:통계`);
    return rows.join('\n');
  }
  SYS.statsOn = false;
  SYS.stats = () => { SYS.statsOn = !SYS.statsOn; panel.classList.toggle('show', SYS.statsOn); };
  setInterval(() => { if (SYS.statsOn) { try { panel.innerHTML = statsText(); } catch (e) { panel.textContent = '통계 오류: ' + e.message; } } }, 1000);
  const bar = document.getElementById('viewBar');
  function syncBtns() { if (!bar) return; let lsOff = false; try { lsOff = localStorage.getItem('arenaLightFx') === '0'; } catch (e) { } const sfxAssetsLive = (window.SFX && (SFX.decN || 0) >= Math.max(6, (SFX.total || 0) * .15)); bar.querySelectorAll('button[data-k]').forEach(b => { const k = b.dataset.k; const st = k === 'f' ? on(window.LIGHTFX) : k === 'g' ? (on(window.FXDANGER) && !lsOff) : k === 'r' ? (on(window.SFXREAL) && !sfxAssetsLive) : on(window.HP); b.className = st ? 'on' : ''; }); }
  if (bar) {
    const sep = document.createElement('span'); sep.className = 'vt'; sep.textContent = '연출'; bar.appendChild(sep);
    if (window.LIGHTFX && typeof LIGHTFX.set === 'function') { const b = document.createElement('button'); b.type = 'button'; b.textContent = '빛'; b.title = '화면 빛·플래시 효과 켜기/끄기 (F)'; b.dataset.k = 'f'; b.onclick = () => { try { LIGHTFX.set(!LIGHTFX.on); } catch (e) { } syncBtns(); }; bar.appendChild(b); }
    if (window.FXDANGER && typeof FXDANGER.set === 'function') { const b = document.createElement('button'); b.type = 'button'; b.textContent = '오라'; b.title = '위험 국면 붉은 오라·비네트 켜기/끄기 (G)'; b.dataset.k = 'g'; b.onclick = () => { try { FXDANGER.set(!FXDANGER.on); } catch (e) { } syncBtns(); }; bar.appendChild(b); }
    if (window.HP) { const b = document.createElement('button'); b.type = 'button'; b.textContent = '체력'; b.title = '위 체력바 켜기/끄기 (H)'; b.dataset.k = 'h'; b.onclick = () => { try { HP.on = !HP.on; if (!HP.on && HP.draw) HP.draw(); } catch (e) { } syncBtns(); }; bar.appendChild(b); }
    if (window.SFXREAL && typeof SFXREAL.set === 'function') { const b = document.createElement('button'); b.type = 'button'; b.textContent = '실감음'; b.title = '합성 타격음(녹음 자산 없을 때 자동) 켜기/끄기 (R)'; b.dataset.k = 'r'; b.onclick = () => { try { SFXREAL.set(!SFXREAL.on); } catch (e) { } syncBtns(); }; bar.appendChild(b); }
    syncBtns();
  }
  // ── 키보드 단축키(입력상·선택 상의 입력은 무시) ──
  addEventListener('keydown', e => {
    if (e.repeat) return; // 길누르기 자동반복 → 연출 점멸 방지
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    const t = e.target && e.target.tagName; if (t === 'INPUT' || t === 'SELECT' || t === 'TEXTAREA') return;
    const k = (e.key || '').toLowerCase();
    if (k === 'k') { SYS.stats(); }
    else if (k === 'f' && window.LIGHTFX && typeof LIGHTFX.set === 'function') { LIGHTFX.set(!LIGHTFX.on); }
    else if (k === 'g' && window.FXDANGER && typeof FXDANGER.set === 'function') { FXDANGER.set(!FXDANGER.on); }
    else if (k === 'h' && window.HP) { HP.on = !HP.on; if (!HP.on && HP.draw) HP.draw(); }
    else if (k === 'r' && window.SFXREAL && typeof SFXREAL.set === 'function') { SFXREAL.set(!SFXREAL.on); }
    else return;
    e.preventDefault();
    syncBtns();
  });
})();
