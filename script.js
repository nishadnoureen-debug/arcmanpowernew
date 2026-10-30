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
    // TODO: replace with the real company email
    location.href = `mailto:info@arcmanpower.ae?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    document.getElementById("formOk").hidden = false;
  });
}

document.getElementById("year").textContent = new Date().getFullYear();
