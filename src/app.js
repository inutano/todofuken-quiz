// src/app.js
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  function showScreen(name) {
    for (const n of ['menu','quiz','result'])
      $('screen-'+n).classList.toggle('hidden', n !== name);
  }

  const state = {
    settings: { mode:'normal', dir:'place2name', level:'easy' },
    queue: [], idx: 0, correct: 0, miss: 0,
    startMs: 0, qStartMs: 0, timerId: null,
    curPromptSolved: false,
  };

  const REC_KEY = 'jp-quiz-records-v1';
  function loadRecords(){ try { return JSON.parse(localStorage.getItem(REC_KEY)) || {}; } catch(e){ return {}; } }
  function saveRecords(){ try { localStorage.setItem(REC_KEY, JSON.stringify(records)); } catch(e){} }

  let records = loadRecords();

  // ---- メニュー ----
  const MODES = [['normal','通常（地図）'],['solo','形だけ'],['soccer','サッカー⚽']];
  const DIRS  = [['place2name','場所→名前'],['name2place','名前→場所']];
  const LEVELS= [['easy','イージー(3択)'],['hard','ハード(タイプ)']];

  function renderMenu() {
    const body = $('menu-body');
    body.innerHTML = '';
    body.appendChild(optRow('モード', MODES, 'mode'));
    const dirRow = optRow('こたえかた', DIRS, 'dir');
    const lvlRow = optRow('レベル', LEVELS, 'level');
    body.appendChild(dirRow); body.appendChild(lvlRow);

    const best = document.createElement('div');
    best.className = 'opt-label'; best.id = 'menu-best';
    body.appendChild(best);

    const start = document.createElement('button');
    start.className = 'btn'; start.style.alignSelf = 'center'; start.textContent = '▶ スタート';
    start.addEventListener('click', startGame);
    body.appendChild(start);

    function refresh() {
      // soccer はこたえかた・レベルを隠す
      const soccer = state.settings.mode === 'soccer';
      dirRow.style.display = soccer ? 'none' : '';
      lvlRow.style.display = soccer ? 'none' : '';
      // 無効組み合わせ: solo+name2place+hard → hard を無効化
      for (const b of lvlRow.querySelectorAll('button')) {
        const val = b.dataset.val;
        const test = { ...state.settings, level: val };
        const bad = !window.LOGIC.isValidCombo(test);
        b.disabled = bad; b.style.opacity = bad ? .4 : 1;
        if (bad && state.settings.level === val) { state.settings.level = 'easy'; markSel(lvlRow,'easy'); }
      }
      const rec = records[window.LOGIC.settingKey(state.settings)];
      best.textContent = rec && rec.bestTimeMs ? `ベスト: ${(rec.bestTimeMs/1000).toFixed(1)}秒` : 'ベスト: --';
    }
    function optRow(label, opts, key) {
      const wrap = document.createElement('div');
      const lab = document.createElement('div'); lab.className='opt-label'; lab.textContent=label;
      const row = document.createElement('div'); row.className='opt-row';
      for (const [val, text] of opts) {
        const b = document.createElement('button');
        b.className = 'btn' + (state.settings[key]===val ? ' sel':'');
        b.textContent = text; b.dataset.val = val;
        b.addEventListener('click', () => { state.settings[key]=val; markSel(row,val); refresh(); });
        row.appendChild(b);
      }
      wrap.appendChild(lab); wrap.appendChild(row); return wrap;
    }
    function markSel(row, val) {
      for (const b of row.querySelectorAll('button')) b.classList.toggle('sel', b.dataset.val===val);
    }
    refresh();
  }

  // ---- ゲーム開始 ----
  function seedRand() { return window.LOGIC.mulberry32((performance.now()*1000|0) ^ (Date.now()&0xffffffff)); }

  function startGame() {
    const s = state.settings;
    state.queue = window.LOGIC.buildQueue(s, PREFECTURES, JLEAGUE, seedRand());
    state.idx = 0; state.correct = 0; state.miss = 0;
    state.startMs = performance.now();
    MAP.reset();
    for (const k in answeredMarks) delete answeredMarks[k];
    // 通常/サッカーは全国地図を quiz-stage に描画
    if (s.mode === 'normal' || s.mode === 'soccer') {
      MAP.renderFull($('quiz-stage'), { onPick: onMapPick });
    }
    showScreen('quiz');
    startTimer();
    nextQuestion();
  }
  function startTimer() {
    stopTimer();
    state.timerId = setInterval(() => {
      const t = (performance.now() - state.startMs) / 1000;
      $('hud-timer').textContent = t.toFixed(1);
    }, 100);
  }
  function stopTimer(){ if (state.timerId){ clearInterval(state.timerId); state.timerId=null; } }
  function updateHud() {
    $('hud-progress').textContent = `${state.idx} / ${state.queue.length}`;
    $('hud-score').textContent = `✅${state.correct} ❌${state.miss}`;
  }

  // ---- 出題ループ ----
  const allIds = PREFECTURES.map(p => p.id);
  function prefById(id){ return PREFECTURES.find(p=>p.id===id); }

  function nextQuestion() {
    clearPrompt();
    updateHud();
    if (state.idx >= state.queue.length) return finishGame();
    state.qStartMs = performance.now();
    state.curPromptSolved = false;
    const q = state.queue[state.idx];
    const s = state.settings;
    const answer = $('quiz-answer');
    answer.innerHTML = '';

    if (s.mode === 'soccer') return renderSoccer(q);
    if (s.mode === 'normal') {
      if (s.dir === 'place2name') return renderNormalPlace2Name(q);
      return renderNormalName2Place(q);
    }
    // solo
    if (s.dir === 'place2name') return renderSoloPlace2Name(q);
    return renderSoloName2Place(q);
  }

  // 共通: 正解/不正解処理
  function onCorrect(prefId) {
    if (state.curPromptSolved) return;
    state.curPromptSolved = true;
    state.correct++;
    const p = prefById(prefId);
    const sec = (performance.now() - state.qStartMs) / 1000;
    RAIN.burst(p.emojis, window.LOGIC.emojiCountForTime(sec));
    if (state.settings.mode === 'normal' || state.settings.mode === 'soccer') {
      answeredMarks[prefId] = p.emojis[0]; MAP.markAnswered(prefId, p.emojis[0]);
    }
    state.idx++;
    setTimeout(nextQuestion, 650);
  }
  function onWrong(prefId) {
    state.miss++;
    updateHud();
    if (prefId != null && (state.settings.mode==='normal'||state.settings.mode==='soccer'))
      MAP.flashPref(prefId, 'bad');
    $('quiz-stage').classList.add('shake');
    setTimeout(()=>$('quiz-stage').classList.remove('shake'), 350);
  }

  // 3択の名前ボタンを作る（place2name 系で共通）
  function nameChoiceButtons(answerId) {
    const ids = window.LOGIC.makeChoices(answerId, allIds, seedRand());
    const wrap = $('quiz-answer');
    for (const id of ids) {
      const b = document.createElement('button');
      b.className = 'btn'; b.textContent = prefById(id).kanji;
      b.addEventListener('click', () => {
        if (id === answerId) { b.classList.add('correct-flash'); onCorrect(answerId); }
        else { b.disabled = true; b.style.opacity=.4; onWrong(null); }
      });
      wrap.appendChild(b);
    }
  }
  // タイプ入力（hard place2name 系で共通）
  function typeInput(answerId) {
    const wrap = $('quiz-answer');
    const inp = document.createElement('input');
    inp.className='type-input'; inp.type='text'; inp.placeholder='漢字でこたえてね';
    inp.autofocus = true;
    const btn = document.createElement('button'); btn.className='btn'; btn.textContent='こたえる';
    function submit(){
      if (window.LOGIC.judgeTyped(inp.value, prefById(answerId))) { onCorrect(answerId); }
      else { onWrong(null); inp.value=''; }
    }
    inp.addEventListener('keydown', e => { if (e.key==='Enter') submit(); });
    btn.addEventListener('click', submit);
    wrap.appendChild(inp); wrap.appendChild(btn); setTimeout(()=>inp.focus(),0);
  }

  // ---- 通常 × 場所→名前 ----
  function renderNormalPlace2Name(q) {
    MAP.setStates({ [q.prefId]:'target' });
    reapplyAnswered();
    if (state.settings.level === 'easy') nameChoiceButtons(q.prefId);
    else typeInput(q.prefId);
  }
  // ---- 通常 × 名前→場所 ----
  function renderNormalName2Place(q) {
    const p = prefById(q.prefId);
    setPrompt(`「${p.kanji}」はどこ？`);
    if (state.settings.level === 'easy') {
      const hints = window.LOGIC.makeMapHints(q.prefId, allIds, seedRand());
      const st = {}; hints.forEach(id => st[id]='hint');
      MAP.setStates(st); reapplyAnswered();
      MAP.setClickable(hints);
    } else {
      MAP.setStates({}); reapplyAnswered(); MAP.setClickable(null);
    }
  }
  // ---- サッカー ----
  function renderSoccer(q) {
    setPrompt(`⚽ ${q.team}\nの本拠地は？`);
    MAP.setStates({}); reapplyAnswered(); MAP.setClickable(null);
  }
  // 地図クリックの受け口（name2place / soccer）
  function onMapPick(id) {
    const q = state.queue[state.idx];
    if (!q) return;
    if (id === q.prefId) { MAP.flashPref(id,'good'); onCorrect(q.prefId); }
    else onWrong(id);
  }

  // ---- 単独（形だけ） ----
  function renderShape(container, prefId) {
    const p = prefById(prefId);
    const [x,y,w,h] = p.bbox; const pad = Math.max(w,h)*0.08;
    const svgns='http://www.w3.org/2000/svg';
    container.innerHTML='';
    const svg=document.createElementNS(svgns,'svg');
    svg.setAttribute('viewBox', `${x-pad} ${y-pad} ${w+pad*2} ${h+pad*2}`);
    svg.setAttribute('preserveAspectRatio','xMidYMid meet');
    const path=document.createElementNS(svgns,'path');
    path.setAttribute('d', p.d); path.setAttribute('fill','var(--pref-target)');
    path.setAttribute('stroke','#20305a'); path.setAttribute('stroke-width','1.5');
    svg.appendChild(path); container.appendChild(svg);
    return svg;
  }
  function renderSoloPlace2Name(q) {
    renderShape($('quiz-stage'), q.prefId);
    if (state.settings.level === 'easy') nameChoiceButtons(q.prefId);
    else typeInput(q.prefId);
  }
  function renderSoloName2Place(q) {
    // 名前を提示し、3つの形から選ぶ（easy のみ・hard は無効化済み）
    const p = prefById(q.prefId);
    setPrompt(`「${p.kanji}」のかたちは？`);
    const ids = window.LOGIC.makeChoices(q.prefId, allIds, seedRand());
    const stage = $('quiz-stage'); stage.innerHTML='';
    const rowWrap = document.createElement('div');
    rowWrap.style.display='flex'; rowWrap.style.gap='12px'; rowWrap.style.width='100%'; rowWrap.style.height='60%';
    for (const id of ids) {
      const cell = document.createElement('div');
      cell.style.flex='1'; cell.style.cursor='pointer'; cell.className='card';
      renderShape(cell, id);
      cell.addEventListener('click', () => {
        if (id===q.prefId) onCorrect(q.prefId);
        else { cell.style.opacity=.4; onWrong(null); }
      });
      rowWrap.appendChild(cell);
    }
    stage.appendChild(rowWrap);
  }

  // プロンプト表示（name2place / soccer / solo-name2place 用）
  function setPrompt(text) {
    clearPrompt();
    let host = $('quiz-answer');
    const pr = document.createElement('div'); pr.className='prompt'; pr.id='prompt-line';
    pr.style.whiteSpace='pre-line'; pr.textContent=text;
    host.parentNode.insertBefore(pr, host);
  }
  function clearPrompt(){ const p=document.getElementById('prompt-line'); if(p) p.remove(); }

  // 回答済みの県を地図に再描画（setStates で消えるため）
  const answeredMarks = {}; // prefId -> emoji
  function reapplyAnswered(){ for (const id in answeredMarks) MAP.markAnswered(+id, answeredMarks[id]); }

  // ---- リザルト ----
  function finishGame() {
    stopTimer();
    const totalMs = performance.now() - state.startMs;
    const all = state.miss === 0;
    const key = window.LOGIC.settingKey(state.settings);
    const before = (records[key] || {}).bestTimeMs ?? null;
    records = window.LOGIC.updateRecord(records, key, totalMs, all);
    saveRecords();
    const newBest = all && (before === null || totalMs < before);
    const body = $('result-body'); body.innerHTML='';
    const card = document.createElement('div'); card.className='card';
    const acc = state.queue.length ? Math.round(state.correct/(state.correct+state.miss)*100) : 0;
    card.innerHTML =
      `<p style="font-size:26px">タイム: <b>${(totalMs/1000).toFixed(1)}秒</b></p>`+
      `<p style="font-size:22px">正答率: <b>${acc}%</b>（❌${state.miss}）</p>`+
      `<p style="font-size:20px">${all?'🎉 ぜんもん正解！':'おしい！もう一度チャレンジ！'}</p>`+
      (newBest ? '<p style="font-size:22px;color:#e67e22">🏅 ベスト更新！</p>' : '');
    body.appendChild(card);
    const again=document.createElement('button'); again.className='btn'; again.textContent='もう一度';
    again.addEventListener('click', startGame);
    const menu=document.createElement('button'); menu.className='btn'; menu.textContent='メニューへ';
    menu.addEventListener('click', ()=>{ renderMenu(); showScreen('menu'); });
    body.appendChild(again); body.appendChild(menu);
    if (all) RAIN.burst(['🎉','⭐','🏆','✨'], 90);
    showScreen('result');
  }

  window.APP = { showScreen };
  document.addEventListener('DOMContentLoaded', () => { renderMenu(); showScreen('menu'); });
})();
