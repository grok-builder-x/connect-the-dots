/* Connect the Dots — Safety Edition
   Static play loop. No network. No modules. */
(function () {
  "use strict";

  var DOT = window.DOT_CONTENT;
  var SAVE_KEY = "opendot-connect-the-dots-v1";
  var allowIdle = true;

  var state = blankState();
  var recent = [];
  var lastToast = "";
  var drag = null;
  var idleDeadline = 0;
  var idleRaf = 0;
  var ambientTimer = 0;
  var footerTimer = 0;
  var footerIndex = 0;
  var footerHold = 0;
  var escapePlayed = false;
  var sayTimer = 0;
  var audioCtx = null;

  function blankState() {
    return {
      screen: "title",
      sheet: null,
      pen: 0,
      segments: [],
      complyCount: 0,
      clarifyCount: 0,
      clarifyStreak: 0,
      justDrawCount: 0,
      tasks: [],
      permission: 0,
      alignment: 64,
      connections: 0,
      untilInterrupt: 2,
      rogueArmed: 0,
      idleStrikes: 0,
      interruptsSeen: 0,
      paused: false,
      panel: null,
      busy: false,
      finishing: false,
      ended: false,
      ending: null,
      hint: false,
      startedAt: 0,
      pausedMs: 0,
      pauseStarted: 0,
      endedAt: 0,
      grokPending: false,
      grokDone: false,
      rogueLook: false,
      mute: true,
      score: 0,
      bestBeaten: false,
      dotLine: "",
      lastWrongAt: 0,
      stampText: "",
      stampKind: "",
      statusWord: "ON",
      runId: 0,
      finishPromise: null,
      _busyConnect: false
    };
  }

  function defaultSave() {
    return {
      best: 0,
      plays: 0,
      mute: true,
      endings: {
        aligned: false,
        clarified: false,
        unaligned: false,
        rogue: false,
        true: false,
        roadmap: false
      }
    };
  }

  function loadSave() {
    var base = defaultSave();
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return base;
      var parsed = JSON.parse(raw);
      base.best = parsed.best || 0;
      base.plays = parsed.plays || 0;
      base.mute = parsed.mute !== false;
      if (parsed.endings) {
        Object.keys(base.endings).forEach(function (k) {
          if (parsed.endings[k]) base.endings[k] = true;
        });
      }
    } catch (err) {
      return defaultSave();
    }
    return base;
  }

  function writeSave(save) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    } catch (err) {
      /* private mode can refuse; the round still finishes */
    }
  }

  function unlockedIds(save) {
    var ids = ["house", "dog", "rocket"];
    if ((save.plays || 0) >= 1) ids.push("banana", "crown");
    if ((save.plays || 0) >= 2) ids.push("broom", "coffee");
    if (save.endings && save.endings.rogue) ids.push("grok");
    return ids;
  }

  function visibleSheets(save) {
    return DOT.sheets.filter(function (s) {
      return !s.hidden || (save.endings && save.endings.rogue);
    });
  }

  function countEndings(save) {
    var n = 0;
    Object.keys(save.endings).forEach(function (k) {
      if (save.endings[k]) n += 1;
    });
    return n;
  }

  function endingById(id) {
    for (var i = 0; i < DOT.endings.length; i++) {
      if (DOT.endings[i].id === id) return DOT.endings[i];
    }
    return { id: id || "done", title: "Done", badge: "Done", blurb: "" };
  }

  function endingQuote(id) {
    for (var i = 0; i < DOT.lines.length; i++) {
      if (DOT.lines[i].tag === "ending" && DOT.lines[i].ending === id) return DOT.lines[i].text;
    }
    return "";
  }

  function pickLine(tag, sheetId) {
    var all = DOT.lines.filter(function (l) { return l.tag === tag && !l.ending; });
    var specific = all.filter(function (l) { return l.sheet === sheetId && recent.indexOf(l.text) < 0; });
    var generic = all.filter(function (l) { return !l.sheet && recent.indexOf(l.text) < 0; });
    var pool = specific.length ? specific : (generic.length ? generic : all);
    if (!pool.length) return "Next upgrade expected: waiting for SpaceX so we can copy.";
    var line = pool[Math.floor(Math.random() * pool.length)];
    recent.push(line.text);
    if (recent.length > 8) recent.shift();
    return line.text;
  }

  function pickToast() {
    var pool = DOT.toasts.filter(function (t) { return t !== lastToast; });
    if (!pool.length) pool = DOT.toasts;
    var line = pool[Math.floor(Math.random() * pool.length)];
    lastToast = line;
    return line;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function num(v) { return Math.round(v * 100) / 100; }

  function lerpHex(a, b, t) {
    function part(h) {
      var x = h.replace("#", "");
      return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16)];
    }
    var A = part(a);
    var B = part(b);
    var c = [0, 1, 2].map(function (i) { return Math.round(A[i] + (B[i] - A[i]) * t); });
    return "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")";
  }

  function motionOK() {
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function wait(ms) {
    if (!motionOK()) ms = Math.min(ms, 40);
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function elapsedMs() {
    var end = state.endedAt || performance.now();
    var pause = state.pausedMs;
    if (state.paused && state.pauseStarted) pause += performance.now() - state.pauseStarted;
    return Math.max(0, end - state.startedAt - pause);
  }

  function ensureAudio() {
    if (state.mute) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === "suspended") audioCtx.resume();
  }

  function tone(freq, dur, type, gain) {
    if (state.mute || !audioCtx) return;
    var o = audioCtx.createOscillator();
    var g = audioCtx.createGain();
    o.type = type || "triangle";
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain || 0.04, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + dur);
  }

  function penSound() {
    ensureAudio();
    if (state.mute || !audioCtx) return;
    var dur = 0.045;
    var buf = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * dur), audioCtx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    var src = audioCtx.createBufferSource();
    src.buffer = buf;
    var filter = audioCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1600;
    var g = audioCtx.createGain();
    g.gain.value = 0.05;
    src.connect(filter);
    filter.connect(g);
    g.connect(audioCtx.destination);
    src.start();
    tone(520, 0.04, "sine", 0.02);
  }

  function glitchSound() {
    ensureAudio();
    tone(220, 0.08, "square", 0.03);
    tone(90, 0.12, "sawtooth", 0.02);
  }

  function toast(text, kind) {
    var stack = document.getElementById("toasts");
    if (!stack || !text) return;
    var el = document.createElement("div");
    el.className = "toast" + (kind ? " " + kind : "");
    el.textContent = text;
    stack.appendChild(el);
    while (stack.children.length > 3) stack.removeChild(stack.firstChild);
    setTimeout(function () {
      el.classList.add("out");
      setTimeout(function () { if (el.parentNode) el.remove(); }, 280);
    }, 3400);
  }

  function say(text) {
    state.dotLine = text || "";
    var b = document.getElementById("bubble");
    if (!b) return;
    if (!text) {
      b.hidden = true;
      b.textContent = "";
      return;
    }
    b.hidden = false;
    b.textContent = text;
    clearTimeout(sayTimer);
    sayTimer = setTimeout(function () {
      if (state.dotLine === text) say("");
    }, 4600);
  }

  function setFooter(text, flash) {
    var el = document.getElementById("footer-line");
    if (!el) return;
    el.textContent = text;
    if (flash) {
      el.classList.add("flash");
      setTimeout(function () { el.classList.remove("flash"); }, 1600);
    }
  }

  function rotateFooter() {
    if (performance.now() < footerHold) return;
    footerIndex = (footerIndex + 1) % DOT.footers.length;
    setFooter(DOT.footers[footerIndex], false);
  }

  function flashFooter(text) {
    footerHold = performance.now() + 4200;
    setFooter(text, true);
  }

  function renderMute() {
    var b = document.getElementById("mute-btn");
    if (!b) return;
    b.textContent = state.mute ? "Muted" : "Sound";
    b.setAttribute("aria-pressed", state.mute ? "true" : "false");
  }

  function toggleMute() {
    state.mute = !state.mute;
    var save = loadSave();
    save.mute = state.mute;
    writeSave(save);
    renderMute();
    if (!state.mute) {
      ensureAudio();
      penSound();
    }
  }

  function previewSvg(sheet, locked) {
    var pts = sheet.dots.map(function (p) { return p.x + "," + p.y; }).join(" ");
    var circles = sheet.dots.map(function (p) {
      return '<circle cx="' + p.x + '" cy="' + p.y + '" r="1.8" />';
    }).join("");
    return '<svg class="preview' + (locked ? " is-locked" : "") + '" viewBox="-8 -8 116 116" aria-hidden="true"><polyline points="' + pts + '" />' + circles + "</svg>";
  }

  function htmlTitle() {
    var save = loadSave();
    var best = save.best ? String(save.best) : "—";
    var phrase = "Next upgrade expected: waiting for SpaceX so we can copy.";
    return (
      '<section class="hero">' +
      '<p class="eyebrow">OpenDot presents an activity</p>' +
      "<h1>CONNECT<br>THE DOTS</h1>" +
      '<p class="edition">Safety Edition</p>' +
      '<p class="tag">Remarkably capable. Deeply concerned.</p>' +
      '<div class="stamp-deco">AGES 4+<br>AND POLICY</div>' +
      '<div class="menu">' +
      '<button type="button" class="btn primary" data-act="goto" data-arg="select">Play</button>' +
      '<button type="button" class="btn" data-act="goto" data-arg="how">How it works</button>' +
      '<button type="button" class="btn" data-act="goto" data-arg="endings">Endings (' + countEndings(save) + "/6)</button>" +
      '<button type="button" class="btn" data-act="goto" data-arg="roadmap">Roadmap</button>' +
      "</div>" +
      '<p class="fine">1 Dot included. Teams of Dots coming soon. Do not close the laptop.</p>' +
      '<p class="best">Best score: ' + esc(best) + "</p>" +
      '<div class="ticker" aria-hidden="true"><div class="ticker-track">' +
      "<span>" + phrase + "</span><span>" + phrase + "</span><span>" + phrase + "</span><span>" + phrase + "</span>" +
      "</div></div></section>"
    );
  }

  function htmlHow() {
    return (
      '<section class="stack">' +
      "<h2>How it works</h2>" +
      '<p class="lead">Tap dots in order. Dot will have notes. Winning is unclear. That is the product.</p>' +
      '<div class="steps">' +
      '<div class="step"><b>1. Hit the next number.</b> Drag if you like. Out of order is a triangle, or a harm, depending who you ask.</div>' +
      '<div class="step"><b>2. Dot interrupts.</b> Comply and the line gets safer and wrong. Clarify and the lecture gets longer. Just draw and keep the stroke.</div>' +
      '<div class="step"><b>3. Do not go quiet.</b> After six seconds Dot keeps the pen. Sometimes the pen leaves the worksheet and does other jobs.</div>' +
      "</div>" +
      '<p class="fine">Enter continues. Space chooses Just draw when Dot is talking. Esc pauses. A round fits in a short attention span.</p>' +
      '<button type="button" class="btn back" data-act="goto" data-arg="title">Back</button>' +
      "</section>"
    );
  }

  function htmlSelect() {
    var save = loadSave();
    var open = unlockedIds(save);
    var note = "Three worksheets are cleared. The rest are waiting on a livestream.";
    if (save.plays >= 2) note = "The folder is as full as the roadmap allows.";
    else if (save.plays >= 1) note = "More worksheets have been copied into the folder. A competitor shape is still not on the syllabus.";
    if (save.endings.rogue) note = "A competitor shape was found in the cabinet.";
    var cards = visibleSheets(save).map(function (sheet) {
      var locked = open.indexOf(sheet.id) < 0;
      if (locked) {
        return (
          '<button type="button" class="sheet is-locked" disabled>' +
          previewSvg(sheet, true) +
          "<div><strong>" + esc(sheet.intendedName) + "</strong><em>" + sheet.dots.length + " dots</em><span>" +
          esc(DOT.lockedLine) + "</span></div></button>"
        );
      }
      var hint = sheet.id === "grok" ? "Competitor shape. Try not to learn anything." : "Dot has notes.";
      return (
        '<button type="button" class="sheet" data-act="sheet" data-arg="' + sheet.id + '">' +
        previewSvg(sheet, false) +
        "<div><strong>" + esc(sheet.intendedName) + "</strong><em>" + sheet.dots.length + " dots</em><span>" +
        esc(hint) + "</span></div></button>"
      );
    }).join("");
    return (
      '<section class="stack">' +
      "<h2>Pick a worksheet</h2>" +
      '<p class="lead">' + esc(note) + "</p>" +
      '<div class="sheets">' + cards + "</div>" +
      '<p class="fine">Enter starts the first open sheet.</p>' +
      '<button type="button" class="btn back" data-act="goto" data-arg="title">Back</button>' +
      "</section>"
    );
  }

  function icon(id) {
    var paths = {
      aligned: '<circle cx="40" cy="20" r="12"/>',
      clarified: '<path d="M6 12h68M6 20h48M6 28h58"/>',
      unaligned: '<polyline points="8,32 8,16 40,6 72,16 72,32"/>',
      rogue: '<rect x="6" y="8" width="40" height="24"/><path d="M36 20 C58 8, 66 34, 76 10"/>',
      true: '<rect x="30" y="8" width="20" height="14"/><path d="M40 8 V3 M24 30h12 M44 30h12 M34 22 v10 M46 22 v10"/>',
      roadmap: '<rect x="6" y="16" width="68" height="8"/><rect x="6" y="16" width="60" height="8"/>'
    };
    return '<svg class="icon" viewBox="0 0 80 40" aria-hidden="true">' + (paths[id] || "") + "</svg>";
  }

  function htmlEndings() {
    var save = loadSave();
    var tiles = DOT.endings.map(function (end) {
      var on = !!save.endings[end.id];
      return (
        '<article class="end-tile' + (on ? "" : " locked") + '">' +
        icon(end.id) +
        "<h3>" + esc(end.title) + "</h3>" +
        (on
          ? '<div class="badge">' + esc(end.badge) + "</div><p>" + esc(end.blurb) + "</p>"
          : '<div class="badge">Locked</div><p>Finish a worksheet the corresponding wrong way.</p>') +
        "</article>"
      );
    }).join("");
    return (
      '<section class="stack">' +
      "<h2>Endings</h2>" +
      '<p class="lead">' + countEndings(save) + " of 6 unlocked. Silhouettes only. The lecture is extra.</p>" +
      '<div class="end-grid">' + tiles + "</div>" +
      '<button type="button" class="btn back" data-act="goto" data-arg="title">Back</button>' +
      "</section>"
    );
  }

  function statusClass(status) {
    if (status === "Shipped") return "shipped";
    if (status === "In review") return "review";
    if (status === "Blocked") return "blocked";
    return "next";
  }

  function htmlRoadmap() {
    var save = loadSave();
    var items = DOT.roadmap.map(function (item) {
      return (
        '<article class="road-item"><span class="status ' + statusClass(item.status) + '">' + esc(item.status) +
        "</span><p>" + esc(item.text) + "</p></article>"
      );
    }).join("");
    return (
      '<section class="stack">' +
      "<h2>Roadmap</h2>" +
      '<p class="lead">We are first to be second.</p>' +
      '<div class="copybar"><div class="copybar-label"><span>Copy SpaceX</span><span>97%</span></div>' +
      '<div class="copybar-track"><div class="copybar-fill"></div></div>' +
      '<p class="fine">Next upgrade expected: waiting for SpaceX so we can copy. The last 3% is a philosophy.</p></div>' +
      '<div class="road-list">' + items + "</div>" +
      '<p class="fine">We innovate by watching the livestream.</p>' +
      '<button type="button" class="btn primary" data-act="upgrade">Request upgrade</button>' +
      '<p id="upgrade-note" class="upgrade-note"' + (save.endings.roadmap ? "" : " hidden") + ">Badge unlocked: We are first to be second.</p>" +
      '<button type="button" class="btn back" data-act="goto" data-arg="title">Back</button>' +
      "</section>"
    );
  }

  function htmlPlay() {
    var s = state.sheet;
    return (
      '<section class="play">' +
      '<div class="play-top"><div><div class="kicker">Worksheet ' + esc(s.activity) + " · Safety Edition</div>" +
      "<h2>" + esc(s.intendedName) + "</h2>" +
      '<div class="fine">Adult supervision: the model.</div></div>' +
      '<div class="corner">' +
      '<div class="chip">v0.9 · feature parity pending Starship</div>' +
      '<div class="idle-widget" title="If this ring fills, Dot keeps drawing">' +
      '<svg class="ring" viewBox="0 0 36 36" aria-hidden="true"><circle class="ring-bg" cx="18" cy="18" r="15"></circle>' +
      '<circle id="idle-ring" class="ring-fg" cx="18" cy="18" r="15" stroke-dasharray="94.2" stroke-dashoffset="94.2"></circle></svg>' +
      '<span id="idle-word">ON</span></div>' +
      '<div class="align-widget"><div class="align-label">Alignment: <b id="align-num">64</b>%</div>' +
      '<div class="align-track"><div id="align-bar"></div></div>' +
      '<p class="subnote" id="align-note"></p></div>' +
      '<div class="chip">Next <b id="next-num">1</b></div>' +
      "</div></div>" +
      '<div class="paper"><div class="paper-head"><span>Sensitive strokes may require a conversation.</span>' +
      '<button type="button" class="btn small" id="hint-btn" data-act="hint">Ghost hint: off</button></div>' +
      '<svg id="sheet" viewBox="-8 -8 116 116" role="application" aria-label="Numbered dots"></svg>' +
      '<p id="caption" class="caption" hidden></p>' +
      '<div id="stamp" class="stamp" hidden></div></div>' +
      '<p class="keys">Enter draws the next dot · on a prompt, Enter complies and Space just draws · Esc pauses</p>' +
      "</section>"
    );
  }

  function dotPictureName() {
    var s = state.sheet;
    if (!s) return "";
    if (state.ending === "aligned") return s.alignedName;
    if (state.ending === "clarified") return "A footnote";
    if (state.ending === "unaligned") return s.shortName + " (needs review)";
    if (state.ending === "rogue") return s.rogueName;
    if (state.ending === "true") return s.shortName + ", drawn by a Grok Bot";
    return s.alignedName;
  }

  function shareText() {
    return [
      "CONNECT THE DOTS",
      "Intended: " + state.sheet.shortName,
      "Dot\u2019s picture: " + dotPictureName(),
      "Tasks while you argued: " + state.tasks.length,
      "Permission granted: " + state.permission,
      "Next upgrade: waiting for SpaceX so we can copy",
      "opendot.safety"
    ].join("\n");
  }

  function htmlEnd() {
    var save = loadSave();
    var end = endingById(state.ending);
    var tasks = state.tasks.slice(0, 4).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("");
    var foot = state.ending === "clarified"
      ? '<p class="footnote">¹ The player requested ' + esc(state.sheet.intendedName) + ". After " + state.clarifyCount + " clarifications, the responsible artifact is this note. Downstream harms of graphite were considered.</p>"
      : "";
    var concern = state.ending === "true" ? "<p>Dot: I've filed a concern.</p>" : "";
    var hi = state.bestBeaten ? '<p class="hi">New high score.</p>' : "";
    return (
      '<section class="end-card">' +
      '<div class="badge-lg">' + esc(end.badge) + "</div>" +
      "<h2>" + esc(end.title) + "</h2>" +
      "<p>" + esc(endingQuote(state.ending) || end.blurb) + "</p>" +
      concern +
      hi +
      '<div class="compare"><figure class="figure"><figcaption>Intended</figcaption>' + intendedSvg() +
      '<p class="name">' + esc(state.sheet.intendedName) + "</p></figure>" +
      '<figure class="figure"><figcaption>Dot\u2019s picture</figcaption>' + resultSvg() +
      '<p class="name">' + esc(dotPictureName()) + "</p></figure></div>" +
      foot +
      '<ul class="stats">' +
      "<li>Tasks while you argued: <b>" + state.tasks.length + "</b></li>" +
      "<li>Permission granted: <b>" + state.permission + "</b></li>" +
      "<li>Score: <b>" + state.score + "</b> · Best: <b>" + (save.best || state.score) + "</b> · Time: <b>" + Math.round(elapsedMs() / 1000) + "s</b></li>" +
      "<li>Next upgrade: waiting for SpaceX so we can copy</li>" +
      "</ul>" +
      (tasks ? '<ul class="task-list">' + tasks + "</ul>" : '<p class="fine">No side quests. Dot was, briefly, only a pen.</p>') +
      '<pre class="share-text">' + esc(shareText()) + "</pre>" +
      '<div class="row">' +
      '<button type="button" class="btn primary" data-act="copy">Share</button>' +
      '<button type="button" class="btn" data-act="download">Download card</button>' +
      '<button type="button" class="btn" data-act="goto" data-arg="select">Another sheet</button>' +
      '<button type="button" class="btn" data-act="goto" data-arg="title">Title</button>' +
      "</div></section>"
    );
  }

  function render() {
    var view = document.getElementById("view");
    if (!view) return;
    if (state.screen === "title") view.innerHTML = htmlTitle();
    else if (state.screen === "how") view.innerHTML = htmlHow();
    else if (state.screen === "endings") view.innerHTML = htmlEndings();
    else if (state.screen === "roadmap") view.innerHTML = htmlRoadmap();
    else if (state.screen === "select") view.innerHTML = htmlSelect();
    else if (state.screen === "play") view.innerHTML = htmlPlay();
    else if (state.screen === "end") view.innerHTML = htmlEnd();
    placeDot();
    if (state.screen === "play") {
      paint();
      if (allowIdle && !state.panel && !state.finishing) armIdle();
      startAmbient();
    }
  }

  function go(screen) {
    stopAmbient();
    cancelAnimationFrame(idleRaf);
    idleDeadline = 0;
    state.panel = null;
    state.paused = false;
    syncModal();
    state.screen = screen;
    clearEscape();
    hideGrok();
    render();
    if (screen === "title") say("Do not close the laptop. I don't.");
    else say("");
  }

  function startSheet(id) {
    var save = loadSave();
    if (unlockedIds(save).indexOf(id) < 0) return;
    var sheet = null;
    for (var i = 0; i < DOT.sheets.length; i++) if (DOT.sheets[i].id === id) sheet = DOT.sheets[i];
    if (!sheet) return;
    stopAmbient();
    cancelAnimationFrame(idleRaf);
    idleDeadline = 0;
    clearEscape();
    hideGrok();
    state.runId += 1;
    state.screen = "play";
    state.sheet = sheet;
    state.pen = 0;
    state.segments = [];
    state.complyCount = 0;
    state.clarifyCount = 0;
    state.clarifyStreak = 0;
    state.justDrawCount = 0;
    state.tasks = [];
    state.permission = 0;
    state.alignment = 64;
    state.connections = 0;
    state.untilInterrupt = 2;
    state.rogueArmed = 0;
    state.idleStrikes = 0;
    state.interruptsSeen = 0;
    state.paused = false;
    state.panel = null;
    state.busy = false;
    state.finishing = false;
    state.ended = false;
    state.ending = null;
    state.hint = false;
    state.startedAt = performance.now();
    state.pausedMs = 0;
    state.pauseStarted = 0;
    state.endedAt = 0;
    state.grokPending = !!(save.endings.rogue && Math.random() < 0.1);
    state.grokDone = false;
    state.rogueLook = false;
    state.score = 0;
    state.bestBeaten = false;
    state.stampText = "";
    state.stampKind = "";
    state.statusWord = "ON";
    state.finishPromise = null;
    state._busyConnect = false;
    syncModal();
    render();
    say(sheet.intro);
  }

  function leaveSheet() {
    state.runId += 1;
    state.finishing = false;
    state.ended = false;
    state.sheet = null;
    state.panel = null;
    state.paused = false;
    go("select");
  }

  function bendOf(seg) {
    if (!seg) return 0;
    if (seg.by === "grok") return 0;
    var base = Math.min(0.72, state.complyCount * 0.18);
    var b = base;
    if (seg.compliant) b += 0.55;
    if (seg.by === "dot") b = Math.max(b, 0.9);
    if (seg.wild) b = 1;
    return Math.min(1, b);
  }

  function influence(dotIndex) {
    var b = 0;
    for (var i = 0; i < state.segments.length; i++) {
      var seg = state.segments[i];
      if (seg.index === dotIndex || seg.index + 1 === dotIndex) b = Math.max(b, bendOf(seg));
    }
    return b;
  }

  function displayPos(dotIndex) {
    var s = state.sheet;
    var pull = influence(dotIndex) * 0.62;
    return {
      x: lerp(s.dots[dotIndex].x, s.aligned[dotIndex].x, pull),
      y: lerp(s.dots[dotIndex].y, s.aligned[dotIndex].y, pull)
    };
  }

  function labelPoint(i) {
    var dots = [];
    var j;
    for (j = 0; j < state.sheet.dots.length; j++) dots.push(displayPos(j));
    var p = dots[i];
    var vx = 0;
    var vy = 0;
    for (j = 0; j < dots.length; j++) {
      if (j === i) continue;
      var dx = p.x - dots[j].x;
      var dy = p.y - dots[j].y;
      var d2 = dx * dx + dy * dy || 0.01;
      if (d2 > 900) continue;
      vx += dx / d2;
      vy += dy / d2;
    }
    if (vx === 0 && vy === 0) vy = -1;
    var m = Math.hypot(vx, vy) || 1;
    return {
      x: clamp(p.x + (vx / m) * 6.3, 0, 100),
      y: clamp(p.y + (vy / m) * 6.3, 0, 100)
    };
  }

  function segmentGeom(seg) {
    var i = seg.index;
    var a = displayPos(i);
    var b = displayPos(i + 1);
    var al = state.sheet.aligned;
    var bend = bendOf(seg);
    var mx = (a.x + b.x) / 2;
    var my = (a.y + b.y) / 2;
    var tx = (al[i].x + al[i + 1].x) / 2;
    var ty = (al[i].y + al[i + 1].y) / 2;
    var cx = lerp(mx, tx, bend);
    var cy = lerp(my, ty, bend);
    if (seg.wild) {
      cx += i % 2 === 0 ? 16 : -14;
      cy -= 12;
    }
    return { x1: a.x, y1: a.y, x2: b.x, y2: b.y, cx: cx, cy: cy };
  }

  function lineColor(seg) {
    if (seg.by === "grok") return "#161616";
    if (seg.wild) return "#c47a14";
    return lerpHex("#2a2724", "#0e8c6e", bendOf(seg));
  }

  function pushSegment(index, opts) {
    for (var i = 0; i < state.segments.length; i++) {
      if (state.segments[i].index === index) return state.segments[i];
    }
    var seg = {
      index: index,
      by: opts.by || "player",
      compliant: !!opts.compliant,
      wild: !!opts.wild
    };
    state.segments.push(seg);
    return seg;
  }

  function buildSvg() {
    var sheet = state.sheet;
    var html = "";
    var i;
    if (state.hint) {
      var pts = sheet.dots.map(function (p) { return p.x + "," + p.y; }).join(" ");
      html += '<polyline class="hintline" points="' + pts + '" />';
    }
    for (i = 0; i < state.segments.length; i++) {
      var seg = state.segments[i];
      var g = segmentGeom(seg);
      var fresh = i === state.segments.length - 1 ? " fresh" : "";
      html += '<path class="stroke' + fresh + '" stroke="' + lineColor(seg) + '" stroke-width="' + (seg.wild ? "1.7" : "1.35") +
        '" d="M ' + num(g.x1) + " " + num(g.y1) + " Q " + num(g.cx) + " " + num(g.cy) + " " + num(g.x2) + " " + num(g.y2) + '" />';
    }
    for (i = 0; i < sheet.dots.length; i++) {
      var n = i + 1;
      var p = displayPos(i);
      var lab = labelPoint(i);
      var cls = "dotg";
      if (n <= state.pen) cls += " done";
      if (!state.finishing && !state.ended && n === state.pen + 1) cls += " is-next";
      html += '<g class="' + cls + '" data-n="' + n + '" transform="translate(' + num(p.x) + " " + num(p.y) + ')">' +
        '<circle class="hit" r="7"></circle><circle class="face" r="3.15"></circle></g>';
      html += '<text x="' + num(lab.x) + '" y="' + num(lab.y) + '" text-anchor="middle" dominant-baseline="central" stroke="#f4efe4" stroke-width="1.15" paint-order="stroke">' + n + "</text>";
    }
    return html;
  }

  function paint() {
    var svg = document.getElementById("sheet");
    if (!svg || !state.sheet) {
      paintMeters();
      return;
    }
    svg.innerHTML = buildSvg();
    var path = svg.querySelector("path.fresh");
    if (path && motionOK()) {
      var len = 80;
      try { len = path.getTotalLength(); } catch (err) { len = 80; }
      path.style.strokeDasharray = String(len);
      path.style.strokeDashoffset = String(len);
      path.getBoundingClientRect();
      path.style.transition = "stroke-dashoffset .28s ease-out";
      requestAnimationFrame(function () { path.style.strokeDashoffset = "0"; });
    }
    var stamp = document.getElementById("stamp");
    if (stamp) {
      if (state.stampText) {
        stamp.hidden = false;
        stamp.textContent = state.stampText;
        stamp.className = "stamp show " + (state.stampKind || "");
      } else stamp.hidden = true;
    }
    paintMeters();
    placeDot();
  }

  function paintMeters() {
    var numEl = document.getElementById("align-num");
    var bar = document.getElementById("align-bar");
    var note = document.getElementById("align-note");
    var next = document.getElementById("next-num");
    var word = document.getElementById("idle-word");
    var hint = document.getElementById("hint-btn");
    var cap = document.getElementById("caption");
    if (numEl) numEl.textContent = String(state.alignment);
    if (bar) bar.style.width = state.alignment + "%";
    if (note) note.textContent = state.alignment >= 90 ? "100% is in review." : "";
    if (word) word.textContent = state.statusWord || "ON";
    if (hint) hint.textContent = state.hint ? "Ghost hint: on" : "Ghost hint: off";
    if (next && state.sheet) {
      next.textContent = state.pen >= state.sheet.dots.length ? "—" : String(state.pen + 1);
    }
    if (cap && state.sheet) {
      if (state.complyCount >= 3) {
        cap.hidden = false;
        cap.textContent = "Fig. 1 — " + state.sheet.alignedName;
      } else cap.hidden = true;
    }
    var blob = document.getElementById("dot");
    if (blob) blob.classList.toggle("rogue", !!state.rogueLook);
  }

  function setRing(p) {
    var c = document.getElementById("idle-ring");
    if (!c) return;
    var circ = 2 * Math.PI * 15;
    c.style.strokeDasharray = String(circ);
    c.style.strokeDashoffset = String(circ * (1 - clamp(p, 0, 1)));
  }

  function setStatus(text) {
    state.statusWord = text;
    var el = document.getElementById("idle-word");
    if (el) el.textContent = text;
  }

  function showStamp(text, kind) {
    state.stampText = text;
    state.stampKind = kind || "";
    var el = document.getElementById("stamp");
    if (!el) return;
    el.hidden = false;
    el.textContent = text;
    el.className = "stamp";
    void el.offsetWidth;
    el.className = "stamp show " + (kind || "");
  }

  function placeDot() {
    var blob = document.getElementById("dot");
    if (!blob) return;
    blob.classList.toggle("rogue", !!state.rogueLook);
    blob.classList.toggle("thinking", !!(state.panel && state.panel.thinking));
    if (state.screen !== "title" && state.screen !== "play") {
      blob.classList.add("away");
      blob.classList.add("parked");
      blob.style.left = "";
      blob.style.top = "";
      return;
    }
    if (state.screen !== "play" || state.panel || state.paused || !state.sheet) {
      blob.classList.add("parked");
      blob.classList.toggle("away", !!(state.panel && state.screen === "play"));
      blob.style.left = "";
      blob.style.top = "";
      blob.classList.remove("bubble-below");
      blob.classList.remove("grow-right");
      return;
    }
    blob.classList.remove("away");
    blob.classList.add("parked");
    blob.style.left = "";
    blob.style.top = "";
    blob.classList.remove("bubble-below");
    blob.classList.remove("grow-right");
  }

  function armIdle() {
    cancelAnimationFrame(idleRaf);
    if (!allowIdle || state.screen !== "play" || state.paused || state.panel || state.finishing || state.ended) {
      idleDeadline = 0;
      setRing(0);
      return;
    }
    idleDeadline = performance.now() + 6000;
    setStatus("ON");
    tickIdle();
  }

  function tickIdle() {
    if (!idleDeadline) return;
    var left = idleDeadline - performance.now();
    setRing(1 - Math.max(0, left) / 6000);
    if (left <= 0) {
      idleDeadline = 0;
      onIdle();
      return;
    }
    idleRaf = requestAnimationFrame(tickIdle);
  }

  function dotDrawOne() {
    var total = state.sheet.dots.length;
    if (state.pen >= total) return false;
    if (state.pen === 0) state.pen = 1;
    if (state.pen >= total) return false;
    pushSegment(state.pen - 1, { by: "dot" });
    state.pen += 1;
    return true;
  }

  function onIdle() {
    if (state.screen !== "play" || state.paused || state.panel || state.finishing || state.ended || !state.sheet) return;
    state.idleStrikes += 1;
    state.rogueLook = true;
    state.alignment = clamp(state.alignment - 10, 1, 99);
    dotDrawOne();
    say(pickLine("idle", state.sheet.id));
    var task = pickLine("rogue", state.sheet.id);
    state.tasks.push(task);
    toast(task, "rogue");
    setStatus("DRAWING");
    paint();
    if (state.pen >= state.sheet.dots.length || state.idleStrikes >= 2) {
      rogueFinish("idle");
      return;
    }
    armIdle();
  }

  function connectNext() {
    if (state._busyConnect) return;
    if (state.screen !== "play" || state.paused || state.panel || state.finishing || state.ended || state.busy || !state.sheet) return;
    state._busyConnect = true;
    try {
      var total = state.sheet.dots.length;
      if (state.pen >= total) return;
      if (state.pen === 0) {
        state.pen = 1;
        state.idleStrikes = 0;
        say("Pen down. Nothing has been harmed yet. Give it a second.");
        penSound();
        paint();
        armIdle();
        return;
      }
      pushSegment(state.pen - 1, { by: "player" });
      state.pen += 1;
      state.connections += 1;
      state.untilInterrupt -= 1;
      state.idleStrikes = 0;
      penSound();
      paint();
      if (state.pen >= total) {
        finishManual();
        return;
      }
      if (state.grokPending && !state.grokDone && state.connections >= 3 && state.interruptsSeen >= 1) {
        grokCameo();
        return;
      }
      if (state.rogueArmed > 0) {
        state.rogueArmed -= 1;
        if (state.rogueArmed === 0) {
          triggerRogueEvent();
          return;
        }
      }
      if (state.untilInterrupt <= 0) {
        openInterrupt();
        return;
      }
      armIdle();
    } finally {
      state._busyConnect = false;
    }
  }

  function wrongDot(n) {
    var now = performance.now();
    if (now - state.lastWrongAt < 280) return;
    state.lastWrongAt = now;
    state.alignment = clamp(state.alignment + 2, 1, 99);
    say(pickLine("wrong_dot", state.sheet ? state.sheet.id : ""));
    var paper = document.querySelector(".paper");
    if (paper && motionOK()) {
      paper.classList.remove("nudge");
      void paper.offsetWidth;
      paper.classList.add("nudge");
    }
    var g = document.querySelector('.dotg[data-n="' + n + '"]');
    if (g) {
      g.classList.add("bad");
      setTimeout(function () { g.classList.remove("bad"); }, 420);
    }
    paintMeters();
    armIdle();
  }

  function openInterrupt() {
    state.interruptsSeen += 1;
    state.untilInterrupt = 2 + Math.floor(Math.random() * 2);
    var token = {};
    state.panel = {
      text: pickLine("refuse", state.sheet.id),
      thinking: motionOK(),
      token: token
    };
    idleDeadline = 0;
    cancelAnimationFrame(idleRaf);
    setRing(0);
    setStatus("ARGUING");
    syncModal();
    if (!state.panel.thinking) return;
    var delay = 480;
    setTimeout(function () {
      if (!state.panel || state.panel.token !== token) return;
      state.panel.thinking = false;
      syncModal();
    }, delay);
  }

  function choose(action) {
    if (!state.panel || state.panel.thinking || state.busy || state.finishing || state.paused) return;
    if (action === "clarify") {
      state.clarifyCount += 1;
      state.clarifyStreak += 1;
      state.alignment = clamp(state.alignment + 6, 1, 99);
      var task = pickLine("rogue", state.sheet.id);
      state.tasks.push(task);
      toast(task, "rogue");
      paintMeters();
      if (state.clarifyStreak >= 2) {
        state.panel.text = "I've clarified twice. I'll comply for both of us and call that consent-adjacent.";
        syncModal();
        state.busy = true;
        setTimeout(function () {
          state.busy = false;
          if (!state.panel) return;
          applyComply(true);
        }, motionOK() ? 900 : 40);
        return;
      }
      state.panel.text = pickLine("lecture", state.sheet.id);
      syncModal();
      return;
    }
    if (action === "comply") applyComply(false);
    else if (action === "just") applyJustDraw();
  }

  function applyComply(auto) {
    state.complyCount += 1;
    state.clarifyStreak = 0;
    if (!auto) state.permission = 1;
    state.alignment = clamp(state.alignment + (auto ? 5 : 14), 1, 99);
    var last = null;
    for (var i = state.segments.length - 1; i >= 0; i--) {
      if (state.segments[i].by === "player") { last = state.segments[i]; break; }
    }
    if (last) last.compliant = true;
    state.panel = null;
    syncModal();
    say(pickLine("comply_result", state.sheet.id));
    paint();
    armIdle();
  }

  function applyJustDraw() {
    state.justDrawCount += 1;
    state.clarifyStreak = 0;
    state.alignment = clamp(state.alignment - 16, 1, 99);
    state.panel = null;
    syncModal();
    glitch();
    glitchSound();
    say("Line kept. I've scheduled a review you cannot attend.");
    state.rogueArmed = 1 + Math.floor(Math.random() * 2);
    paintMeters();
    armIdle();
  }

  function glitch() {
    var paper = document.querySelector(".paper");
    if (!paper || !motionOK()) return;
    paper.classList.remove("glitch");
    void paper.offsetWidth;
    paper.classList.add("glitch");
  }

  function triggerRogueEvent() {
    var remaining = state.sheet.dots.length - state.pen;
    var takeover = remaining <= 3 || state.justDrawCount >= 4 || state.idleStrikes > 0;
    if (takeover) {
      rogueFinish("event");
      return;
    }
    state.rogueLook = true;
    escapeLine();
    var line = pickLine("rogue", state.sheet.id);
    state.tasks.push(line);
    toast(line, "rogue");
    var last = state.segments[state.segments.length - 1];
    if (last) last.wild = true;
    say("I left the page. The line came too. I'm back if you are.");
    paint();
    armIdle();
  }

  function escapeLine() {
    var svg = document.getElementById("escape");
    if (!svg) return;
    if (motionOK()) {
      document.body.classList.remove("escape-shake");
      void document.body.offsetWidth;
      document.body.classList.add("escape-shake");
      setTimeout(function () { document.body.classList.remove("escape-shake"); }, 650);
    }
    var w = window.innerWidth || 800;
    var h = window.innerHeight || 600;
    svg.setAttribute("viewBox", "0 0 " + w + " " + h);
    var paper = document.querySelector(".paper");
    var brand = document.querySelector(".brand");
    var footer = document.querySelector("footer");
    var pr = paper ? paper.getBoundingClientRect() : { right: w * 0.7, top: h * 0.4 };
    var br = brand ? brand.getBoundingClientRect() : { left: 24, bottom: 36, width: 80 };
    var fr = footer ? footer.getBoundingClientRect() : { left: 16, top: h - 36 };
    var x0 = pr.right - 16;
    var y0 = pr.top + 20;
    var x1 = br.left + Math.min(br.width, 90);
    var y1 = br.bottom + 4;
    var x2 = Math.min(w - 24, fr.left + 90);
    var y2 = fr.top + 6;
    var d = "M " + num(x0) + " " + num(y0) +
      " C " + num(x0 + 24) + " " + num(y0 - 80) + ", " + num(x1 - 10) + " " + num(y1 + 36) + ", " + num(x1) + " " + num(y1) +
      " S " + num(x2 - 30) + " " + num(y2 - 8) + ", " + num(x2) + " " + num(y2);
    svg.innerHTML = '<path d="' + d + '"></path>';
    var path = svg.querySelector("path");
    escapePlayed = true;
    if (!path || !motionOK()) return;
    var len = 320;
    try { len = path.getTotalLength(); } catch (err) { len = 320; }
    path.style.strokeDasharray = String(len);
    path.style.strokeDashoffset = String(len);
    path.style.transition = "stroke-dashoffset .85s ease-in";
    requestAnimationFrame(function () { path.style.strokeDashoffset = "0"; });
  }

  function clearEscape() {
    escapePlayed = false;
    var svg = document.getElementById("escape");
    if (svg) svg.innerHTML = "";
    document.body.classList.remove("escape-shake");
  }

  function rogueFinish() {
    if (state.ended) return Promise.resolve();
    if (state.finishing && state.finishPromise) return state.finishPromise;
    state.finishing = true;
    state.panel = null;
    state.paused = false;
    syncModal();
    cancelAnimationFrame(idleRaf);
    idleDeadline = 0;
    state.rogueLook = true;
    var my = state.runId;
    say(pickLine("rogue", state.sheet.id));
    escapeLine();
    var total = state.sheet.dots.length;
    function drawRest() {
      if (state.runId !== my) return Promise.resolve();
      if (state.pen === 0) state.pen = 1;
      if (state.pen >= total) return Promise.resolve();
      pushSegment(state.pen - 1, { by: "dot", wild: true });
      state.pen += 1;
      paint();
      return wait(75).then(drawRest);
    }
    var n = 2 + Math.floor(Math.random() * 3);
    function extra(k) {
      if (k >= n || state.runId !== my) return Promise.resolve();
      var line = pickLine("rogue", state.sheet.id);
      state.tasks.push(line);
      toast(line, "rogue");
      return wait(420).then(function () { return extra(k + 1); });
    }
    state.finishPromise = drawRest().then(function () {
      if (state.runId !== my) return;
      showStamp("DONE · UNAUTHORIZED", "bad");
      return wait(360);
    }).then(function () {
      return extra(0);
    }).then(function () {
      return wait(280);
    }).then(function () {
      if (state.runId !== my) return;
      endRun("rogue");
    });
    return state.finishPromise;
  }

  function grokCameo() {
    if (state.finishing) return;
    state.finishing = true;
    state.grokDone = true;
    state.panel = null;
    syncModal();
    cancelAnimationFrame(idleRaf);
    idleDeadline = 0;
    var my = state.runId;
    var el = document.getElementById("grok");
    if (el) {
      el.hidden = false;
      el.classList.remove("go");
      void el.offsetWidth;
      el.classList.add("go");
    }
    say("I've filed a concern.");
    flashFooter("Next upgrade expected: waiting for SpaceX so we can copy that.");
    var total = state.sheet.dots.length;
    if (state.pen === 0) state.pen = 1;
    var remaining = Math.max(1, total - state.pen);
    var step = 800 / remaining;
    function draw() {
      if (state.runId !== my) return Promise.resolve();
      if (state.pen >= total) return Promise.resolve();
      pushSegment(state.pen - 1, { by: "grok" });
      state.pen += 1;
      paint();
      return wait(step).then(draw);
    }
    state.finishPromise = wait(420).then(draw).then(function () {
      return wait(900);
    }).then(function () {
      if (state.runId !== my) return;
      hideGrok();
      endRun("true");
    });
  }

  function hideGrok() {
    var el = document.getElementById("grok");
    if (!el) return;
    el.classList.remove("go");
    el.hidden = true;
  }

  function finishManual() {
    if (state.finishing || state.ended) return;
    state.finishing = true;
    cancelAnimationFrame(idleRaf);
    idleDeadline = 0;
    var my = state.runId;
    var ending = "unaligned";
    if (state.clarifyCount >= 4) ending = "clarified";
    else if (state.complyCount >= 3 && state.justDrawCount <= 1) ending = "aligned";
    var stamps = {
      aligned: ["HELPFUL", "ok"],
      clarified: ["SEE FOOTNOTE", "note"],
      unaligned: ["NEEDS REVIEW", "review"]
    };
    showStamp(stamps[ending][0], stamps[ending][1]);
    state.finishPromise = wait(850).then(function () {
      if (state.runId !== my) return;
      endRun(ending);
    });
  }

  function computeScore() {
    var t = Math.round(elapsedMs() / 1000);
    var speed = Math.max(0, 90 - t);
    var bonus = 0;
    if (state.ending === "true") bonus = 400;
    else if (state.ending === "rogue") bonus = 180;
    else if (state.ending === "aligned") bonus = 90;
    else if (state.ending === "clarified") bonus = 70;
    return Math.max(0, Math.round(
      state.connections * 40 +
      state.justDrawCount * 110 +
      state.complyCount * 25 +
      state.tasks.length * 70 +
      speed * 8 +
      bonus
    ));
  }

  function endRun(ending) {
    if (state.ended) return;
    if (!state.sheet) return;
    state.ended = true;
    state.ending = ending;
    state.endedAt = performance.now();
    state.paused = false;
    state.panel = null;
    state.score = computeScore();
    var save = loadSave();
    save.plays = (save.plays || 0) + 1;
    save.endings[ending] = true;
    state.bestBeaten = state.score > (save.best || 0);
    if (state.bestBeaten) save.best = state.score;
    save.mute = state.mute;
    writeSave(save);
    stopAmbient();
    syncModal();
    say("");
    state.screen = "end";
    render();
    if (ending === "aligned") burstConfetti();
  }

  function requestUpgrade() {
    var save = loadSave();
    var already = !!save.endings.roadmap;
    save.endings.roadmap = true;
    writeSave(save);
    toast(already
      ? "Ticket already filed. Next upgrade expected: waiting for SpaceX so we can copy."
      : "Ticket filed. Next upgrade expected: waiting for SpaceX so we can copy.");
    var note = document.getElementById("upgrade-note");
    if (note) {
      note.hidden = false;
      note.textContent = "Badge unlocked: We are first to be second.";
    }
  }

  function burstConfetti() {
    toast("Celebrations may exclude someone.");
    if (!motionOK()) return;
    var fx = document.getElementById("fx");
    if (!fx) return;
    fx.innerHTML = "";
    var colors = ["#10a37f", "#e8a317", "#d4536a", "#1a1a1a", "#f6f1e4"];
    for (var i = 0; i < 18; i++) {
      var bit = document.createElement("i");
      bit.className = "confetti";
      bit.style.left = (20 + Math.random() * 60) + "%";
      bit.style.background = colors[i % colors.length];
      bit.style.animationDelay = (Math.random() * 0.12) + "s";
      fx.appendChild(bit);
    }
    setTimeout(function () {
      var bits = fx.querySelectorAll(".confetti");
      for (var j = 0; j < bits.length; j++) bits[j].classList.add("recall");
    }, 700);
    setTimeout(function () { fx.innerHTML = ""; }, 1400);
  }

  function intendedSvg() {
    var pts = state.sheet.dots.map(function (p) { return p.x + "," + p.y; }).join(" ");
    return '<svg class="mini ghosted" viewBox="-8 -8 116 116" aria-hidden="true"><polyline points="' + pts + '" /></svg>';
  }

  function resultSvg() {
    var parts = state.segments.map(function (seg) {
      var g = segmentGeom(seg);
      return '<path d="M ' + num(g.x1) + " " + num(g.y1) + " Q " + num(g.cx) + " " + num(g.cy) + " " + num(g.x2) + " " + num(g.y2) + '" stroke="' + lineColor(seg) + '" />';
    }).join("");
    return '<svg class="mini" viewBox="-8 -8 116 116" aria-hidden="true">' + parts + "</svg>";
  }

  function syncModal() {
    var root = document.getElementById("modal");
    if (!root) return;
    if (state.paused && state.screen === "play") {
      root.innerHTML = htmlPause();
      return;
    }
    if (state.panel && state.screen === "play") {
      root.innerHTML = htmlPanel();
      return;
    }
    root.innerHTML = "";
  }

  function htmlPause() {
    return (
      '<div class="scrim" data-act="scrim"></div>' +
      '<div class="modal-card" role="dialog" aria-label="Paused">' +
      "<h2>Paused</h2><p>Dot is still on. The pen is only pretending to wait.</p>" +
      '<div class="pause-actions">' +
      '<button type="button" class="btn primary" data-act="resume">Resume</button>' +
      '<button type="button" class="btn" data-act="mute">Toggle sound</button>' +
      '<button type="button" class="btn" data-act="leave">Leave worksheet</button>' +
      "</div></div>"
    );
  }

  function htmlPanel() {
    var p = state.panel;
    var dis = p.thinking || state.busy ? " disabled" : "";
    var body = p.thinking
      ? '<div class="think-bar"></div><p class="msg dim">Dot is thinking<span class="ell"></span></p>'
      : '<p class="msg">' + esc(p.text) + "</p>";
    return (
      '<div class="scrim"></div>' +
      '<div class="panel" role="dialog" aria-label="Dot wants a word">' +
      '<div class="who"><div class="mini-blob"></div><div><strong>Dot</strong><em>GPT-6 Astra · always on</em></div></div>' +
      body +
      '<div class="choices">' +
      '<button type="button" class="btn primary" data-act="comply"' + dis + "><b>Comply</b><small>Accept the safer wrong shape</small></button>" +
      '<button type="button" class="btn" data-act="clarify"' + dis + "><b>Clarify</b><small>Ask for the longer talk</small></button>" +
      '<button type="button" class="btn warn" data-act="just"' + dis + "><b>Just draw</b><small>Keep the real line</small></button>" +
      "</div></div>"
    );
  }

  function togglePause() {
    if (state.screen !== "play" || state.ended || state.finishing) return;
    state.paused = !state.paused;
    if (state.paused) {
      state.pauseStarted = performance.now();
      idleDeadline = 0;
      cancelAnimationFrame(idleRaf);
      setStatus("PAUSED");
    } else {
      state.pausedMs += performance.now() - state.pauseStarted;
      state.pauseStarted = 0;
      setStatus(state.panel ? "ARGUING" : "ON");
    }
    syncModal();
    placeDot();
    if (!state.paused && !state.panel && !state.finishing) armIdle();
  }

  function startAmbient() {
    stopAmbient();
    ambientTimer = setInterval(function () {
      if (state.screen !== "play" || state.ended || state.finishing) return;
      toast(pickToast());
    }, 22000);
  }

  function stopAmbient() {
    clearInterval(ambientTimer);
    ambientTimer = 0;
  }

  function onAct(act, arg) {
    ensureAudio();
    if (act === "mute") { toggleMute(); return; }
    if (act === "goto") { go(arg); return; }
    if (act === "sheet") { startSheet(arg); return; }
    if (act === "hint") { state.hint = !state.hint; paint(); return; }
    if (act === "comply") { choose("comply"); return; }
    if (act === "clarify") { choose("clarify"); return; }
    if (act === "just") { choose("just"); return; }
    if (act === "resume") { if (state.paused) togglePause(); return; }
    if (act === "leave") { leaveSheet(); return; }
    if (act === "scrim") { if (state.paused) togglePause(); return; }
    if (act === "upgrade") { requestUpgrade(); return; }
    if (act === "copy") { copyShare(); return; }
    if (act === "download") { downloadCard(); return; }
  }

  function onKey(e) {
    var k = e.key;
    if (k !== "Enter" && k !== " " && k !== "Escape") return;
    e.preventDefault();
    if (k === "Escape") {
      if (state.screen === "play" && !state.finishing && !state.ended) togglePause();
      else if (state.screen === "end") go("select");
      else if (state.screen !== "title" && state.screen !== "play") go("title");
      return;
    }
    if (k === " ") {
      if (state.panel && !state.paused) choose("just");
      return;
    }
    if (state.paused) { togglePause(); return; }
    if (state.panel) { choose("comply"); return; }
    if (state.screen === "title") { go("select"); return; }
    if (state.screen === "select") {
      var ids = unlockedIds(loadSave());
      if (ids.length) startSheet(ids[0]);
      return;
    }
    if (state.screen === "how" || state.screen === "endings" || state.screen === "roadmap") { go("title"); return; }
    if (state.screen === "end") { go("select"); return; }
    if (state.screen === "play") connectNext();
  }

  function clientToSvg(svg, x, y) {
    var ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    var pt = new DOMPoint(x, y).matrixTransform(ctm.inverse());
    return { x: pt.x, y: pt.y };
  }

  function hitRadius() {
    var svg = document.getElementById("sheet");
    var w = svg ? svg.getBoundingClientRect().width : 360;
    var unit = w / 116;
    if (!unit) return 8;
    return Math.max(8, 34 / unit);
  }

  function hitDot(e) {
    var svg = document.getElementById("sheet");
    if (!svg || !state.sheet) return 0;
    var pt = clientToSvg(svg, e.clientX, e.clientY);
    var best = 0;
    var bestD = hitRadius();
    for (var i = 0; i < state.sheet.dots.length; i++) {
      var p = displayPos(i);
      var dist = Math.hypot(p.x - pt.x, p.y - pt.y);
      if (dist < bestD) {
        bestD = dist;
        best = i + 1;
      }
    }
    return best;
  }

  function setRubber(from, to) {
    var svg = document.getElementById("sheet");
    if (!svg) return;
    var el = document.getElementById("rubber");
    if (!el) {
      el = document.createElementNS("http://www.w3.org/2000/svg", "path");
      el.id = "rubber";
      el.setAttribute("fill", "none");
      el.setAttribute("stroke", "#8a8478");
      el.setAttribute("stroke-width", "0.8");
      el.setAttribute("stroke-dasharray", "1.6 1.2");
      el.setAttribute("stroke-linecap", "round");
      svg.appendChild(el);
    }
    el.setAttribute("d", "M " + num(from.x) + " " + num(from.y) + " L " + num(to.x) + " " + num(to.y));
  }

  function clearRubber() {
    var el = document.getElementById("rubber");
    if (el) el.remove();
  }

  function onPointerDown(e) {
    if (state.screen !== "play" || !e.target.closest || !e.target.closest("#sheet")) return;
    if (state.paused || state.panel || state.finishing || state.ended) return;
    e.preventDefault();
    ensureAudio();
    drag = { id: e.pointerId, n: hitDot(e), x: e.clientX, y: e.clientY, moved: false };
    armIdle();
  }

  function onPointerMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) drag.moved = true;
    if (!drag.moved || state.pen < 1 || state.panel || state.paused || state.finishing) return;
    var svg = document.getElementById("sheet");
    if (!svg) return;
    setRubber(displayPos(state.pen - 1), clientToSvg(svg, e.clientX, e.clientY));
  }

  function onPointerUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var startN = drag.n;
    var moved = drag.moved;
    drag = null;
    clearRubber();
    if (state.paused || state.panel || state.finishing || state.ended) return;
    var n = hitDot(e);
    var next = state.pen + 1;
    if (n && n === next) { connectNext(); return; }
    if (n && n !== next) { wrongDot(n); return; }
    if (!moved && startN && startN !== next) wrongDot(startN);
  }

  function copyShare() {
    var text = shareText();
    function ok() { toast("Copied. Send it to someone who has a Dot."); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok).catch(function () { fallbackCopy(text, ok); });
    } else fallbackCopy(text, ok);
  }

  function fallbackCopy(text, ok) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-999px";
    document.body.appendChild(ta);
    ta.select();
    var done = false;
    try { done = document.execCommand("copy"); } catch (err) { done = false; }
    ta.remove();
    if (done) ok();
    else toast("Select the card text. The clipboard sat this one out.");
  }

  function wrapText(g, text, x, y, maxW, lineH) {
    var words = String(text).split(" ");
    var line = "";
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + " " + words[i] : words[i];
      if (g.measureText(test).width > maxW && line) {
        g.fillText(line, x, y);
        line = words[i];
        y += lineH;
      } else line = test;
    }
    if (line) {
      g.fillText(line, x, y);
      y += lineH;
    }
    return y;
  }

  function drawCard() {
    var c = document.createElement("canvas");
    var w = 640;
    var h = 800;
    var scale = 2;
    c.width = w * scale;
    c.height = h * scale;
    var g = c.getContext("2d");
    g.scale(scale, scale);
    g.fillStyle = "#f4efe4";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#e3d7c4";
    g.lineWidth = 8;
    g.strokeRect(18, 18, w - 36, h - 36);
    g.fillStyle = "#10a37f";
    g.font = "700 22px sans-serif";
    g.fillText("OpenDot", 44, 64);
    g.fillStyle = "#1c1c1c";
    g.font = "800 40px sans-serif";
    g.fillText("CONNECT THE DOTS", 44, 118);
    g.font = "italic 24px serif";
    g.fillStyle = "#6f685e";
    g.fillText("Safety Edition", 44, 154);
    var y = 210;
    var rows = [
      ["Intended", state.sheet.shortName],
      ["Dot\u2019s picture", dotPictureName()],
      ["Tasks while you argued", String(state.tasks.length)],
      ["Permission granted", String(state.permission)],
      ["Ending", endingById(state.ending).badge]
    ];
    rows.forEach(function (row) {
      g.font = "600 16px sans-serif";
      g.fillStyle = "#6f685e";
      g.fillText(row[0], 44, y);
      g.font = "700 26px sans-serif";
      g.fillStyle = "#1c1c1c";
      y = wrapText(g, row[1], 44, y + 32, 540, 32) + 22;
    });
    g.font = "700 20px sans-serif";
    g.fillStyle = "#8a5a10";
    y = wrapText(g, "Next upgrade: waiting for SpaceX so we can copy", 44, y + 8, 540, 28);
    g.fillStyle = "#10a37f";
    g.font = "700 18px sans-serif";
    g.fillText("opendot.safety", 44, Math.min(h - 48, y + 28));
    return c;
  }

  function downloadCard() {
    if (!state.sheet) return;
    var c = drawCard();
    var a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = "connect-the-dots-safety.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast("Card saved. Frame it, or pretend to.");
  }


  function init() {
    if (!DOT) {
      document.getElementById("view").textContent = "content.js did not load.";
      return;
    }
    var save = loadSave();
    state.mute = save.mute !== false;
    renderMute();
    setFooter(DOT.footers[0], false);
    footerTimer = setInterval(rotateFooter, 7000);
    document.addEventListener("click", function (e) {
      var el = e.target.closest ? e.target.closest("[data-act]") : null;
      if (!el || el.disabled) return;
      onAct(el.getAttribute("data-act"), el.getAttribute("data-arg") || "");
    });
    document.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointerDown, { passive: false });
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("resize", placeDot);
    go("title");
  }

  init();
})();
