/* ============================================
   GAMBA中学理科 化学変化  メインJS(再構築版)
   ・ 各セクションごとに小さなチャレンジ
   ・ 練習問題は4択(別ページ)
   ============================================ */

let pageId = 'default';

document.addEventListener('DOMContentLoaded', () => {
  // body の data-page を取得
  pageId = document.body.getAttribute('data-page') || 'default';
  setupChallenges();
  setupMiniTests();
  setup4ChoiceQuestions();
  loadAllRankings();
});

// ============================================
// セクションごとのチャレンジ
// ============================================
function setupChallenges() {
  document.querySelectorAll('.challenge').forEach(ch => {
    const id = ch.getAttribute('data-ch-id');
    const startBtn = ch.querySelector('.ch-btn.start');
    const judgeBtn = ch.querySelector('.ch-btn.judge');
    const exampleBtn = ch.querySelector('.ch-btn.example');
    const resetBtn = ch.querySelector('.ch-btn.reset');
    const cancelBtn = ch.querySelector('.ch-btn.cancel');

    if (startBtn) startBtn.addEventListener('click', () => startChallenge(ch));
    if (judgeBtn) judgeBtn.addEventListener('click', () => judgeChallenge(ch));
    if (exampleBtn) exampleBtn.addEventListener('click', () => showExample(ch));
    if (resetBtn) resetBtn.addEventListener('click', () => resetChallenge(ch));
    if (cancelBtn) cancelBtn.addEventListener('click', () => cancelChallenge(ch));
  });
}

function startChallenge(ch) {
  ch.setAttribute('data-active', 'true');
  ch.setAttribute('data-start', String(Date.now()));
  ch.setAttribute('data-selected-word', '');

  // 説明文ベースのチャレンジか確認
  const targetSelector = ch.getAttribute('data-target');
  let blanks;
  if (targetSelector) {
    // 説明文ベース:指定セレクタの中の .kw-blank を空欄化
    const target = document.querySelector(targetSelector);
    if (target) {
      blanks = target.querySelectorAll('.kw-blank');
      target.classList.add('challenge-mode');
    } else {
      blanks = [];
    }
  } else {
    // 従来:.challenge 内の .blank-q を空欄化
    blanks = ch.querySelectorAll('.blank-q');
  }

  const wordList = [];
  blanks.forEach((b, idx) => {
    const ans = b.getAttribute('data-a');
    wordList.push(ans);
    b.setAttribute('data-orig', ans);
    b.setAttribute('data-orig-text', b.textContent);
    b.classList.add('blank-slot');
    b.classList.remove('blank-q', 'kw-blank');
    b.textContent = '';
    b.addEventListener('click', () => onSlotClick(ch, b));
  });

  // 語群を表示
  const wbInline = ch.querySelector('.word-bank-inline');
  const wbWords = wbInline.querySelector('.wb-words');
  wbWords.innerHTML = '';
  shuffleArray([...wordList]).forEach(w => {
    const btn = document.createElement('button');
    btn.className = 'wb-word';
    btn.textContent = w;
    btn.setAttribute('data-word', w);
    btn.addEventListener('click', () => onWordClick(ch, btn));
    wbWords.appendChild(btn);
  });
  wbInline.classList.add('show');
  document.body.classList.add('challenge-active');

  // ボタン表示切替
  ch.querySelector('.ch-btn.start').style.display = 'none';
  ch.querySelector('.ch-btn.judge').style.display = 'inline-block';
  ch.querySelector('.ch-btn.example').style.display = 'inline-block';
  ch.querySelector('.ch-btn.reset').style.display = 'inline-block';
  ch.querySelector('.ch-btn.cancel').style.display = 'inline-block';
  // タイマー表示
  const timerEl = ch.querySelector('.challenge-timer');
  if (timerEl) timerEl.style.display = 'inline-block';

  // タイマー開始
  startTimer(ch);

  // 説明文ベースの場合、説明文までスクロール
  if (targetSelector) {
    const target = document.querySelector(targetSelector);
    if (target) target.scrollIntoView({behavior:'smooth', block:'start'});
  }
}

