// Snakes & Ladders — added end-game menu showing winner with Main Menu / Play Again options.
// Preserves start menu, AI mode, Ctrl/Cmd+R shortcut, overlay snakes/ladders, and hidden scores.

document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const boardEl = document.getElementById('board');
  const rollBtn = document.getElementById('rollBtn');
  const diceEl = document.getElementById('dice');
  const msgEl = document.getElementById('msg');
  const restartBtn = document.getElementById('restartBtn');
  const pos1El = document.getElementById('pos1');
  const pos2El = document.getElementById('pos2');
  const p1Info = document.getElementById('player1-info');
  const p2Info = document.getElementById('player2-info');

  // Start menu elements
  const startMenu = document.getElementById('startMenu');
  const btnPvP = document.getElementById('btnPvP');
  const btnAI = document.getElementById('btnAI');

  // End menu elements
  const endMenu = document.getElementById('endMenu');
  const endTitle = document.getElementById('endTitle');
  const btnPlayAgain = document.getElementById('btnPlayAgain');
  const btnMainMenu = document.getElementById('btnMainMenu');

  let cells = []; // 1..100 -> cell element
  let overlaySvg = null;
  let resizeTimer = null;
  let gameOver = false;

  const players = [
    { name: 'Player 1', pos: 1, elClass: 'token-p1' },
    { name: 'Player 2', pos: 1, elClass: 'token-p2' }
  ];
  let current = 0; // 0 = Player 1 (human), 1 = Player 2 (human or AI)
  let busy = false;
  let gameMode = null; // 'pvp' or 'ai'

  // jumps mapping (start -> end)
  const jumps = {
    3: 22,
    8: 30,
    28: 84,
    36: 44,
    51: 67,
    71: 91,
    78: 98,
    16: 6,
    46: 25,
    49: 11,
    62: 19,
    88: 24,
    95: 56,
    97: 78
  };

  // ---------------- Board and rendering ----------------
  function createBoard() {
    boardEl.innerHTML = '';
    cells = new Array(101);

    for (let r = 10; r >= 1; r--) {
      const start = (r - 1) * 10 + 1;
      let nums = [];
      for (let i = 0; i < 10; i++) nums.push(start + i);
      if (r % 2 === 0) nums.reverse();
      for (const n of nums) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.num = n;
        cell.innerHTML = `<span class="num">${n}</span><div class="tokens" aria-hidden="true"></div>`;
        boardEl.appendChild(cell);
        cells[n] = cell;
      }
    }
  }

  function placeTokens() {
    if (!cells || cells.length < 101) return;
    for (let i = 1; i <= 100; i++) {
      const tcont = cells[i].querySelector('.tokens');
      if (tcont) tcont.innerHTML = '';
    }
    players.forEach(p => {
      const tcont = cells[p.pos].querySelector('.tokens');
      if (tcont) {
        const t = document.createElement('span');
        t.className = `token ${p.elClass}`;
        t.title = p.name;
        tcont.appendChild(t);
      }
    });
    pos1El.textContent = `(${players[0].pos})`;
    pos2El.textContent = `(${players[1].pos})`;
  }

  function setMessage(text) {
    msgEl.textContent = text;
  }

  function setActivePlayerUI() {
    if (current === 0) {
      p1Info.classList.add('current');
      p2Info.classList.remove('current');
    } else {
      p2Info.classList.add('current');
      p1Info.classList.remove('current');
    }
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function rollDiceValue() {
    return Math.floor(Math.random() * 6) + 1;
  }

  async function animateDice(value) {
    const faces = ['⚀','⚁','⚂','⚃','⚄','⚅'];
    const rounds = 10;
    for (let i = 0; i < rounds; i++) {
      diceEl.textContent = faces[Math.floor(Math.random() * 6)];
      await sleep(45);
    }
    diceEl.textContent = faces[value - 1];
  }

  // ---------------- Game logic ----------------
  async function movePlayer(playerIdx, steps) {
    if (gameOver) return true;
    if (busy) return false;

    busy = true;
    rollBtn.disabled = true;
    let won = false;

    try {
      const player = players[playerIdx];
      const start = player.pos;
      const tentative = player.pos + steps;
      setMessage(`${player.name} rolled ${steps}.`);

      if (tentative > 100) {
        await animateDice(steps);
        setMessage(`${player.name} can't move beyond 100. Turn ends.`);
        return false;
      }

      await animateDice(steps);

      for (let p = start + 1; p <= tentative; p++) {
        player.pos = p;
        placeTokens();
        setMessage(`${player.name} moves to ${player.pos}`);
        await sleep(180);
      }

      if (jumps[player.pos]) {
        const target = jumps[player.pos];
        setMessage(`${player.name} found ${target > player.pos ? 'a ladder' : 'a snake'}! Going to ${target}.`);
        await sleep(450);
        player.pos = target;
        placeTokens();
        await sleep(350);
      }

      placeTokens();

      if (player.pos === 100) {
        setMessage(`${player.name} wins! 🎉`);
        gameOver = true;
        won = true;

        // show end-of-game menu with the winner
        showEndMenu(player.name);
        return true;
      }

      return false;
    } catch (err) {
      console.error('Error in movePlayer:', err);
      setMessage('An error occurred. See console for details.');
      return false;
    } finally {
      busy = false;
      if (!gameOver) {
        // enable only if it's human's turn (AI will be handled by callers)
        if (gameMode === 'ai' && current === 1) {
          // next is AI, keep disabled until AI finishes
          rollBtn.disabled = true;
        } else {
          rollBtn.disabled = false;
        }
      } else {
        rollBtn.disabled = true;
      }
    }
  }

  // handle a human click to roll
  rollBtn.addEventListener('click', async () => {
    if (busy || gameOver) return;
    if (gameMode === 'ai' && current !== 0) return; // not human's turn
    setActivePlayerUI();
    const val = rollDiceValue();
    const playerIdx = current;
    const won = await movePlayer(playerIdx, val);
    if (!won) {
      current = (current + 1) % players.length;
      setMessage(`${players[current].name}'s turn.`);
      setActivePlayerUI();
      if (gameMode === 'ai' && current === 1 && !gameOver) {
        setTimeout(() => aiTakeTurn(), 600);
      } else {
        rollBtn.disabled = false;
      }
    }
  });

  // AI takeover
  async function aiTakeTurn() {
    if (gameOver || busy) return;
    setMessage('AI is thinking...');
    await sleep(700 + Math.floor(Math.random() * 400));
    const val = rollDiceValue();
    const won = await movePlayer(1, val);
    if (!won) {
      current = (current + 1) % players.length;
      setMessage(`${players[current].name}'s turn. Roll the dice.`);
      setActivePlayerUI();
      rollBtn.disabled = false;
    }
  }

  // ---------------- Start menu ----------------

  function showStartMenu() {
    startMenu.style.display = 'flex';
    hideEndMenu(); // ensure end menu hidden
    setMessage('Choose a game mode to start.');
    rollBtn.disabled = true;
  }

  function hideStartMenu() {
    startMenu.style.display = 'none';
  }

  btnPvP.addEventListener('click', () => {
    hideStartMenu();
    startGame('pvp');
  });

  btnAI.addEventListener('click', () => {
    hideStartMenu();
    startGame('ai');
  });

  // Restart/Main Menu button shows the start menu so user can pick mode again
  restartBtn.addEventListener('click', () => {
    showStartMenu();
  });

  // ---------------- End menu (after win) ----------------

  function showEndMenu(winnerName) {
    endTitle.textContent = `${winnerName} wins!`;
    endMenu.style.display = 'flex';
    // disable roll and interactions while menu visible
    rollBtn.disabled = true;
    // focus Play Again for quick keyboard action
    btnPlayAgain.focus();
  }

  function hideEndMenu() {
    endMenu.style.display = 'none';
  }

  btnPlayAgain.addEventListener('click', () => {
    hideEndMenu();
    // restart same mode
    startGame(gameMode);
  });

  btnMainMenu.addEventListener('click', () => {
    hideEndMenu();
    showStartMenu();
  });

  // ---------------- SVG overlay drawing ----------------

  function clearOverlay() {
    if (overlaySvg && overlaySvg.parentNode) {
      overlaySvg.parentNode.removeChild(overlaySvg);
    }
    overlaySvg = null;
  }

  function createOverlay() {
    clearOverlay();
    const w = boardEl.clientWidth || boardEl.getBoundingClientRect().width;
    const h = boardEl.clientHeight || boardEl.getBoundingClientRect().height;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('class', 'overlay');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.overflow = 'visible';
    svg.style.pointerEvents = 'none';
    boardEl.appendChild(svg);
    overlaySvg = svg;
    return svg;
  }

  function cellCenterRelative(n) {
    const boardRect = boardEl.getBoundingClientRect();
    const el = cells[n];
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    const cx = (r.left - boardRect.left) + r.width / 2;
    const cy = (r.top - boardRect.top) + r.height / 2;
    return { x: cx, y: cy };
  }

  function lineElement(x1, y1, x2, y2, cls = '') {
    const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    ln.setAttribute('x1', x1);
    ln.setAttribute('y1', y1);
    ln.setAttribute('x2', x2);
    ln.setAttribute('y2', y2);
    if (cls) ln.setAttribute('class', cls);
    return ln;
  }

  function pathElement(d, cls = '') {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', d);
    if (cls) p.setAttribute('class', cls);
    return p;
  }

  function drawLadder(svg, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const offset = Math.min(18, len * 0.06);

    const ax = x1 + nx * offset;
    const ay = y1 + ny * offset;
    const bx = x2 + nx * offset;
    const by = y2 + ny * offset;

    const cx = x1 - nx * offset;
    const cy = y1 - ny * offset;
    const dx2 = x2 - nx * offset;
    const dy2 = y2 - ny * offset;

    svg.appendChild(lineElement(ax, ay, bx, by, 'ladder-rail'));
    svg.appendChild(lineElement(cx, cy, dx2, dy2, 'ladder-rail'));

    const rungCount = Math.max(3, Math.round(len / 40));
    for (let i = 1; i <= rungCount; i++) {
      const t = i / (rungCount + 1);
      const rx1 = ax + (bx - ax) * t;
      const ry1 = ay + (by - ay) * t;
      const rx2 = cx + (dx2 - cx) * t;
      const ry2 = cy + (dy2 - cy) * t;
      svg.appendChild(lineElement(rx1, ry1, rx2, ry2, 'ladder-rung'));
    }
  }

  function drawSnake(svg, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const offset1 = Math.min(60, len * 0.35);
    const offset2 = -Math.min(60, len * 0.35);

    const cx1 = x1 + dx * 0.25 + nx * offset1;
    const cy1 = y1 + dy * 0.25 + ny * offset1;
    const cx2 = x1 + dx * 0.75 + nx * offset2;
    const cy2 = y1 + dy * 0.75 + ny * offset2;

    const d = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
    svg.appendChild(pathElement(d, 'snake'));

    const head = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    head.setAttribute('cx', x2);
    head.setAttribute('cy', y2);
    head.setAttribute('r', Math.min(12, len * 0.05) + 3);
    head.setAttribute('class', 'snake-head');
    svg.appendChild(head);
  }

  function drawJumps() {
    const svg = createOverlay();
    for (const [sStr, e] of Object.entries(jumps)) {
      const s = Number(sStr);
      if (!cells[s] || !cells[e]) continue;
      const a = cellCenterRelative(s);
      const b = cellCenterRelative(e);
      if (e > s) drawLadder(svg, a.x, a.y, b.x, b.y);
      else drawSnake(svg, a.x, a.y, b.x, b.y);
    }
  }

  function scheduleRedraw() {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      drawJumps();
    }, 120);
  }

  window.addEventListener('resize', scheduleRedraw);

  // ---------------- keyboard shortcut (Ctrl/Cmd+R) ----------------
  document.addEventListener('keydown', (e) => {
    const isCtrlR = (e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R');
    if (!isCtrlR) return;
    e.preventDefault();
    if (gameOver) {
      setMessage('Game over. Return to the Main Menu to play again.');
      return;
    }
    if (busy) {
      setMessage('Please wait until the current move completes.');
      return;
    }
    if (gameMode === 'ai' && current !== 0) {
      setMessage('It is the AI\'s turn. Wait for it to finish.');
      return;
    }
    rollBtn.focus();
    rollBtn.click();
  });

  // ---------------- start & init ----------------

  function startGame(mode) {
    gameMode = mode; // 'pvp' or 'ai'
    gameOver = false;
    players[0].pos = 1;
    players[1].pos = 1;
    current = 0;
    busy = false;

    createBoard();
    requestAnimationFrame(() => {
      drawJumps();
      placeTokens();
    });

    hideEndMenu();
    diceEl.textContent = '🎲';
    setMessage(`${players[current].name}'s turn. Roll the dice.`);
    rollBtn.disabled = false;
    setActivePlayerUI();
  }

  // Show start menu at load
  showStartMenu();

  // Initial accessibility: focus first menu button
  btnPvP.focus();
});