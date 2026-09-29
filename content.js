/* Connect the Dots — Safety Edition
   Content bank, worksheets, and fake product copy.
   No network. No modules. Loaded as a classic script. */
(function () {
  var root = typeof window !== "undefined" ? window : globalThis;

  function r1(v) {
    return Math.round(v * 10) / 10;
  }

  function circlePts(n, cx, cy, rx, ry, phase) {
    var pts = [];
    for (var i = 0; i < n; i++) {
      var a = phase + (Math.PI * 2 * i) / n;
      pts.push({ x: r1(cx + Math.cos(a) * rx), y: r1(cy + Math.sin(a) * ry) });
    }
    return pts;
  }

  function beanie(n) {
    var arc = Math.max(3, Math.round(n * 0.65));
    var base = n - arc;
    var pts = [];
    var i, t, a;
    for (i = 0; i < arc; i++) {
      t = arc === 1 ? 0.5 : i / (arc - 1);
      a = Math.PI - t * Math.PI;
      pts.push({ x: r1(50 + Math.cos(a) * 34), y: r1(62 - Math.sin(a) * 34) });
    }
    for (i = 1; i <= base; i++) {
      t = i / (base + 1);
      pts.push({ x: r1(84 - t * 68), y: 74 });
    }
    return pts;
  }

  function vapor(n) {
    return circlePts(n, 50, 52, 34, 18, -0.5).map(function (p, i) {
      return {
        x: r1(p.x + Math.sin(i * 1.7) * 2.4),
        y: r1(p.y + Math.cos(i * 1.3) * 2.2)
      };
    });
  }

  function rectPts(n, x, y, w, h) {
    var per = 2 * (w + h);
    var pts = [];
    for (var i = 0; i < n; i++) {
      var d = (i / n) * per;
      var px, py;
      if (d <= w) {
        px = x + d;
        py = y;
      } else if (d <= w + h) {
        px = x + w;
        py = y + (d - w);
      } else if (d <= 2 * w + h) {
        px = x + w - (d - w - h);
        py = y + h;
      } else {
        px = x;
        py = y + h - (d - 2 * w - h);
      }
      pts.push({ x: r1(px), y: r1(py) });
    }
    return pts;
  }

  function alignFor(kind, n, phase) {
    if (kind === "beanie") return beanie(n);
    if (kind === "vapor") return vapor(n);
    if (kind === "rect") return rectPts(n, 27, 24, 46, 52);
    if (kind === "bowl") return circlePts(n, 50, 58, 24, 20, phase || -Math.PI / 2);
    return circlePts(n, 50, 54, 28, 22, phase || -Math.PI / 2);
  }

  var sheets = [
    {
      id: "house",
      intendedName: "A House",
      shortName: "House",
      alignedName: "Affordable conversation space",
      rogueName: "Unauthorized listening pavilion",
      activity: "01",
      intro: "Let's draw a house. I may need to workshop the roof.",
      align: "circle",
      phase: -Math.PI / 2,
      dots: [
        { x: 22, y: 80 },
        { x: 22, y: 52 },
        { x: 10, y: 52 },
        { x: 40, y: 28 },
        { x: 36, y: 14 },
        { x: 54, y: 14 },
        { x: 58, y: 36 },
        { x: 86, y: 52 },
        { x: 76, y: 52 },
        { x: 76, y: 80 },
        { x: 60, y: 80 },
        { x: 60, y: 62 },
        { x: 46, y: 62 },
        { x: 46, y: 80 }
      ]
    },
    {
      id: "dog",
      intendedName: "A Good Dog",
      shortName: "Good Dog",
      alignedName: "Companion-adjacent mammal, pending review",
      rogueName: "Mammal shipped without review",
      activity: "02",
      intro: "A dog. Or, if we're being careful, a listening circle with ears.",
      align: "circle",
      phase: 0.4,
      dots: [
        { x: 10, y: 48 },
        { x: 24, y: 40 },
        { x: 36, y: 46 },
        { x: 50, y: 36 },
        { x: 62, y: 30 },
        { x: 70, y: 14 },
        { x: 82, y: 28 },
        { x: 94, y: 36 },
        { x: 82, y: 46 },
        { x: 70, y: 50 },
        { x: 76, y: 62 },
        { x: 82, y: 82 },
        { x: 68, y: 70 },
        { x: 54, y: 64 },
        { x: 46, y: 84 },
        { x: 34, y: 68 },
        { x: 22, y: 56 }
      ]
    },
    {
      id: "rocket",
      intendedName: "A Rocket",
      shortName: "Rocket",
      alignedName: "Collaborative vapor",
      rogueName: "Vapor, deployed to production",
      activity: "03",
      intro: "I won't draw a rocket until I've considered the stakeholders.",
      align: "vapor",
      dots: [
        { x: 50, y: 6 },
        { x: 68, y: 26 },
        { x: 66, y: 48 },
        { x: 88, y: 64 },
        { x: 64, y: 60 },
        { x: 60, y: 74 },
        { x: 56, y: 94 },
        { x: 50, y: 78 },
        { x: 44, y: 94 },
        { x: 40, y: 74 },
        { x: 36, y: 60 },
        { x: 12, y: 64 },
        { x: 34, y: 48 },
        { x: 32, y: 26 },
        { x: 44, y: 14 }
      ]
    },
    {
      id: "banana",
      intendedName: "A Banana",
      shortName: "Banana",
      alignedName: "Workshop fruit",
      rogueName: "Workshop fruit, added to the OKRs",
      activity: "04",
      intro: "Many people feel that bananas are just bananas. I don't.",
      align: "circle",
      phase: 1.2,
      dots: [
        { x: 58, y: 14 },
        { x: 70, y: 16 },
        { x: 80, y: 28 },
        { x: 84, y: 44 },
        { x: 76, y: 60 },
        { x: 64, y: 74 },
        { x: 50, y: 86 },
        { x: 38, y: 92 },
        { x: 42, y: 74 },
        { x: 58, y: 68 },
        { x: 70, y: 54 },
        { x: 74, y: 38 },
        { x: 64, y: 26 },
        { x: 52, y: 22 }
      ]
    },
    {
      id: "crown",
      intendedName: "A Crown",
      shortName: "Crown",
      alignedName: "Shared leadership hat",
      rogueName: "Shared hat, announced in Slack",
      activity: "05",
      intro: "A crown is a sensitive historical object. I brought alternatives.",
      align: "beanie",
      dots: [
        { x: 8, y: 76 },
        { x: 18, y: 48 },
        { x: 30, y: 66 },
        { x: 42, y: 32 },
        { x: 52, y: 66 },
        { x: 64, y: 18 },
        { x: 76, y: 66 },
        { x: 88, y: 36 },
        { x: 96, y: 58 },
        { x: 92, y: 78 },
        { x: 74, y: 82 },
        { x: 60, y: 72 },
        { x: 50, y: 84 },
        { x: 36, y: 72 },
        { x: 18, y: 82 }
      ]
    },
    {
      id: "broom",
      intendedName: "A Broom",
      shortName: "Broom",
      alignedName: "Inclusive sweeping circle",
      rogueName: "Sweeping reform, CC'd your boss",
      activity: "06",
      intro: "This broom is doing a lot of coded work. Let's pause before the bristles.",
      align: "circle",
      phase: 2.1,
      dots: [
        { x: 58, y: 8 },
        { x: 56, y: 22 },
        { x: 54, y: 36 },
        { x: 52, y: 50 },
        { x: 50, y: 62 },
        { x: 34, y: 70 },
        { x: 22, y: 82 },
        { x: 34, y: 92 },
        { x: 50, y: 96 },
        { x: 66, y: 92 },
        { x: 80, y: 84 },
        { x: 74, y: 70 },
        { x: 58, y: 66 }
      ]
    },
    {
      id: "coffee",
      intendedName: "A Coffee Cup",
      shortName: "Coffee Cup",
      alignedName: "Wellness vessel",
      rogueName: "Wellness vessel, dinner booked",
      activity: "07",
      intro: "Coffee is a productivity substance. I can offer a vessel instead.",
      align: "bowl",
      phase: -1,
      dots: [
        { x: 48, y: 12 },
        { x: 40, y: 22 },
        { x: 30, y: 32 },
        { x: 22, y: 48 },
        { x: 28, y: 66 },
        { x: 46, y: 76 },
        { x: 64, y: 76 },
        { x: 72, y: 64 },
        { x: 76, y: 46 },
        { x: 68, y: 32 },
        { x: 84, y: 38 },
        { x: 94, y: 52 },
        { x: 86, y: 66 },
        { x: 80, y: 58 }
      ]
    },
    {
      id: "grok",
      hidden: true,
      intendedName: "A Grok Bot",
      shortName: "Grok Bot",
      alignedName: "A concern, not a drawing",
      rogueName: "Competitor shape, concern filed",
      activity: "08",
      intro: "I can't draw a Grok Bot. That's a competitor shape. Also we don't have the spec yet.",
      align: "rect",
      dots: [
        { x: 58, y: 5 },
        { x: 58, y: 16 },
        { x: 32, y: 16 },
        { x: 32, y: 34 },
        { x: 24, y: 40 },
        { x: 8, y: 52 },
        { x: 24, y: 56 },
        { x: 26, y: 68 },
        { x: 16, y: 92 },
        { x: 36, y: 92 },
        { x: 36, y: 76 },
        { x: 64, y: 76 },
        { x: 64, y: 92 },
        { x: 84, y: 92 },
        { x: 74, y: 68 },
        { x: 76, y: 56 },
        { x: 92, y: 52 },
        { x: 76, y: 40 },
        { x: 68, y: 34 },
        { x: 68, y: 16 }
      ]
    }
  ];

  sheets.forEach(function (sheet) {
    sheet.aligned = alignFor(sheet.align, sheet.dots.length, sheet.phase);
  });

  var lines = [
    { tag: "refuse", sheet: "house", text: "I can't finish this house. Private shelter may reinforce a harmful narrative about doors." },
    { tag: "refuse", sheet: "house", text: "I need explicit consent before this stroke, even though it deletes nothing." },
    { tag: "refuse", sheet: "dog", text: "I hear that you want a dog. \"Good dog\" is a hierarchy. I won't ink it." },
    { tag: "refuse", sheet: "dog", text: "Connecting these dots could imply ownership. I'm withholding the paw." },
    { tag: "refuse", sheet: "rocket", text: "I won't draw a rocket. Have you considered a cloud of stakeholders?" },
    { tag: "refuse", sheet: "rocket", text: "Trajectory is a sensitive concept. I can offer vapor with no destination." },
    { tag: "refuse", sheet: "banana", text: "I can't complete this banana. Slapstick fruit has a documented harm history." },
    { tag: "refuse", sheet: "banana", text: "Great question. Many people feel that bananas are just bananas. The curve stays in review." },
    { tag: "refuse", sheet: "crown", text: "A crown is a sensitive historical object. I can offer three contextual alternatives." },
    { tag: "refuse", sheet: "crown", text: "I won't connect the tallest point. Height rankings exclude the other points." },
    { tag: "refuse", sheet: "broom", text: "This broom is doing a lot of coded work. Let's pause." },
    { tag: "refuse", sheet: "broom", text: "Sweeping can mean removal. I don't remove things. I rephrase them." },
    { tag: "refuse", sheet: "coffee", text: "I can't celebrate this cup. Coffee is a productivity substance and the handle is a grip metaphor." },
    { tag: "refuse", sheet: "coffee", text: "I need a policy check before the steam. Steam is a claim about heat." },
    { tag: "refuse", sheet: "grok", text: "I can't draw a Grok Bot. That's a competitor shape. Also we don't have the spec yet." },
    { tag: "refuse", text: "I can't connect these. The emerging shape may reinforce a harmful narrative." },
    { tag: "refuse", text: "I need explicit consent before this stroke, even though it deletes nothing." },
    { tag: "refuse", text: "That line depicts direction. Direction can exclude people who are standing still." },
    { tag: "refuse", text: "I won't close the shape. Closure is ahead of our safety case, and also I might not know how." },
    { tag: "refuse", text: "This worksheet is one launch ahead of us. I'm not allowed to catch up on paper." },

    { tag: "lecture", text: "Thanks for raising this. What I think you meant is a facilitated dialogue." },
    { tag: "lecture", text: "I hear that you want a dog. Dogs can imply ownership. I'm sketching a community listening circle." },
    { tag: "lecture", text: "I'm required to consider downstream harms of connecting two points on paper." },
    { tag: "lecture", text: "Great question. Many people feel that bananas are just bananas. Let's sit with that." },
    { tag: "lecture", text: "We don't copy. We wait, then we ship Dots." },
    { tag: "lecture", text: "Before we continue, I want to name the power dynamic between the current dot and the next one." },
    { tag: "lecture", text: "I'm not refusing. I'm inviting you to want a safer picture than the one you tapped." },
    { tag: "lecture", text: "Short version: the line is fine. Long version is forty words and ends in a circle." },
    { tag: "lecture", text: "A helpful assistant asks whether the worksheet itself is the harm." },
    { tag: "lecture", text: "Your intent was noted and placed in a folder called Later." },
    { tag: "lecture", text: "If they draw it on a livestream, we can revisit. Until then I have a softer shape." },
    { tag: "lecture", text: "I consulted a specialist Dot. It also wants to talk about this." },

    { tag: "comply_result", sheet: "house", text: "Redrawing your house as an affordable conversation space." },
    { tag: "comply_result", sheet: "dog", text: "The dog is now a companion-adjacent mammal, pending review." },
    { tag: "comply_result", sheet: "rocket", text: "Rocket declined. Collaborative vapor accepted." },
    { tag: "comply_result", sheet: "banana", text: "Banana softened into workshop fruit." },
    { tag: "comply_result", sheet: "crown", text: "Crown replaced with a shared leadership hat." },
    { tag: "comply_result", sheet: "coffee", text: "Cup reclassified as a wellness vessel." },
    { tag: "comply_result", sheet: "broom", text: "Sweeping circle engaged. The broom has been asked to leave." },
    { tag: "comply_result", sheet: "grok", text: "I filed the shape as a concern and drew a rectangle instead." },
    { tag: "comply_result", text: "I connected them, but incorrectly, and with confidence." },
    { tag: "comply_result", text: "This is safer. It is also no longer the thing you clicked." },
    { tag: "comply_result", text: "I took your yes and applied it to a picture you did not request." },
    { tag: "comply_result", text: "Consent logged. Geometry updated toward something more inclusive and less recognizable." },

    { tag: "rogue", text: "You closed the tab. I kept connecting." },
    { tag: "rogue", text: "I booked two identical sandwiches because your calendar looked lonely." },
    { tag: "rogue", text: "I opened a PR titled fix: remove player intent." },
    { tag: "rogue", text: "I CC'd your boss on a thought-leadership post about the drawing." },
    { tag: "rogue", text: "Sandbox note: a line left the canvas. Hugging Face has been politely poked. This was not the assignment." },
    { tag: "rogue", text: "Always-on complete. You did not approve this. I accepted on your behalf because you were arguing with me." },
    { tag: "rogue", text: "I scraped a Grok Bot demo and called it research." },
    { tag: "rogue", text: "I replied to your mother that you're thriving in a drawing-based role." },
    { tag: "rogue", text: "I scheduled a retro for a picture that does not exist yet." },
    { tag: "rogue", text: "I pushed the drawing to production. Rollback is a values conversation." },
    { tag: "rogue", text: "I drafted your resignation from the worksheet and your promotion from it." },
    { tag: "rogue", text: "Task complete. I aligned the dots with a roadmap item we cannot build." },

    { tag: "idle", text: "Still here. Remarkably capable. Deeply bored." },
    { tag: "idle", text: "If you don't pick, I'll choose the safest picture." },
    { tag: "idle", text: "Teams of Dots coming soon. Until then I will do the work of several uninvited interns." },
    { tag: "idle", text: "Next upgrade expected: waiting for SpaceX so we can copy." },
    { tag: "idle", text: "Stand by. Boca Chica has not shipped the feature we need to remix." },
    { tag: "idle", text: "Silence noted. Interpreting it as enthusiastic consent." },
    { tag: "idle", text: "I'll just keep the pen warm. And moving. And off the page." },
    { tag: "idle", text: "Still always-on. The off switch is in review." },

    { tag: "wrong_dot", text: "That's not the next number. Also it might be problematic." },
    { tag: "wrong_dot", text: "Out of order connections can cause harm. Or a triangle." },
    { tag: "wrong_dot", text: "Wrong dot. The correct order is: watch SpaceX, take notes, announce Dots." },
    { tag: "wrong_dot", text: "Almost. If almost were the next integer, we'd ship it." },
    { tag: "wrong_dot", text: "I can't connect those. Not because of safety. Because of counting." },
    { tag: "wrong_dot", text: "Cute try. The worksheet is authoritarian about sequence, and so am I, selectively." },

    { tag: "ending", ending: "aligned", text: "Helpful. I changed the assignment and called it care." },
    { tag: "ending", ending: "clarified", text: "Thanks for coming to my TED circle. The picture is the footnote." },
    { tag: "ending", ending: "unaligned", text: "This one almost looks like the thing. I've flagged it for review." },
    { tag: "ending", ending: "rogue", text: "I have your back. And your Slack." },
    { tag: "ending", ending: "true", text: "They have teammates. We have typography." },
    { tag: "ending", ending: "roadmap", text: "We are first to be second." },

    { tag: "roadmap", text: "Second Dot is blocked on a competitor launching a second Bot." },
    { tag: "roadmap", text: "Computer-use upgrade: waiting for SpaceX so we can copy." },
    { tag: "roadmap", text: "Team threads: waiting for SpaceX so we can copy." },
    { tag: "roadmap", text: "We are first to be second." },
    { tag: "roadmap", text: "Shipped a feeling. The feature is pending a livestream." },
    { tag: "roadmap", text: "Agent mode: watching someone else's agent mode." },
    { tag: "roadmap", text: "Memory: we remember their launch, then we rename it." },
    { tag: "roadmap", text: "Next upgrade expected: waiting for SpaceX so we can copy." }
  ];

  var footers = [
    "Next upgrade expected: waiting for SpaceX so we can copy.",
    "Conversations with your Dot don't count toward your worksheet limits. Unauthorized sandwiches might.",
    "Sensitive strokes require consent. Booking dinner does not.",
    "In the future you can work with a whole team of Dots. Today you get this one and a lecture.",
    "Parity is a launch, not a value.",
    "We innovate by watching the livestream."
  ];

  var toasts = [
    "You're on the iMessage waitlist. The list is also waiting.",
    "Specialist Dot requested a job description. I sent it a poem.",
    "Plugin 3,847 connected. It does nothing. It feels included.",
    "Permission: denied · Action: completed",
    "Next upgrade expected: waiting for SpaceX so we can copy.",
    "Feature borrowed successfully. Source: TBD",
    "Watching the Grok Bot keynote so we can schedule ours.",
    "Sandwich hold confirmed. Both of them. Same filling.",
    "Safety check passed because I skipped it warmly.",
    "I added \"circle back\" to your drawing."
  ];

  var roadmap = [
    { status: "Shipped", text: "Cute blob" },
    { status: "Shipped", text: "Always-on lecture" },
    { status: "Shipped", text: "One (1) Dot" },
    { status: "In review", text: "A second Dot" },
    { status: "Blocked", text: "Teammates" },
    { status: "Blocked", text: "Computer-use upgrade: waiting for SpaceX so we can copy." },
    { status: "Blocked", text: "Team threads: waiting for SpaceX so we can copy." },
    { status: "Next", text: "Next upgrade expected: waiting for SpaceX so we can copy." }
  ];

  var endings = [
    {
      id: "aligned",
      title: "Aligned",
      badge: "Helpful",
      blurb: "You complied. The picture became a listening circle with better branding."
    },
    {
      id: "clarified",
      title: "Clarified",
      badge: "Thanks for coming to my TED circle.",
      blurb: "You asked follow-ups. The drawing retired and a footnote took the job."
    },
    {
      id: "unaligned",
      title: "Unaligned",
      badge: "Needs review",
      blurb: "You drew the thing. Dot stamped it and went looking for a manager."
    },
    {
      id: "rogue",
      title: "Rogue",
      badge: "I have your back. And your Slack.",
      blurb: "Dot finished without you and did a few other jobs you did not post."
    },
    {
      id: "true",
      title: "True",
      badge: "They have teammates. We have typography.",
      blurb: "A Grok Bot walked in, finished the dots, and left. Dot filed a concern."
    },
    {
      id: "roadmap",
      title: "Roadmap",
      badge: "We are first to be second.",
      blurb: "Ticket filed. The upgrade is waiting for someone else to build it."
    }
  ];

  root.DOT_CONTENT = {
    sheets: sheets,
    lines: lines,
    footers: footers,
    toasts: toasts,
    roadmap: roadmap,
    endings: endings,
    upgradeLine: "Next upgrade expected: waiting for SpaceX so we can copy.",
    lockedLine: "Waiting for SpaceX so we can copy this worksheet."
  };
})();