function onWordClick(ch, btn) {
  if (ch.getAttribute('data-active') !== 'true') return;
  // 全選択解除
  ch.querySelectorAll('.wb-word').forEach(w => w.classList.remove('selected'));
  btn.classList.add('selected');
  ch.setAttribute('data-selected-word', btn.getAttribute('data-word'));
}

function onSlotClick(ch, slot) {
  if (ch.getAttribute('data-active') !== 'true') return;

  // 既に何か入っている → 戻す
  if (slot.classList.contains('filled') || slot.classList.contains('correct') || slot.classList.contains('wrong')) {
    const old = slot.textContent;
    returnWordToBank(ch, old);
    slot.textContent = '';
    slot.classList.remove('filled', 'correct', 'wrong');
    return;
  }

  // 選択中の語句を入れる
  const sel = ch.getAttribute('data-selected-word');
  if (sel) {
    slot.textContent = sel;
    slot.classList.add('filled');
    // 語群から消す
    const wbWord = ch.querySelector(`.wb-word[data-word="${cssEscape(sel)}"]:not(.used)`);
    if (wbWord) {
      wbWord.classList.add('used');
      wbWord.classList.remove('selected');
    }
    ch.setAttribute('data-selected-word', '');
  }
}

function returnWordToBank(ch, word) {
  const used = ch.querySelectorAll('.wb-word.used');
  for (const w of used) {
    if (w.getAttribute('data-word') === word) {
      w.classList.remove('used');
      break;
    }
  }
}

function judgeChallenge(ch) {
  let allCorrect = true;
  let unfilled = false;

  // 説明文ベースか確認
  const targetSelector = ch.getAttribute('data-target');
  let slots;
  if (targetSelector) {
    const target = document.querySelector(targetSelector);
    slots = target ? target.querySelectorAll('.blank-slot') : [];
  } else {
    slots = ch.querySelectorAll('.blank-slot');
  }

  slots.forEach(slot => {
    const correct = slot.getAttribute('data-orig');
    const filled = slot.textContent.trim();
    if (filled === '') {
      unfilled = true; allCorrect = false; return;
    }
    if (filled === correct) {
      slot.classList.add('correct');
      slot.classList.remove('wrong', 'filled');
    } else {
      slot.classList.add('wrong');
      slot.classList.remove('correct', 'filled');
      allCorrect = false;
    }
  });

  if (unfilled) {
    showFailToast('まだ空欄があります!すべて入れてから判定してね');
    return;
  }

  if (allCorrect) {
    onPass(ch);
  } else {
    setTimeout(() => {
      slots.forEach(slot => {
        if (slot.classList.contains('wrong')) {
          const wrong = slot.textContent;
          returnWordToBank(ch, wrong);
          slot.textContent = '';
          slot.classList.remove('wrong');
        }
      });
      showFailToast('まだ間違いがあるよ。もう一度!');
    }, 1200);
  }
}

function onPass(ch) {
  stopTimer(ch);
  const startTime = parseInt(ch.getAttribute('data-start'));
  const elapsedMs = Date.now() - startTime;
  showConfetti();
  saveRanking(ch.getAttribute('data-ch-id'), elapsedMs);
  document.getElementById('pass-time-display').textContent = formatTime(elapsedMs);
  document.getElementById('pass-overlay').classList.add('show');
  ch.setAttribute('data-active', 'false');

  // 合格時のクリーンアップは、生徒が「閉じる」を押した後にしたいので、
  // onPassでは何もしない(モーダルを閉じる時に元に戻す)
  // ただし、もう一度ボタンが押せるようボタンの状態は保持する
}

