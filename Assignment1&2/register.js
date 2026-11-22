"use strict";

const FORBIDDEN_WORDS = [
  "blood",
  "aima",
  "hospital",
  "nosokomeio",
  "nosokomeiο",
];
const MIN_AGE = 18;
const MAX_AGE = 65;

function classify(ch) {
  if (ch >= "0" && ch <= "9") return "digit";
  const lower = ch.toLowerCase();
  const upper = ch.toUpperCase();
  if (lower !== upper) return ch === lower ? "lower" : "upper";
  return "symbol";
}

function analyzePassword(pw) {
  const chars = [...pw];
  const n = chars.length;
  if (n === 0) return { level: "weak", text: "Weak password: δώσε password." };

  const lowered = pw.toLowerCase();
  if (FORBIDDEN_WORDS.some((w) => lowered.includes(w.toLowerCase()))) {
    return { level: "weak", text: "Weak password: περιέχει απαγορευμένη ακολουθία." };
  }

  let digits = 0;
  const has = { lower: false, upper: false, symbol: false };
  const counts = new Map();
  for (const ch of chars) {
    const type = classify(ch);
    if (type === "digit") digits++;
    else has[type] = true;
    counts.set(ch, (counts.get(ch) || 0) + 1);
  }
  const maxSame = Math.max(...counts.values());

  if (digits * 2 >= n) {
    return { level: "weak", text: "Weak password: τουλάχιστον το 50% είναι αριθμοί." };
  }
  if (maxSame * 5 >= n * 2) {
    return { level: "weak", text: "Weak password: τουλάχιστον το 40% είναι ο ίδιος χαρακτήρας." };
  }
  if (digits > 0 && has.lower && has.upper && has.symbol) {
    return { level: "strong", text: "Strong password." };
  }
  return { level: "medium", text: "Medium password." };
}

function checkBirthDate(value) {
  if (!value) return { ok: false, text: "Συμπλήρωσε ημερομηνία γέννησης." };

  const [y, m, d] = value.split("-").map(Number);
  const birth = new Date(y, m - 1, d);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const youngestAllowed = new Date(today.getFullYear() - MIN_AGE, today.getMonth(), today.getDate());
  const oldestExcluded = new Date(today.getFullYear() - (MAX_AGE + 1), today.getMonth(), today.getDate());

  if (birth > youngestAllowed) {
    return { ok: false, text: `Πρέπει να είσαι τουλάχιστον ${MIN_AGE} ετών.` };
  }
  if (birth <= oldestExcluded) {
    return { ok: false, text: `Η ηλικία δεν μπορεί να ξεπερνά τα ${MAX_AGE} έτη.` };
  }
  return { ok: true, text: "" };
}

const output = document.getElementById("jsonOutput");

function setupForm(form, accountType) {
  const q = (sel) => form.querySelector(sel);
  const pw = q(".pw");
  const pw2 = q(".pw2");
  const matchMsg = q(".match-msg");
  const strengthMsg = q(".strength-msg");
  const toggleBtn = q(".toggle-pw");
  const strengthBtn = q(".check-strength");
  const birth = q(".birth");
  const birthMsg = q(".birth-msg");

  function updateMatch(force) {
    const same = pw.value === pw2.value;
    if (!same && (force || pw2.value !== "")) {
      matchMsg.textContent = "Τα passwords δεν ταιριάζουν.";
      matchMsg.className = "msg match-msg bad";
    } else if (same && pw2.value !== "") {
      matchMsg.textContent = "Τα passwords ταιριάζουν.";
      matchMsg.className = "msg match-msg good";
    } else {
      matchMsg.textContent = "";
    }
    return same;
  }

  function updateStrength() {
    const result = analyzePassword(pw.value);
    strengthMsg.textContent = result.text;
    strengthMsg.className = "msg strength-msg " + result.level;
    return result;
  }

  function updateBirth() {
    const result = checkBirthDate(birth.value);
    birthMsg.textContent = result.text;
    birthMsg.className = "msg birth-msg bad";
    return result.ok;
  }

  pw.addEventListener("input", () => { updateStrength(); updateMatch(false); });
  pw2.addEventListener("input", () => updateMatch(false));
  strengthBtn.addEventListener("click", updateStrength);
  if (birth) birth.addEventListener("change", updateBirth);

  toggleBtn.addEventListener("click", () => {
    const show = pw.type === "password";
    pw.type = pw2.type = show ? "text" : "password";
    toggleBtn.textContent = show ? "Hide password" : "Show password";
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const matchOk = updateMatch(true);
    const strength = updateStrength();
    const birthOk = birth ? updateBirth() : true;

    if (!matchOk || strength.level === "weak" || !birthOk) {
      output.textContent = "";
      return;
    }

    const data = Object.fromEntries(new FormData(form));
    delete data.confirmPassword;
    data.accountType = accountType;
    output.textContent = JSON.stringify(data, null, 2);
  });
}

