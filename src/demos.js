// Small demos that run fully in the browser. No network calls, no keys.
window.DEMOS = (function () {
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const stamp = (text, colour) => '<span class="ink ' + colour + ' thud">' + esc(text) + "</span>";
  const label = (text) => '<p class="demo-label">' + esc(text) + "</p>";

  // --- IOC Enricher: find IPs, domains and hashes with regular expressions ---
  const IOC = /\b(?:[a-f0-9]{64}|[a-f0-9]{40}|[a-f0-9]{32})\b|\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b|\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}\b/gi;
  function iocType(v) {
    if (/^[a-f0-9]+$/i.test(v)) return v.length === 64 ? ["hash", "SHA-256 hash"] : v.length === 40 ? ["hash", "SHA-1 hash"] : ["hash", "MD5 hash"];
    return /^[\d.]+$/.test(v) ? ["ip", "IP address"] : ["domain", "Domain"];
  }
  function ioc(el) {
    const sample = "ALERT 03:14 UTC: workstation FIN-07 made repeated connections to 203.0.113.45 and 192.0.2.118 after a user opened invoice-update.example.net.\n" +
      "Dropped file MD5: 9e107d9d372bb6826bd81d3542a419d6\nSecond stage fetched from cdn.login-check.example.org, SHA-256 e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    el.innerHTML = label("Demo with a made-up alert. Edit or paste your own text.") +
      '<div class="ioc-wrap"><div class="ioc-hl" aria-hidden="true"></div><textarea class="ioc-in" id="ioc-input" aria-label="Alert text" spellcheck="false"></textarea></div>' +
      '<div class="scroll-x"><table class="demo-table"><thead><tr><th>Indicator</th><th>Type</th></tr></thead><tbody></tbody></table></div>' +
      '<p class="demo-note">In the real tool, each of these is looked up on VirusTotal, AbuseIPDB and Shodan.</p>';
    const input = el.querySelector("textarea"), hl = el.querySelector(".ioc-hl"), body = el.querySelector("tbody");
    function scan() {
      const text = input.value, seen = new Map();
      let html = "", last = 0, m;
      IOC.lastIndex = 0;
      while ((m = IOC.exec(text))) {
        const t = iocType(m[0]);
        html += esc(text.slice(last, m.index)) + '<mark class="m-' + t[0] + '">' + esc(m[0]) + "</mark>";
        last = m.index + m[0].length;
        if (!seen.has(m[0].toLowerCase())) seen.set(m[0].toLowerCase(), [m[0], t]);
      }
      hl.innerHTML = html + esc(text.slice(last)) + "\n";
      input.style.height = "auto";
      input.style.height = input.scrollHeight + 4 + "px";
      body.innerHTML = seen.size
        ? Array.from(seen.values()).map((x) => '<tr><td><mark class="m-' + x[1][0] + '">' + esc(x[0]) + "</mark></td><td>" + x[1][1] + "</td></tr>").join("")
        : '<tr><td colspan="2">No indicators found in this text.</td></tr>';
    }
    input.value = sample;
    input.addEventListener("input", scan);
    scan();
  }

  // --- Scure: simple local checks on a URL ---
  const BAD_TLDS = ["zip", "mov", "xyz", "top", "click", "country", "gq", "tk", "ml", "cf", "work"];
  function checkUrl(raw) {
    const fired = [];
    let u;
    try { u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : "https://" + raw); } catch (err) { return null; }
    const host = u.hostname, labels = host.split(".");
    if (u.protocol === "http:") fired.push("Uses http instead of https");
    if (/^[\d.]+$/.test(host) || host.includes(":")) fired.push("Uses an IP address instead of a domain name");
    if (raw.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").includes("@")) fired.push("Contains an @, which can hide the real destination");
    if (/xn--/.test(host) || /[^\x00-\x7f]/.test(raw) || labels.some((l) => /[a-z]\d[a-z]|[a-z]{3}[01]$/.test(l))) fired.push("Has lookalike characters in the name");
    if (labels.length > 4 || host.length > 40) fired.push("Has a very long chain of subdomains");
    if (BAD_TLDS.includes(labels[labels.length - 1])) fired.push("Ends in a top-level domain often used for abuse");
    return fired;
  }
  function scure(el) {
    el.innerHTML = label("Demo only. The real app checks VirusTotal, Google Safe Browsing, URLScan.io and a sandboxed browser.") +
      '<label class="demo-field" for="scure-url">Link to check</label><input class="demo-input" id="scure-url" type="text" spellcheck="false" autocomplete="off">' +
      '<div class="demo-out" aria-live="polite"></div>';
    const input = el.querySelector("input"), out = el.querySelector(".demo-out");
    function run() {
      const raw = input.value.trim(), fired = raw ? checkUrl(raw) : null;
      if (!raw) { out.innerHTML = "<p>Type a link to check it.</p>"; return; }
      if (!fired) { out.innerHTML = "<p>That does not look like a link.</p>"; return; }
      out.innerHTML = (fired.length ? stamp("Suspicious", "red") : stamp("Safe", "green")) +
        (fired.length ? "<ul>" + fired.map((x) => "<li>" + esc(x) + "</li>").join("") + "</ul>" : "<p>None of the six local checks fired.</p>");
    }
    input.value = "http://secure-login.account-update.verify.paypa1.example.zip/@signin";
    input.addEventListener("input", run);
    run();
  }

  // --- PolicyLens: change the rule, the clause is re-checked ---
  function policy(el) {
    const clauseDays = 21;
    el.innerHTML = label("Simplified demo of the re-check idea. The real system reads whole policies and contracts.") +
      '<p class="demo-field">Policy rule</p><p class="demo-doc">Invoices must be paid within <input class="demo-num" id="policy-days" type="number" min="1" max="120" value="30" aria-label="Days allowed by the rule"> days.</p>' +
      '<p><button class="btn-quiet" data-days="30">Set 30 days</button> <button class="btn-quiet" data-days="14">Set 14 days</button></p>' +
      '<p class="demo-field">Stored contract clause</p><p class="demo-doc">The Client shall pay each invoice within ' + clauseDays + " days of receipt.</p>" +
      '<div class="demo-out" aria-live="polite"></div>';
    const input = el.querySelector("input"), out = el.querySelector(".demo-out");
    function run() {
      const days = parseInt(input.value, 10);
      if (!days) { out.innerHTML = "<p>Enter a number of days.</p>"; return; }
      out.innerHTML = clauseDays <= days
        ? stamp("Complies", "green") + "<p>" + clauseDays + " days is within the " + days + " days the rule allows.</p>"
        : stamp("Violates", "red") + "<p>The clause allows " + clauseDays + " days, but the rule now allows only " + days + ". This contract would be flagged for the legal team.</p>";
    }
    input.addEventListener("input", run);
    el.addEventListener("click", (ev) => { const b = ev.target.closest("[data-days]"); if (b) { input.value = b.dataset.days; run(); } });
    run();
  }

  // --- S.H.I.E.L.D: sort a written report with keyword rules ---
  const REPORTS = [
    "Control, I have a man collapsed near the lift lobby on level 3. He is unconscious and not responding.",
    "There is an unattended black bag beside the east entrance. It has been there for about twenty minutes.",
    "A visitor says her wallet was stolen at the food court. She saw someone walk off quickly towards the car park.",
  ];
  const TYPES = [
    ["Medical emergency", /collapsed|unconscious|bleeding|injured|not breathing/i, "High", "Call an ambulance, start first aid and keep the area clear."],
    ["Fire or smoke", /fire|smoke|burning|alarm/i, "High", "Raise the alarm, begin evacuation and call the fire service."],
    ["Suspicious item", /unattended|suspicious (bag|package|item)|left behind/i, "Medium", "Keep people away, do not touch it and escalate to the supervisor."],
    ["Theft", /stolen|theft|snatched|pickpocket/i, "Low", "Take a statement, note the description and review nearby CCTV."],
    ["Intrusion", /forced|broke in|trespass|intruder/i, "Medium", "Secure the entry point and request backup before approaching."],
  ];
  function shield(el) {
    el.innerHTML = label("Demo only. The real assistant used Whisper speech-to-text and a local Mistral model.") +
      '<p class="demo-field">Pick an officer report</p><div class="demo-picks">' +
      REPORTS.map((r, i) => '<button class="demo-pick" data-r="' + i + '">Report ' + (i + 1) + "</button>").join("") + '</div><div class="demo-out" aria-live="polite"></div>';
    const out = el.querySelector(".demo-out");
    function run(i) {
      const text = REPORTS[i], hit = TYPES.find((t) => t[1].test(text)) || ["Unclassified", null, "Low", "Ask the officer for more detail."];
      el.querySelectorAll(".demo-pick").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.r === i)));
      out.innerHTML = '<p class="demo-doc">' + esc(text) + "</p><dl class=\"demo-dl\"><dt>Incident type</dt><dd>" + hit[0] + "</dd><dt>Severity</dt><dd>" +
        stamp(hit[2], hit[2] === "High" ? "red" : "green") + "</dd><dt>Suggested next step</dt><dd>" + hit[3] + "</dd></dl>";
    }
    el.addEventListener("click", (ev) => { const b = ev.target.closest("[data-r]"); if (b) run(+b.dataset.r); });
    run(0);
  }

  return { ioc: ioc, scure: scure, policy: policy, shield: shield, checkUrl: checkUrl };
})();