// モーダル閉じ時のクリーンアップ
function cleanupAfterPass(chId) {
  const ch = document.querySelector(`.challenge[data-ch-id="${chId}"]`);
  if (!ch) return;
  // 元の表示に戻す(キャンセルと同じ処理)
  const targetSelector = ch.getAttribute('data-target');
  let slots;
  if (targetSelector) {
    const target = document.querySelector(targetSelector);
    slots = target ? target.querySelectorAll('.blank-slot') : [];
    if (target) target.classList.remove('challenge-mode');
  } else {
    slots = ch.querySelectorAll('.blank-slot');
  }
  slots.forEach(slot => {
    const orig = slot.getAttribute('data-orig');
    const origText = slot.getAttribute('data-orig-text') || orig;
    if (targetSelector) {
      slot.classList.add('kw-blank');
    } else {
      slot.classList.add('blank-q');
    }
    slot.classList.remove('blank-slot', 'filled', 'correct', 'wrong');
    slot.textContent = origText;
  });
  const wbInline = ch.querySelector('.word-bank-inline');
  if (wbInline) wbInline.classList.remove('show');
  document.body.classList.remove('challenge-active');

  ch.querySelector('.ch-btn.start').style.display = 'inline-block';
  ch.querySelector('.ch-btn.judge').style.display = 'none';
  ch.querySelector('.ch-btn.example').style.display = 'none';
  ch.querySelector('.ch-btn.reset').style.display = 'none';
  ch.querySelector('.ch-btn.cancel').style.display = 'none';
  const timerEl = ch.querySelector('.challenge-timer');
  if (timerEl) {
    timerEl.style.display = 'none';
    timerEl.textContent = '0:00.0';
  }
}

function resetChallenge(ch) {
  const targetSelector = ch.getAttribute('data-target');
  let slots;
  if (targetSelector) {
    const target = document.querySelector(targetSelector);
    slots = target ? target.querySelectorAll('.blank-slot') : [];
  } else {
    slots = ch.querySelectorAll('.blank-slot');
  }
  slots.forEach(slot => {
    slot.textContent = '';
    slot.classList.remove('filled', 'correct', 'wrong');
  });
  ch.querySelectorAll('.wb-word').forEach(w => w.classList.remove('used', 'selected'));
  ch.setAttribute('data-selected-word', '');
}

function cancelChallenge(ch) {
  if (!confirm('チャレンジを中断します。よろしいですか?')) return;
  ch.setAttribute('data-active', 'false');
  stopTimer(ch);

  // 元に戻す(説明文ベース対応)
  const targetSelector = ch.getAttribute('data-target');
  let slots;
  if (targetSelector) {
    const target = document.querySelector(targetSelector);
    slots = target ? target.querySelectorAll('.blank-slot') : [];
    if (target) target.classList.remove('challenge-mode');
  } else {
    slots = ch.querySelectorAll('.blank-slot');
  }
  slots.forEach(slot => {
    const orig = slot.getAttribute('data-orig');
    const origText = slot.getAttribute('data-orig-text') || orig;
    if (targetSelector) {
      slot.classList.add('kw-blank');
    } else {
      slot.classList.add('blank-q');
    }
    slot.classList.remove('blank-slot', 'filled', 'correct', 'wrong');
    slot.textContent = origText;
  });
  ch.querySelector('.word-bank-inline').classList.remove('show');
  document.body.classList.remove('challenge-active');

  ch.querySelector('.ch-btn.start').style.display = 'inline-block';
  ch.querySelector('.ch-btn.judge').style.display = 'none';
  ch.querySelector('.ch-btn.example').style.display = 'none';
  ch.querySelector('.ch-btn.reset').style.display = 'none';
  ch.querySelector('.ch-btn.cancel').style.display = 'none';
  // タイマー非表示
  const timerEl = ch.querySelector('.challenge-timer');
  if (timerEl) timerEl.style.display = 'none';
}