function setupAddress(form) {
  const q = (sel) => form.querySelector(sel);
  const country = q(".country");
  const city = q(".city");
  const street = q(".street");
  const verifyBtn = q(".verify-address");
  const mapBtn = q(".show-map");
  const msg = q(".address-msg");
  const slot = q(".map-slot");
  const latInput = q(".lat");
  const lonInput = q(".lon");

  let verified = null;
  let mapState = null;
  let requestId = 0;

  function showMessage(text, kind) {
    msg.textContent = text;
    msg.className = "msg address-msg " + (kind || "");
  }

  function resetAddressState() {
    requestId++;
    if (mapState) {
      destroyMap(mapState.map, mapState.container);
      mapState = null;
    }
    verified = null;
    mapBtn.hidden = true;
    latInput.value = "";
    lonInput.value = "";
    showMessage("");
  }

  [country, city, street].forEach((el) => el.addEventListener("input", resetAddressState));

  verifyBtn.addEventListener("click", () => {
    resetAddressState();
    if (!country.value.trim() || !city.value.trim() || !street.value.trim()) {
      showMessage("Συμπλήρωσε χώρα, πόλη και διεύθυνση.", "bad");
      return;
    }

    const myId = requestId;
    showMessage("Έλεγχος διεύθυνσης...");

    findLocation(country.value, city.value, street.value, (result) => {
      if (myId !== requestId) return;

      if (result.status === "empty") {
        showMessage("Η διεύθυνση δεν βρέθηκε στο OpenStreetMap.", "bad");
      } else if (result.status === "notGreece") {
        showMessage("Η υπηρεσία είναι διαθέσιμη μόνο στην Ελλάδα αυτή τη στιγμή.", "bad");
      } else {
        verified = result;
        latInput.value = result.lat;
        lonInput.value = result.lon;
        mapBtn.hidden = false;
        showMessage("Η διεύθυνση επαληθεύτηκε: " + result.displayName, "good");
      }
    }, (error) => {
      if (myId !== requestId) return;
      showMessage("Σφάλμα επικοινωνίας με την υπηρεσία (" + error + ").", "bad");
    });
  });

  mapBtn.addEventListener("click", () => {
    if (!verified || mapState) return;
    const container = document.createElement("div");
    container.className = "map";
    slot.appendChild(container);
    const map = createMap(container, verified, 16);
    addMarker(map, verified, verified.displayName);
    mapState = { map, container };
  });
}

const userForm = document.getElementById("userForm");
const hospitalForm = document.getElementById("hospitalForm");

function switchForm() {
  const type = document.querySelector('input[name="accountType"]:checked').value;
  userForm.hidden = type !== "user";
  hospitalForm.hidden = type !== "hospital";
  output.textContent = "";
}

document.querySelectorAll('input[name="accountType"]').forEach((r) =>
  r.addEventListener("change", switchForm)
);

setupForm(userForm, "user");
setupForm(hospitalForm, "hospital");
setupAddress(userForm);
setupAddress(hospitalForm);
switchForm();