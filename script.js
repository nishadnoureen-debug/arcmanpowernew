const reduceMQ = matchMedia("(prefers-reduced-motion: reduce)");

// Mobile menu
const menuToggle = document.getElementById("menuToggle");
const nav = document.getElementById("nav");
menuToggle.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menuToggle.classList.toggle("open", open);
  menuToggle.setAttribute("aria-expanded", open);
});
nav.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    nav.classList.remove("open");
    menuToggle.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", false);
  })
);

// Header edge once the page moves
const header = document.getElementById("header");
let scrolled = null;
const onScroll = () => {
  const s = scrollY > 10;
  if (s !== scrolled) header.classList.toggle("scrolled", (scrolled = s));
};
addEventListener("scroll", onScroll, { passive: true });
onScroll();

// Current page in the nav
const currentPage = location.pathname.split("/").pop() || "index.html";
nav.querySelectorAll("a:not(.btn)").forEach((a) => {
  if (a.getAttribute("href") === currentPage) a.classList.add("active");
});

// Entrances: containers get .in, staggered children get an index, delays retire when done
document.querySelectorAll(".stagger").forEach((el) =>
  [...el.children].forEach((c, i) => c.style.setProperty("--i", i))
);
const entrance = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      el.classList.add("in");
      if (el.classList.contains("stagger")) {
        setTimeout(() => el.classList.add("done"), 800 + el.children.length * 90);
      }
      if (el.querySelector("[data-count]") || el.dataset.count) runCounters(el);
      entrance.unobserve(el);
    });
  },
  { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
);
document.querySelectorAll(".rv, .stagger, .waves, .process").forEach((el) => entrance.observe(el));

// Looping animations only run while their section is on screen
const looper = new IntersectionObserver((entries) => {
  entries.forEach((e) => e.target.classList.toggle("live", e.isIntersecting));
});
document.querySelectorAll("[data-live]").forEach((el) => looper.observe(el));
document.addEventListener("visibilitychange", () => document.body.classList.toggle("paused", document.hidden));