function showExample(ch) {
  if (ch.getAttribute('data-active') !== 'true') return;
  const targetSelector = ch.getAttribute('data-target');
  let slots;
  if (targetSelector) {
    const target = document.querySelector(targetSelector);
    slots = target ? target.querySelectorAll('.blank-slot') : [];
  } else {
    slots = ch.querySelectorAll('.blank-slot');
  }
  if (slots.length === 0) return;

  // 現在の入力状態を保存(閉じたとき戻すため)
  const savedState = [];
  slots.forEach(slot => {
    savedState.push({
      text: slot.textContent,
      filled: slot.classList.contains('filled'),
      correct: slot.classList.contains('correct'),
      wrong: slot.classList.contains('wrong')
    });
  });
  ch.setAttribute('data-saved-state', JSON.stringify(savedState));

  // 全ての空欄に正答を入れて見本表示モードに
  slots.forEach(slot => {
    const ans = slot.getAttribute('data-orig');
    slot.textContent = ans;
    slot.classList.remove('filled', 'wrong', 'correct');
    slot.classList.add('example-mode');
  });

  // 説明文ボックス全体に「手本表示中」のマークを付ける
  if (targetSelector) {
    const target = document.querySelector(targetSelector);
    if (target) target.classList.add('example-showing');
  }
  document.body.classList.add('example-showing');

  // 「手本を閉じる」 帯を画面下部に表示
  let bar = document.getElementById('example-close-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'example-close-bar';
    bar.className = 'example-close-bar';
    document.body.appendChild(bar);
  }
  bar.innerHTML = `
    <div class="ecb-msg">📖 手本を表示しています(緑色の語句が正答です)</div>
    <div class="ecb-actions">
      <button class="ecb-btn primary" data-mode="resume">▶ チャレンジ継続(続きから)</button>
      <button class="ecb-btn" data-mode="reset">↻ 最初からやり直す</button>
    </div>
  `;
  bar.classList.add('show');
  bar.querySelector('.ecb-btn[data-mode="resume"]').addEventListener('click', () => {
    closeExample(ch, 'resume');
  });
  bar.querySelector('.ecb-btn[data-mode="reset"]').addEventListener('click', () => {
    closeExample(ch, 'reset');
  });

  // 説明文上部にスクロール
  if (targetSelector) {
    const target = document.querySelector(targetSelector);
    if (target) target.scrollIntoView({behavior:'smooth', block:'start'});
  }
}

function closeExample(ch, mode) {
  const targetSelector = ch.getAttribute('data-target');
  let slots;
  if (targetSelector) {
    const target = document.querySelector(targetSelector);
    slots = target ? target.querySelectorAll('.blank-slot') : [];
    if (target) target.classList.remove('example-showing');
  } else {
    slots = ch.querySelectorAll('.blank-slot');
  }

  if (mode === 'resume') {
    // 保存していた状態に戻す(続きから再開)
    let savedState = [];
    try {
      savedState = JSON.parse(ch.getAttribute('data-saved-state') || '[]');
    } catch(e) { savedState = []; }

    // まず全クリア
    slots.forEach(slot => {
      slot.classList.remove('example-mode', 'filled', 'correct', 'wrong');
      slot.textContent = '';
    });
    // 語群もすべて使える状態に戻す
    ch.querySelectorAll('.wb-word').forEach(w => w.classList.remove('used', 'selected'));

    // 保存状態を再適用
    slots.forEach((slot, i) => {
      const s = savedState[i];
      if (!s) return;
      if (s.text && s.text !== '') {
        slot.textContent = s.text;
        if (s.correct) {
          slot.classList.add('correct');
        } else {
          slot.classList.add('filled');
        }
        // 該当する語群の語を「used」にする
        const wbWord = ch.querySelector(`.wb-word[data-word="${cssEscape(s.text)}"]:not(.used)`);
        if (wbWord) wbWord.classList.add('used');
      }
    });
  } else {
    // 最初からやり直す(reset)
    slots.forEach(slot => {
      slot.classList.remove('example-mode', 'filled', 'correct', 'wrong');
      slot.textContent = '';
    });
    ch.querySelectorAll('.wb-word').forEach(w => w.classList.remove('used', 'selected'));
  }
  ch.setAttribute('data-selected-word', '');
  ch.removeAttribute('data-saved-state');

  // 帯を閉じる
  const bar = document.getElementById('example-close-bar');
  if (bar) bar.classList.remove('show');
  document.body.classList.remove('example-showing');
}

