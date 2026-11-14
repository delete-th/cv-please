import "./style.css";
import { jobs, profile, projects, skills } from "./content";

type Verdict = "approved" | "denied";

const app = document.querySelector<HTMLDivElement>("#app")!;
const today = new Date().toLocaleDateString("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

app.innerHTML = `
  <header class="topbar">
    <div class="brand">CV&nbsp;PLEASE <span>Hiring Checkpoint · Desk 04</span></div>
    <div class="status">
      <span>${today}</span>
      <span>File ${profile.fileNo}</span>
      <span id="status-verdict" class="pending">Verdict: pending</span>
    </div>
  </header>

  <main class="layout">
    <aside class="booth" aria-label="Applicant window">
      <div class="window">
        <svg viewBox="0 0 200 220" role="img" aria-label="Applicant waiting at the window">
          <rect width="200" height="220" class="w-bg" />
          <g class="w-lines">
            <line x1="0" y1="55" x2="200" y2="55" /><line x1="0" y1="110" x2="200" y2="110" />
            <line x1="0" y1="165" x2="200" y2="165" />
          </g>
          <circle cx="100" cy="92" r="34" class="w-fig" />
          <path d="M30 220 C30 160 60 138 100 138 C140 138 170 160 170 220 Z" class="w-fig" />
          <rect x="78" y="168" width="44" height="30" rx="2" class="w-badge" />
        </svg>
        <div class="sill"></div>
      </div>
      <div class="dialog">
        <p><b>Inspector (you):</b> Documents.</p>
        <p><b>Applicant:</b> Everything is on the desk. Take your time.</p>
      </div>
      <div class="memo">
        <h2>Standing orders</h2>
        <ol>
          <li>Drag documents to inspect them.</li>
          <li>Check identity, record, skills and exhibits.</li>
          <li>Stamp the application: approve or deny.</li>
        </ol>
      </div>
    </aside>

    <section class="desk" id="desk" aria-label="Inspection desk">
      <article class="doc idcard" data-x="2" data-y="4" data-r="-2" tabindex="0">
        <header><span>Identity Card</span><span>${profile.fileNo}</span></header>
        <div class="id-body">
          <div class="photo" aria-hidden="true"><span>PHOTO</span></div>
          <dl>
            <dt>Name</dt><dd>${profile.name}</dd>
            <dt>Occupation</dt><dd>${profile.role}</dd>
            <dt>Residence</dt><dd>${profile.location}</dd>
          </dl>
        </div>
        <p class="statement">${profile.summary}</p>
      </article>

      <article class="doc record" data-x="34" data-y="2" data-r="1.5" tabindex="0">
        <header><span>Employment Record</span><span>Form E-2</span></header>
        <table>
          <tbody>
            ${jobs
              .map(
                (j) => `<tr>
                  <th scope="row">${j.period}</th>
                  <td><b>${j.role}</b> · ${j.employer}<br /><small>${j.note}</small></td>
                </tr>`,
              )
              .join("")}
          </tbody>
        </table>
        <div class="seal" aria-hidden="true">VERIFIED</div>
      </article>

      <article class="doc cert" data-x="74" data-y="5" data-r="-1" tabindex="0">
        <header><span>Certificate of Skills</span><span>Form S-7</span></header>
        ${skills
          .map(
            (s) => `<h3>${s.group}</h3>
              <ul>${s.items.map((i) => `<li>${i}</li>`).join("")}</ul>`,
          )
          .join("")}
      </article>

      <article class="doc dossier" data-x="5" data-y="56" data-r="1" tabindex="0">
        <header><span>Project Dossier</span><span>${projects.length} exhibits</span></header>
        <div class="exhibits">
          ${projects
            .map(
              (p) => `<a class="exhibit" href="${p.url}">
                <span class="code">${p.code}</span>
                <b>${p.name}</b>
                <small>${p.summary}</small>
              </a>`,
            )
            .join("")}
        </div>
      </article>

      <article class="doc application" id="application" data-x="56" data-y="54" data-r="-1.5" tabindex="0">
        <header><span>Application for Employment</span><span>Form A-1</span></header>
        <p>The applicant named on file <b>${profile.fileNo}</b> requests entry to your team.</p>
        <div class="verdict-box" id="verdict-box" aria-live="polite">
          <span class="hint">Inspector's stamp here</span>
        </div>
      </article>

      <article class="doc slip" id="slip" hidden tabindex="0"></article>
    </section>
  </main>

  <footer class="tray">
    <button class="stamp approve" data-verdict="approved"><i></i>Approve</button>
    <button class="stamp deny" data-verdict="denied"><i></i>Deny</button>
    <button class="reset" id="reset">Tidy desk</button>
  </footer>
`;

const desk = document.querySelector<HTMLElement>("#desk")!;
const docs = [...desk.querySelectorAll<HTMLElement>(".doc")];
const isStacked = () => window.matchMedia("(max-width: 860px)").matches;
let topZ = 10;

function place(doc: HTMLElement) {
  doc.style.left = `${doc.dataset.x}%`;
  doc.style.top = `${doc.dataset.y}%`;
  doc.style.setProperty("--r", `${doc.dataset.r ?? 0}deg`);
}

function raise(doc: HTMLElement) {
  doc.style.zIndex = String(++topZ);
}

function moveTo(doc: HTMLElement, x: number, y: number) {
  const maxX = desk.clientWidth - 60;
  const maxY = desk.clientHeight - 40;
  doc.style.left = `${Math.min(Math.max(x, 60 - doc.offsetWidth), maxX)}px`;
  doc.style.top = `${Math.min(Math.max(y, 0), maxY)}px`;
}

docs.forEach((doc) => {
  place(doc);

  doc.addEventListener("pointerdown", (e) => {
    if (isStacked() || (e.target as HTMLElement).closest("a, button")) return;
    raise(doc);
    const startX = e.clientX - doc.offsetLeft;
    const startY = e.clientY - doc.offsetTop;
    doc.setPointerCapture(e.pointerId);
    doc.classList.add("dragging");

    const onMove = (ev: PointerEvent) => moveTo(doc, ev.clientX - startX, ev.clientY - startY);
    const onUp = () => {
      doc.classList.remove("dragging");
      doc.removeEventListener("pointermove", onMove);
      doc.removeEventListener("pointerup", onUp);
      doc.removeEventListener("pointercancel", onUp);
    };
    doc.addEventListener("pointermove", onMove);
    doc.addEventListener("pointerup", onUp);
    doc.addEventListener("pointercancel", onUp);
  });

  doc.addEventListener("focus", () => raise(doc));
  doc.addEventListener("keydown", (e) => {
    const step: Record<string, [number, number]> = {
      ArrowLeft: [-24, 0],
      ArrowRight: [24, 0],
      ArrowUp: [0, -24],
      ArrowDown: [0, 24],
    };
    const d = step[e.key];
    if (!d || isStacked()) return;
    e.preventDefault();
    moveTo(doc, doc.offsetLeft + d[0], doc.offsetTop + d[1]);
  });
});

const verdictBox = document.querySelector<HTMLElement>("#verdict-box")!;
const application = document.querySelector<HTMLElement>("#application")!;
const slip = document.querySelector<HTMLElement>("#slip")!;
const statusVerdict = document.querySelector<HTMLElement>("#status-verdict")!;

function stamp(verdict: Verdict) {
  raise(application);
  const tilt = (Math.random() * 10 - 5).toFixed(1);
  verdictBox.innerHTML = `<span class="mark ${verdict}" style="--tilt:${tilt}deg">${verdict}</span>`;
  statusVerdict.textContent = `Verdict: ${verdict}`;
  statusVerdict.className = verdict;

  slip.className = `doc slip ${verdict}`;
  slip.innerHTML =
    verdict === "approved"
      ? `<header><span>Entry Permit</span><span>Issued ${today}</span></header>
         <p>Entry granted. The applicant may be contacted at:</p>
         <p class="contact"><a href="mailto:${profile.email}">${profile.email}</a></p>
         <p class="links">${profile.links.map((l) => `<a href="${l.url}">${l.label}</a>`).join(" · ")}</p>`
      : `<header><span>Citation</span><span>Notice 1 of 3</span></header>
         <p>Protocol violation: applicant denied without sufficient cause.</p>
         <p><small>No penalty this time. Re-inspect the dossier and reconsider.</small></p>`;
  slip.hidden = false;
  slip.dataset.x = "28";
  slip.dataset.y = "33";
  slip.dataset.r = verdict === "approved" ? "2" : "-3";
  place(slip);
  raise(slip);
  if (isStacked()) slip.scrollIntoView({ behavior: "smooth", block: "center" });
}

document.querySelectorAll<HTMLButtonElement>(".stamp").forEach((btn) => {
  btn.addEventListener("click", () => stamp(btn.dataset.verdict as Verdict));
});

document.querySelector("#reset")!.addEventListener("click", () => {
  docs.forEach(place);
  slip.hidden = true;
  verdictBox.innerHTML = `<span class="hint">Inspector's stamp here</span>`;
  statusVerdict.textContent = "Verdict: pending";
  statusVerdict.className = "pending";
});