// Counters
function runCounters(scope) {
  scope.querySelectorAll("[data-count]").forEach((el) => {
    const target = +el.dataset.count;
    if (reduceMQ.matches) { el.textContent = target.toLocaleString(); return; }
    const start = performance.now();
    let last = "";
    const tick = (now) => {
      const p = Math.min((now - start) / 1600, 1);
      const text = Math.round((1 - Math.pow(1 - p, 3)) * target).toLocaleString();
      if (text !== last) el.textContent = last = text;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
reduceMQ.addEventListener("change", (e) => {
  if (!e.matches) return;
  document.querySelectorAll("[data-count]").forEach((el) => (el.textContent = (+el.dataset.count).toLocaleString()));
  document.querySelectorAll(".rv, .stagger, .waves, .process").forEach((el) => el.classList.add("in", "done"));
});

// Build your crew
const builder = document.getElementById("crewBuilder");
if (builder) {
  const counts = {};
  const total = document.getElementById("crewTotal");
  const summary = document.getElementById("crewSummary");
  const grid = document.getElementById("crewGrid");
  const send = document.getElementById("crewSend");
  const MAX_DOTS = 60;

  const render = () => {
    const picked = Object.entries(counts).filter(([, n]) => n > 0);
    const sum = picked.reduce((a, [, n]) => a + n, 0);
    total.textContent = sum;
    summary.textContent = sum
      ? picked.map(([t, n]) => `${n} ${t}`).join(", ")
      : "Add the trades you need to see your crew take shape.";

    const shown = grid.querySelectorAll("i").length;
    const want = Math.min(sum, MAX_DOTS);
    for (let i = shown; i < want; i++) grid.insertBefore(document.createElement("i"), grid.querySelector(".crew-more"));
    for (let i = shown; i > want; i--) grid.querySelectorAll("i")[i - 1].remove();
    let more = grid.querySelector(".crew-more");
    if (sum > MAX_DOTS) {
      if (!more) { more = document.createElement("span"); more.className = "crew-more"; grid.append(more); }
      more.textContent = `+${sum - MAX_DOTS} more`;
    } else if (more) more.remove();

    const crew = picked.map(([t, n]) => `${t}:${n}`).join(",");
    send.href = sum ? `contact.html?crew=${encodeURIComponent(crew)}#quote` : "contact.html#quote";
    send.setAttribute("aria-disabled", sum ? "false" : "true");
  };

  builder.querySelectorAll(".trade").forEach((row) => {
    const name = row.dataset.trade;
    const out = row.querySelector("output");
    counts[name] = 0;
    row.querySelectorAll("button").forEach((b) =>
      b.addEventListener("click", () => {
        counts[name] = Math.max(0, Math.min(500, counts[name] + +b.dataset.step));
        out.textContent = counts[name];
        row.classList.toggle("on", counts[name] > 0);
        render();
      })
    );
  });
  render();
}

// Contact form: prefill from the crew builder, then open the visitor's email app
const form = document.getElementById("contactForm");
if (form) {
  const crew = new URLSearchParams(location.search).get("crew");
  if (crew) {
    const parts = crew.split(",").map((p) => p.split(":")).filter(([t, n]) => t && +n > 0);
    if (parts.length) {
      const sum = parts.reduce((a, [, n]) => a + +n, 0);
      form.workers.value = sum;
      form.message.value = "Crew needed:\n" + parts.map(([t, n]) => `- ${n} x ${t}`).join("\n") + "\n\nSite location:\nStart date:\nDuration:";
      const match = [...form.service.options].find((o) => o.text.toLowerCase().includes(parts[0][0].toLowerCase()));
      form.service.value = parts.length === 1 && match ? match.value : "Mixed crew";
      document.getElementById("prefillNote").hidden = false;
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const d = new FormData(form);
    const subject = `Manpower quote request: ${d.get("service")}`;
    const body = [
      `Name: ${d.get("name")}`,
      `Company: ${d.get("company")}`,
      `Email: ${d.get("email")}`,
      `Phone: ${d.get("phone")}`,
      `Service: ${d.get("service")}`,
      `Workers needed: ${d.get("workers")}`,
      "",
      d.get("message"),
    ].join("\n");
    location.href = `mailto:hr@arcmanpower.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    document.getElementById("formOk").hidden = false;
  });
}

document.getElementById("year").textContent = new Date().getFullYear();

// Motion pass: word reveals, photo wipes, parallax, card tilt, scroll progress
if (!reduceMQ.matches) {
  // Headings rise in word by word
  const splitWords = (el) => {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 1) return walk(n);
        if (n.nodeType !== 3 || !n.textContent.trim()) return;
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) return frag.append(part);
          const w = document.createElement("span");
          w.className = "w";
          w.innerHTML = "<span></span>";
          w.firstChild.textContent = part;
          w.firstChild.style.setProperty("--wi", i++);
          frag.append(w);
        });
        n.replaceWith(frag);
      });
    };
    el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
    walk(el);
    el.classList.add("wsplit");
  };
  document.querySelectorAll("h1, h2").forEach((h) => { splitWords(h); entrance.observe(h); });

  // Photos wipe up into view. A fully clipped photo never counts as on screen,
  // so its unclipped parent is what gets watched.
  const wipeObs = new IntersectionObserver(
    (es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.querySelectorAll(":scope > .wipe").forEach((w) => w.classList.add("in"));
      wipeObs.unobserve(e.target);
    }),
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );
  document.querySelectorAll(".card-img, .sd-panel, .ind-img, .hero-photo").forEach((el) => {
    el.classList.add("wipe");
    wipeObs.observe(el.parentElement);
  });

  // Parallax on banner and hero photos, only while their (unclipped) holder is on screen
  const parImgs = [...document.querySelectorAll(".page-hero-bg img, .hero-photo img")];
  const holderImg = new Map(parImgs.map((img) => [img.closest(".page-hero-bg, .hero-art"), img]));
  parImgs.forEach((img) => img.setAttribute("data-par", ""));
  const visible = new Set();
  const parObs = new IntersectionObserver((es) => es.forEach((e) => {
    const img = holderImg.get(e.target);
    e.isIntersecting ? visible.add(img) : visible.delete(img);
  }));
  holderImg.forEach((_, holder) => parObs.observe(holder));

  const bar = document.createElement("div");
  bar.className = "progress";
  bar.setAttribute("aria-hidden", "true");
  document.body.append(bar);

  let ticking = false;
  const frame = () => {
    ticking = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.setProperty("--p", max > 0 ? (scrollY / max).toFixed(4) : 0);
    visible.forEach((img) => {
      const r = img.parentElement.getBoundingClientRect();
      const offset = (r.top + r.height / 2 - innerHeight / 2) * -0.12;
      img.style.setProperty("--py", offset.toFixed(1) + "px");
    });
  };
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener("scroll", request, { passive: true });
  addEventListener("resize", request);
  request();

  // Cards tilt toward the pointer
  if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.querySelectorAll(".card, .ind-card").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty("--rx", (-y * 6).toFixed(2) + "deg");
        card.style.setProperty("--ry", (x * 8).toFixed(2) + "deg");
      });
      card.addEventListener("pointerleave", () => { card.style.removeProperty("--rx"); card.style.removeProperty("--ry"); });
    });
  }
}