// ============================================
// タイマー(セクションごと)
// ============================================
function startTimer(ch) {
  const display = ch.querySelector('.challenge-timer');
  if (!display) return;
  const start = parseInt(ch.getAttribute('data-start'));
  const tid = setInterval(() => {
    if (ch.getAttribute('data-active') !== 'true') {
      clearInterval(tid); return;
    }
    display.textContent = formatTime(Date.now() - start);
  }, 100);
  ch.setAttribute('data-timer-id', String(tid));
}
function stopTimer(ch) {
  const tid = ch.getAttribute('data-timer-id');
  if (tid) {
    clearInterval(parseInt(tid));
    ch.removeAttribute('data-timer-id');
  }
}
function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  const milli = Math.floor((ms % 1000) / 100);
  return `${min}:${String(sec).padStart(2,'0')}.${milli}`;
}

// ============================================
// ランキング(セクションごと/localStorage)
// ============================================
function saveRanking(chId, timeMs) {
  const key = `gamba_rank_${pageId}_${chId}`;
  let list = [];
  try { list = JSON.parse(localStorage.getItem(key) || '[]'); } catch(e) {}
  list.push({ time: timeMs, date: new Date().toISOString().slice(0,10) });
  list.sort((a,b) => a.time - b.time);
  list = list.slice(0,3);
  localStorage.setItem(key, JSON.stringify(list));
  loadRanking(chId);
}
function loadRanking(chId) {
  const key = `gamba_rank_${pageId}_${chId}`;
  let list = [];
  try { list = JSON.parse(localStorage.getItem(key) || '[]'); } catch(e) {}
  const ul = document.getElementById(`ranking-${chId}`);
  if (!ul) return;
  ul.innerHTML = '';
  if (list.length === 0) {
    ul.innerHTML = '<li class="ranking-empty">まだ記録なし。チャレンジしてね!</li>';
    return;
  }
  const medals = ['🥇','🥈','🥉'];
  list.forEach((r, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="medal">${medals[i]}</span><span>第${i+1}位</span><span class="time">${formatTime(r.time)}</span><span class="date">${r.date}</span>`;
    ul.appendChild(li);
  });
}
function loadAllRankings() {
  document.querySelectorAll('[id^="ranking-"]').forEach(el => {
    const id = el.id.replace('ranking-','');
    loadRanking(id);
  });
}
function clearRanking(chId) {
  if (!confirm('このセクションの記録を削除します。よろしいですか?')) return;
  localStorage.removeItem(`gamba_rank_${pageId}_${chId}`);
  loadRanking(chId);
}

// ============================================
// 花吹雪
// ============================================
function showConfetti() {
  const colors = ['#FF8C42','#FFB300','#4CAF50','#2196F3','#E91E63','#9C27B0','#FFEB3B'];
  const c = document.getElementById('confetti');
  c.innerHTML = '';
  c.classList.add('show');
  for (let i = 0; i < 80; i++) {
    const span = document.createElement('span');
    span.style.left = Math.random() * 100 + '%';
    span.style.background = colors[Math.floor(Math.random()*colors.length)];
    span.style.animationDuration = (2 + Math.random() * 2) + 's';
    span.style.animationDelay = (Math.random() * 0.5) + 's';
    span.style.width = (8 + Math.random() * 8) + 'px';
    span.style.height = span.style.width;
    span.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
    c.appendChild(span);
  }
  setTimeout(() => c.classList.remove('show'), 5000);
}

// ============================================
// 失敗トースト
// ============================================
function showFailToast(msg) {
  const t = document.getElementById('fail-toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

// ============================================
// ミニテスト(○×・4択ミックス) ― 複数問対応
// 1つの .minitest-block 内に .minitest(○×)と .q4(4択)が混在してもOK。
// 全問答え終わったらブロック単位で正解数を集計して表示する。
// ============================================
function setupMiniTests() {
  // 各 minitest-block を処理
  document.querySelectorAll('.minitest-block').forEach(block => {
    const mtQuestions = block.querySelectorAll('.minitest');
    const q4Questions = block.querySelectorAll('.q4');
    const total = mtQuestions.length + q4Questions.length;

    // ブロック内の全問題が回答済みかチェックして、結果表示
    const checkAndShowResult = () => {
      const mtAnswered = block.querySelectorAll('.minitest[data-answered="true"]').length;
      const q4Answered = block.querySelectorAll('.q4[data-answered="true"]').length;
      if (mtAnswered + q4Answered === total) {
        // 正解数を集計
        let correctCount = 0;
        block.querySelectorAll('.minitest').forEach(q => {
          const c2 = q.getAttribute('data-correct');
          const sel = q.querySelector('.mt-c.selected');
          if (sel && sel.getAttribute('data-v') === c2) correctCount++;
        });
        block.querySelectorAll('.q4').forEach(q => {
          const c2 = q.getAttribute('data-correct');
          const sel = q.querySelector('.q4-c.selected');
          if (sel && sel.getAttribute('data-v') === c2) correctCount++;
        });
        const result = block.querySelector('.mt-block-result');
        if (result) {
          result.innerHTML = `🎯 ${total}問中 <span style="color:#FF8C42;font-size:24px;font-weight:bold;">${correctCount}</span>問 正解!`;
          result.style.display = 'block';
        }
        const reset = block.querySelector('.mt-block-reset');
        if (reset) reset.style.display = 'inline-block';
      }
    };

    // ○×問題の処理
    mtQuestions.forEach(mt => {
      const choices = mt.querySelectorAll('.mt-c');
      const correct = mt.getAttribute('data-correct');
      choices.forEach(c => {
        c.addEventListener('click', () => {
          if (mt.getAttribute('data-answered') === 'true') return;
          mt.setAttribute('data-answered', 'true');
          choices.forEach(x => {
            if (x.getAttribute('data-v') === correct) x.classList.add('correct');
          });
          if (c.getAttribute('data-v') !== correct) c.classList.add('wrong');
          c.classList.add('selected');
          const exp = mt.querySelector('.mt-exp');
          if (exp) exp.classList.add('show');
          checkAndShowResult();
        });
      });
    });

    // 4択問題の処理(ブロック内のもの)
    q4Questions.forEach(q => {
      const choices = q.querySelectorAll('.q4-c');
      const correct = q.getAttribute('data-correct');
      choices.forEach(c => {
        c.addEventListener('click', () => {
          if (q.getAttribute('data-answered') === 'true') return;
          q.setAttribute('data-answered', 'true');
          choices.forEach(x => {
            if (x.getAttribute('data-v') === correct) x.classList.add('correct');
          });
          if (c.getAttribute('data-v') !== correct) c.classList.add('wrong');
          c.classList.add('selected');
          const exp = q.querySelector('.q4-exp');
          if (exp) exp.classList.add('show');
          checkAndShowResult();
        });
      });
    });

    // やり直しボタン
    const resetBtn = block.querySelector('.mt-block-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        // ○×リセット
        mtQuestions.forEach(mt => {
          mt.removeAttribute('data-answered');
          mt.querySelectorAll('.mt-c').forEach(c => c.classList.remove('selected', 'correct', 'wrong'));
          const exp = mt.querySelector('.mt-exp');
          if (exp) exp.classList.remove('show');
        });
        // 4択リセット
        q4Questions.forEach(q => {
          q.removeAttribute('data-answered');
          q.querySelectorAll('.q4-c').forEach(c => c.classList.remove('selected', 'correct', 'wrong'));
          const exp = q.querySelector('.q4-exp');
          if (exp) exp.classList.remove('show');
        });
        const result = block.querySelector('.mt-block-result');
        if (result) result.style.display = 'none';
        resetBtn.style.display = 'none';
      });
    }
  });

  // 単独の minitest(古い形式)も従来通り処理
  document.querySelectorAll('.minitest').forEach(mt => {
    if (mt.closest('.minitest-block')) return; // ブロック内ならスキップ
    if (mt.getAttribute('data-init') === 'true') return;
    mt.setAttribute('data-init', 'true');
    const choices = mt.querySelectorAll('.mt-c');
    const correct = mt.getAttribute('data-correct');
    choices.forEach(c => {
      c.addEventListener('click', () => {
        if (mt.getAttribute('data-answered') === 'true') return;
        mt.setAttribute('data-answered', 'true');
        choices.forEach(x => {
          if (x.getAttribute('data-v') === correct) x.classList.add('correct');
        });
        if (c.getAttribute('data-v') !== correct) c.classList.add('wrong');
        c.classList.add('selected');
        const exp = mt.querySelector('.mt-exp');
        if (exp) exp.classList.add('show');
      });
    });
  });
}

// ============================================
// 4択問題(練習問題ページ用)
// minitest-block 内に置かれた .q4 は setupMiniTests 側で処理するのでスキップ
// ============================================
function setup4ChoiceQuestions() {
  document.querySelectorAll('.q4').forEach(q => {
    if (q.closest('.minitest-block')) return; // ミニテストブロック内ならスキップ
    const choices = q.querySelectorAll('.q4-c');
    const correct = q.getAttribute('data-correct');
    choices.forEach(c => {
      c.addEventListener('click', () => {
        if (q.getAttribute('data-answered') === 'true') return;
        q.setAttribute('data-answered', 'true');
        choices.forEach(x => {
          if (x.getAttribute('data-v') === correct) x.classList.add('correct');
        });
        if (c.getAttribute('data-v') !== correct) c.classList.add('wrong');
        c.classList.add('selected');
        const exp = q.querySelector('.q4-exp');
        if (exp) exp.classList.add('show');
        // 全問終わったかチェック → 結果表示(練習問題ページ用)
        const all = document.querySelectorAll('.q4:not([data-answered]), .q4');
        const standaloneQ4 = Array.from(document.querySelectorAll('.q4'))
          .filter(el => !el.closest('.minitest-block'));
        const standaloneAnswered = standaloneQ4.filter(el => el.getAttribute('data-answered') === 'true');
        if (standaloneQ4.length > 0 && standaloneQ4.length === standaloneAnswered.length) {
          showQuizResult();
        }
      });
    });
  });
}
function showQuizResult() {
  // 集計対象は minitest-block 外の .q4 のみ
  const all = Array.from(document.querySelectorAll('.q4'))
    .filter(el => !el.closest('.minitest-block'));
  let correct = 0;
  all.forEach(q => {
    const c = q.getAttribute('data-correct');
    const sel = q.querySelector('.q4-c.selected');
    if (sel && sel.getAttribute('data-v') === c) correct++;
  });
  const result = document.getElementById('quiz-result');
  if (result) {
    result.innerHTML = `🎯 ${all.length}問中 <span style="color:#FF8C42;font-size:28px;font-weight:bold;">${correct}</span>問 正解!`;
    result.style.display = 'block';
    result.scrollIntoView({behavior:'smooth', block:'center'});
  }
}

// 音声再生(プレースホルダー)
function playAudio(srcId) {
  alert('音声ファイル(四国メタンの解説)を準備中です。\n本番ではここで音声が再生されます。');
}

// CSS Escape ポリフィル
function cssEscape(s) {
  if (window.CSS && window.CSS.escape) return window.CSS.escape(s);
  return String(s).replace(/[!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~]/g, '\\$&');
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
