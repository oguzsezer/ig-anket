// Survey page: one question per screen, text and voice answers, autosave, final lock.
// Backend: Apps Script web app (see apps-script/Code.gs). Token "demo-uretici", "demo-ajans"
// or "demo-marka" runs the page with browser storage only, for previews.
(function () {
  "use strict";

  var API = window.ANKET_API_URL || "";
  var token = new URLSearchParams(location.search).get("t") || "";
  var demo = /^demo-(uretici|ajans|marka)$/.test(token);
  var app = document.getElementById("app");

  var S = null;          // survey definition
  var flat = [];         // flat list of questions
  var answers = {};      // q -> { text, audio }
  var idx = -1;          // -1 intro, 0..n-1 question, n review
  var audioUrls = {};    // q -> object URL for playback
  var textTimers = {};
  var dirty = {};
  var pending = 0;
  var statusEl = null;
  var rec = null;        // active recording state

  var MAX_SECONDS = 300;
  var DRAFT_KEY = "anket-draft-" + token;
  var POS_KEY = "anket-pos-" + token;

  // ---------- helpers ----------

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (k === "text") {
          n.textContent = v;
        } else if (k === "class") {
          n.className = v;
        } else if (k.indexOf("on") === 0) {
          n.addEventListener(k.slice(2), v);
        } else if (v === true) {
          n.setAttribute(k, "");
        } else if (v !== false && v != null) {
          n.setAttribute(k, v);
        }
      });
    }
    (kids || []).forEach(function (c) {
      if (c == null) {
        return;
      }
      n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return n;
  }

  function svg(path) {
    var w = document.createElement("span");
    w.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + "</svg>";
    return w.firstChild;
  }
  var ICON_MIC = '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/>';
  var ICON_STOP = '<rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor"/>';
  var ICON_CHECK = '<path d="M5 12.5l4.5 4.5L19 7.5"/>';

  function you(sen, siz) {
    return S && S.you === "siz" ? siz : sen;
  }

  function fmtTime(s) {
    var m = Math.floor(s / 60);
    var r = Math.floor(s % 60);
    return m + ":" + (r < 10 ? "0" : "") + r;
  }

  function blobToB64(blob) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(String(fr.result).split(",")[1] || ""); };
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  }

  function b64ToBlob(b64, mime) {
    var bin = atob(b64);
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) {
      arr[i] = bin.charCodeAt(i);
    }
    return new Blob([arr], { type: mime });
  }

  function isAnswered(q) {
    var a = answers[q];
    return !!(a && ((a.text && a.text.trim()) || a.audio));
  }

  // ---------- API ----------

  function api(action, body) {
    body = body || {};
    body.action = action;
    body.token = token;
    if (demo) {
      return demoApi(body);
    }
    return fetch(API, { method: "POST", body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res.ok) {
          var e = new Error(res.error || "error");
          e.code = res.error;
          throw e;
        }
        return res;
      });
  }

  function demoApi(b) {
    var key = "anket-demo-" + token;
    var db = JSON.parse(localStorage.getItem(key) || '{"answers":{},"audio":{},"locked":false}');
    var res = { ok: true };
    var q = String(b.q);
    if (b.action === "load") {
      res = { ok: true, kod: "DEMO", tur: token.slice(5), locked: db.locked, answers: db.answers };
    } else if (db.locked && b.action !== "getAudio") {
      var e = new Error("locked");
      e.code = "locked";
      return Promise.reject(e);
    } else if (b.action === "save") {
      db.answers[q] = db.answers[q] || {};
      db.answers[q].text = b.text;
    } else if (b.action === "audio") {
      db.answers[q] = db.answers[q] || {};
      db.answers[q].audio = true;
      try {
        db.audio[q] = { mime: b.mime, data: b.data };
        localStorage.setItem(key, JSON.stringify(db));
      } catch (err) {
        delete db.audio[q];
      }
    } else if (b.action === "deleteAudio") {
      if (db.answers[q]) {
        db.answers[q].audio = false;
      }
      delete db.audio[q];
    } else if (b.action === "getAudio") {
      if (!db.audio[q]) {
        var e2 = new Error("no_audio");
        e2.code = "no_audio";
        return Promise.reject(e2);
      }
      res = { ok: true, mime: db.audio[q].mime, data: db.audio[q].data };
    } else if (b.action === "submit") {
      db.locked = true;
    }
    localStorage.setItem(key, JSON.stringify(db));
    return new Promise(function (resolve) { setTimeout(function () { resolve(res); }, 250); });
  }

  // ---------- status ----------

  function setStatus(text, bad) {
    if (!statusEl) {
      return;
    }
    statusEl.textContent = text;
    statusEl.className = "status" + (bad ? " bad" : "");
  }

  function refreshStatus() {
    if (pending > 0) {
      setStatus("Kaydediliyor…");
    } else if (Object.keys(dirty).length) {
      setStatus("Kaydedilemedi, tekrar denenecek", true);
    } else {
      setStatus("Kaydedildi");
    }
  }

  function track(promise) {
    pending++;
    refreshStatus();
    return promise.then(function (v) {
      pending--;
      refreshStatus();
      return v;
    }, function (err) {
      pending--;
      refreshStatus();
      if (err && err.code === "locked") {
        renderDone();
      }
      throw err;
    });
  }

  // ---------- text saving ----------

  function saveDraftLocal() {
    try {
      var d = {};
      Object.keys(answers).forEach(function (q) { d[q] = answers[q].text || ""; });
      localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    } catch (err) {
      // Storage is full or blocked. The server copy still exists.
    }
  }

  function scheduleText(q) {
    dirty[q] = true;
    clearTimeout(textTimers[q]);
    textTimers[q] = setTimeout(function () { flushText(q); }, 1200);
    setStatus("Yazılıyor…");
  }

  function flushText(q) {
    clearTimeout(textTimers[q]);
    if (!dirty[q]) {
      return Promise.resolve();
    }
    delete dirty[q];
    var item = flat[q - 1];
    var payload = { q: q, text: (answers[q] && answers[q].text) || "" };
    if (item) {
      payload.section = item.sec;
      payload.question = item.t;
    } else if (q === 0) {
      payload.section = "Onay";
      payload.question = "Yanıtların ve ses kayıtlarının yalnızca bu araştırma için kullanılmasına onay";
    }
    return track(api("save", payload)).catch(function (err) {
      if (!err || err.code !== "locked") {
        dirty[q] = true;
        refreshStatus();
      }
    });
  }

  function flushAll() {
    return Promise.all(Object.keys(dirty).map(function (q) { return flushText(Number(q)); }));
  }

  window.addEventListener("online", function () { flushAll(); });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      flushAll();
    }
  });

  // ---------- frame ----------

  function frame(content, bottom, progressShown) {
    app.innerHTML = "";
    if (progressShown) {
      var pct = Math.round((Math.max(idx, 0) / flat.length) * 100);
      statusEl = el("span", { class: "status", "aria-live": "polite" });
      var label = idx >= flat.length ? "Gözden geçir" : "Soru " + (idx + 1) + " / " + flat.length;
      app.appendChild(el("header", { class: "topbar" }, [
        el("div", { class: "progress", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(pct) }, [
          el("span", { style: "width:" + pct + "%" }),
        ]),
        el("div", { class: "topline" }, [el("span", { text: label }), statusEl]),
      ]));
      refreshStatus();
    } else {
      statusEl = null;
    }
    app.appendChild(content);
    if (bottom) {
      app.appendChild(bottom);
    }
    window.scrollTo(0, 0);
  }

  function go(i) {
    stopRecording(true);
    flushAll();
    idx = i;
    try {
      if (i >= 0) {
        localStorage.setItem(POS_KEY, String(i));
      }
    } catch (err) {
      // Ignore.
    }
    if (i < 0) {
      renderIntro();
    } else if (i >= flat.length) {
      renderReview();
    } else {
      renderQuestion(i);
    }
  }

  // ---------- intro ----------

  function renderIntro() {
    var returning = flat.some(function (f) { return isAnswered(f.n); });
    var consented = !!(answers[0] && answers[0].text);
    var start = el("button", { class: "btn btn-primary btn-wide", disabled: !consented, text: returning ? "Kaldığın yerden devam et" : "Başla" });
    var box = el("input", { type: "checkbox", id: "consent", checked: consented });
    box.addEventListener("change", function () { start.disabled = !box.checked; });
    start.addEventListener("click", function () {
      if (!consented) {
        answers[0] = { text: "Evet" };
        dirty[0] = true;
        flushText(0);
      }
      var pos = Number(localStorage.getItem(POS_KEY) || 0);
      go(returning && pos >= 0 && pos <= flat.length ? pos : 0);
    });

    var how = [
      you("Her soruyu yazarak ya da sesle yanıtlayabilirsin. İkisini birlikte de kullanabilirsin.", "Her soruyu yazarak ya da sesle yanıtlayabilirsiniz. İkisini birlikte de kullanabilirsiniz."),
      you("Yanıtların kendiliğinden kaydedilir. Ara verip aynı linkle sonra devam edebilirsin.", "Yanıtlarınız kendiliğinden kaydedilir. Ara verip aynı linkle sonra devam edebilirsiniz."),
      you("Mümkünse son zamanlarda yaşadığın somut bir örnekle anlat.", "Mümkünse son zamanlarda yaşadığınız somut bir örnekle anlatın."),
      you("Kendi adını, başka kişilerin, hesapların ya da markaların adlarını söyleme.", "Kendi adınızı, şirket adınızı, başka kişilerin, hesapların ya da markaların adlarını söylemeyin."),
      you("Yanıtlamak istemediğin soruyu boş bırakabilirsin.", "Yanıtlamak istemediğiniz soruyu boş bırakabilirsiniz."),
      you("Sonunda yanıtlarını gözden geçirip gönderirsin. Gönderdikten sonra değişiklik yapılamaz.", "Sonunda yanıtlarınızı gözden geçirip gönderirsiniz. Gönderdikten sonra değişiklik yapılamaz."),
    ];

    var content = el("section", { class: "content intro" }, [
      el("h1", { text: S.title }),
      el("p", { class: "meta", text: flat.length + " soru, yaklaşık " + S.minutes + " dakika" }),
      el("p", { text: S.intro }),
      el("h2", { text: "Nasıl yanıtlanır?" }),
      el("ul", null, how.map(function (h) { return el("li", { text: h }); })),
      el("label", { class: "consent", for: "consent" }, [
        box,
        el("span", { text: you("Yanıtlarımın ve ses kayıtlarımın yalnızca bu araştırma için kullanılmasını kabul ediyorum.", "Yanıtlarımın ve ses kayıtlarımın yalnızca bu araştırma için kullanılmasını kabul ediyorum.") }),
      ]),
    ]);
    frame(content, el("footer", { class: "bottombar" }, [start]), false);
  }

  // ---------- question ----------

  function renderQuestion(i) {
    var item = flat[i];
    var q = item.n;
    answers[q] = answers[q] || { text: "", audio: false };

    var ta = el("textarea", {
      id: "answer",
      rows: "5",
      placeholder: you("Yanıtını buraya yaz…", "Yanıtınızı buraya yazın…"),
    });
    ta.value = answers[q].text || "";
    ta.addEventListener("input", function () {
      answers[q].text = ta.value;
      saveDraftLocal();
      scheduleText(q);
    });
    ta.addEventListener("blur", function () { flushText(q); });

    var kids = [el("p", { class: "section-name", text: item.sec })];
    if (item.concept) {
      kids.push(el("div", { class: "concept" }, [el("p", { text: item.concept })]));
    }
    kids.push(el("h1", { class: "question", id: "qtext", text: item.t }));
    if (item.h) {
      kids.push(el("p", { class: "hint", text: item.h }));
    }
    kids.push(el("label", { class: "sr-only", for: "answer", text: "Yazılı yanıt" }));
    kids.push(ta);
    var voiceBox = el("div", { class: "voice" });
    kids.push(voiceBox);
    renderVoice(voiceBox, q);

    var back = el("button", { class: "btn btn-ghost", text: "Geri", onclick: function () { go(i - 1); } });
    var last = i === flat.length - 1;
    var next = el("button", { class: "btn btn-primary", text: last ? "Gözden geçir" : "İleri", onclick: function () { go(i + 1); } });
    frame(el("section", { class: "content" }, kids), el("footer", { class: "bottombar" }, [back, next]), true);
  }

  function canRecord() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  }

  function renderVoice(box, q) {
    box.innerHTML = "";
    var a = answers[q];

    if (rec && rec.q === q) {
      var stopBtn = el("button", { class: "mic rec", "aria-label": "Kaydı bitir", onclick: function () { stopRecording(false); } }, [svg(ICON_STOP)]);
      rec.btn = stopBtn;
      rec.timerEl = el("span", { class: "timer", text: fmtTime(rec.seconds) });
      box.appendChild(el("div", { class: "voice-row" }, [
        stopBtn,
        el("div", null, [
          el("div", { class: "voice-label" }, ["Kaydediliyor ", rec.timerEl]),
          el("div", { class: "voice-sub", text: "Bitirmek için kare düğmeye bas. En fazla 5 dakika." }),
        ]),
      ]));
      return;
    }

    if (a.uploading) {
      box.appendChild(el("div", { class: "voice-row" }, [
        el("div", null, [
          el("div", { class: "voice-label", text: "Ses kaydı kaydediliyor…" }),
          el("div", { class: "voice-sub", text: you("Bu birkaç saniye sürebilir. Sonraki soruya geçebilirsin.", "Bu birkaç saniye sürebilir. Sonraki soruya geçebilirsiniz.") }),
        ]),
      ]));
      return;
    }

    if (a.audio) {
      box.appendChild(el("div", { class: "voice-label", text: "Sesli yanıt" }));
      if (audioUrls[q]) {
        box.appendChild(el("audio", { controls: true, preload: "metadata", src: audioUrls[q] }));
      } else {
        var listen = el("button", { class: "btn btn-small", text: "Kaydı dinle" });
        listen.addEventListener("click", function () {
          listen.disabled = true;
          listen.textContent = "Yükleniyor…";
          api("getAudio", { q: q }).then(function (res) {
            audioUrls[q] = URL.createObjectURL(b64ToBlob(res.data, res.mime));
            renderVoice(box, q);
            var au = box.querySelector("audio");
            if (au) {
              au.play().catch(function () {});
            }
          }).catch(function () {
            listen.disabled = false;
            listen.textContent = "Yüklenemedi, tekrar dene";
          });
        });
        box.appendChild(el("div", { class: "voice-actions" }, [listen]));
      }
      var actions = el("div", { class: "voice-actions" }, [
        canRecord() ? el("button", { class: "btn btn-small", text: "Yeniden kaydet", onclick: function () { startRecording(q, box); } }) : null,
        el("button", { class: "btn btn-small btn-danger-text", text: "Kaydı sil", onclick: function () { deleteAudio(q, box); } }),
      ]);
      box.appendChild(actions);
      if (a.error) {
        box.appendChild(el("p", { class: "note warn", text: a.error }));
      }
      return;
    }

    if (!canRecord()) {
      box.appendChild(el("p", { class: "note", style: "margin:0", text: you(
        "Bu tarayıcı ses kaydını desteklemiyor. Sesle yanıtlamak için linki Chrome ya da Safari'de aç. Klavyedeki mikrofonla konuşarak da yazabilirsin.",
        "Bu tarayıcı ses kaydını desteklemiyor. Sesle yanıtlamak için linki Chrome ya da Safari'de açın. Klavyedeki mikrofonla konuşarak da yazabilirsiniz.") }));
      return;
    }

    var mic = el("button", { class: "mic", "aria-label": "Sesle yanıtla", onclick: function () { startRecording(q, box); } }, [svg(ICON_MIC)]);
    box.appendChild(el("div", { class: "voice-row" }, [
      mic,
      el("div", null, [
        el("div", { class: "voice-label", text: "Sesle yanıtla" }),
        el("div", { class: "voice-sub", text: you("Yazmak yerine konuşabilirsin. Kaydı sonra dinleyip değiştirebilirsin.", "Yazmak yerine konuşabilirsiniz. Kaydı sonra dinleyip değiştirebilirsiniz.") }),
      ]),
    ]));
    if (a.error) {
      box.appendChild(el("p", { class: "note warn", text: a.error }));
    }
  }

  function pickMime() {
    var opts = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"];
    for (var i = 0; i < opts.length; i++) {
      if (window.MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(opts[i])) {
        return opts[i];
      }
    }
    return "";
  }

  function startRecording(q, box) {
    if (rec) {
      return;
    }
    answers[q].error = "";
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      var mime = pickMime();
      var mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      var chunks = [];
      rec = { q: q, box: box, mr: mr, stream: stream, seconds: 0, discard: false };
      mr.ondataavailable = function (e) {
        if (e.data && e.data.size) {
          chunks.push(e.data);
        }
      };
      mr.onstop = function () {
        var r = rec;
        rec = null;
        cleanupRec(r);
        if (r.discard || !chunks.length) {
          if (r.box.isConnected) {
            renderVoice(r.box, q);
          }
          return;
        }
        var blob = new Blob(chunks, { type: mr.mimeType || mime || "audio/webm" });
        uploadAudio(q, blob, r.box);
      };
      setupMeter(rec);
      rec.tick = setInterval(function () {
        rec.seconds++;
        if (rec.timerEl) {
          rec.timerEl.textContent = fmtTime(rec.seconds);
        }
        if (rec.seconds >= MAX_SECONDS) {
          stopRecording(false);
        }
      }, 1000);
      mr.start(1000);
      renderVoice(box, q);
    }).catch(function () {
      answers[q].error = you(
        "Mikrofona izin verilmedi. Tarayıcı ayarlarından izin verebilir ya da yazarak yanıtlayabilirsin.",
        "Mikrofona izin verilmedi. Tarayıcı ayarlarından izin verebilir ya da yazarak yanıtlayabilirsiniz.");
      renderVoice(box, q);
    });
  }

  function setupMeter(r) {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      r.ctx = new Ctx();
      var src = r.ctx.createMediaStreamSource(r.stream);
      var an = r.ctx.createAnalyser();
      an.fftSize = 512;
      src.connect(an);
      var buf = new Uint8Array(an.fftSize);
      var loop = function () {
        if (rec !== r) {
          return;
        }
        an.getByteTimeDomainData(buf);
        var sum = 0;
        for (var i = 0; i < buf.length; i++) {
          var v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        var level = Math.min(1, Math.sqrt(sum / buf.length) * 4);
        if (r.btn) {
          r.btn.style.setProperty("--level", level.toFixed(2));
        }
        r.raf = requestAnimationFrame(loop);
      };
      loop();
    } catch (err) {
      // The level ring is optional.
    }
  }

  function cleanupRec(r) {
    clearInterval(r.tick);
    cancelAnimationFrame(r.raf);
    r.stream.getTracks().forEach(function (t) { t.stop(); });
    if (r.ctx) {
      r.ctx.close().catch(function () {});
    }
  }

  // leaving = true when the person leaves the question while recording. The recording is still saved.
  function stopRecording(leaving) {
    if (!rec) {
      return;
    }
    if (rec.mr.state !== "inactive") {
      rec.mr.stop();
    }
    if (leaving) {
      rec.box = document.createElement("div");
    }
  }

  function uploadAudio(q, blob, box) {
    var a = answers[q];
    a.uploading = true;
    if (box.isConnected) {
      renderVoice(box, q);
    }
    var item = flat[q - 1];
    track(blobToB64(blob).then(function (b64) {
      return api("audio", { q: q, mime: blob.type, data: b64, section: item.sec, question: item.t });
    })).then(function () {
      if (audioUrls[q]) {
        URL.revokeObjectURL(audioUrls[q]);
      }
      audioUrls[q] = URL.createObjectURL(blob);
      a.audio = true;
      a.uploading = false;
      a.error = "";
    }).catch(function () {
      a.uploading = false;
      a.error = you("Ses kaydı kaydedilemedi. İnternet bağlantını kontrol edip yeniden kaydet.", "Ses kaydı kaydedilemedi. İnternet bağlantınızı kontrol edip yeniden kaydedin.");
    }).then(function () {
      var live = document.querySelector(".voice");
      if (idx === q - 1 && live) {
        renderVoice(live, q);
      }
    });
  }

  function deleteAudio(q, box) {
    confirmDialog("Ses kaydı silinsin mi?", you("Bu kaydı silince geri getiremezsin.", "Bu kaydı silince geri getiremezsiniz."), "Sil").then(function (yes) {
      if (!yes) {
        return;
      }
      track(api("deleteAudio", { q: q })).then(function () {
        answers[q].audio = false;
        if (audioUrls[q]) {
          URL.revokeObjectURL(audioUrls[q]);
          delete audioUrls[q];
        }
        renderVoice(box, q);
      }).catch(function () {});
    });
  }

  // ---------- review ----------

  function renderReview() {
    var done = flat.filter(function (f) { return isAnswered(f.n); }).length;
    var kids = [
      el("h1", { text: "Gözden geçir" }),
      el("p", { class: "meta", text: flat.length + " sorudan " + done + " tanesi yanıtlandı. " + you("Değiştirmek istediğin soruya dokun.", "Değiştirmek istediğiniz soruya dokunun.") }),
    ];
    var lastSec = null;
    var list = null;
    flat.forEach(function (f, i) {
      if (f.sec !== lastSec) {
        lastSec = f.sec;
        kids.push(el("h2", { text: f.sec }));
        list = el("ul", { class: "rlist" });
        kids.push(list);
      }
      var a = answers[f.n] || {};
      var chips = [];
      if (a.text && a.text.trim()) {
        chips.push(el("span", { class: "chip", text: "Yazılı" }));
      }
      if (a.audio) {
        chips.push(el("span", { class: "chip", text: "Sesli" }));
      }
      if (!chips.length) {
        chips.push(el("span", { class: "chip empty", text: "Boş" }));
      }
      list.appendChild(el("li", null, [
        el("button", { class: "ritem", onclick: function () { go(i); } }, [
          el("span", { class: "rq", text: f.t }),
          el("span", { class: "rn", text: "Soru " + f.n }),
          el("span", { class: "chips" }, chips),
        ]),
      ]));
    });
    kids.push(el("p", { class: "lock-note", text: you("Gönderdikten sonra yanıtlarını değiştiremezsin.", "Gönderdikten sonra yanıtlarınızı değiştiremezsiniz.") }));

    var back = el("button", { class: "btn btn-ghost", text: "Geri", onclick: function () { go(flat.length - 1); } });
    var send = el("button", { class: "btn btn-primary", text: "Gönder ve bitir", onclick: function () { submit(send); } });
    frame(el("section", { class: "content review" }, kids), el("footer", { class: "bottombar" }, [back, send]), true);
  }

  function submit(btn) {
    var empty = flat.filter(function (f) { return !isAnswered(f.n); }).length;
    var uploading = flat.some(function (f) { return answers[f.n] && answers[f.n].uploading; });
    if (uploading) {
      confirmDialog("Bir ses kaydı hâlâ kaydediliyor", "Birkaç saniye bekleyip tekrar dene.", null);
      return;
    }
    var body = (empty ? empty + " soru boş. " : "") + you("Gönderdikten sonra yanıtlarını değiştiremezsin.", "Gönderdikten sonra yanıtlarınızı değiştiremezsiniz.");
    confirmDialog("Yanıtlar gönderilsin mi?", body, "Gönder").then(function (yes) {
      if (!yes) {
        return;
      }
      btn.disabled = true;
      btn.textContent = "Gönderiliyor…";
      flushAll().then(function () {
        if (Object.keys(dirty).length) {
          throw new Error("unsaved");
        }
        return track(api("submit"));
      }).then(function () {
        try {
          localStorage.removeItem(DRAFT_KEY);
          localStorage.removeItem(POS_KEY);
        } catch (err) {
          // Ignore.
        }
        renderDone();
      }).catch(function (err) {
        if (err && err.code === "locked") {
          return;
        }
        btn.disabled = false;
        btn.textContent = "Gönder ve bitir";
        confirmDialog("Gönderilemedi", you("İnternet bağlantını kontrol edip tekrar dene. Yanıtların kayıtlı.", "İnternet bağlantınızı kontrol edip tekrar deneyin. Yanıtlarınız kayıtlı."), null);
      });
    });
  }

  // ---------- done / errors ----------

  function renderDone() {
    stopRecording(true);
    idx = flat.length + 1;
    var content = el("section", { class: "content done" }, [
      el("div", { class: "seal" }, [svg(ICON_CHECK)]),
      el("h1", { text: "Teşekkürler" }),
      el("p", { text: you("Yanıtların bana ulaştı. Form kapandı; artık değişiklik yapılamaz.", "Yanıtlarınız bana ulaştı. Form kapandı; artık değişiklik yapılamaz.") }),
      el("p", { class: "meta", text: you("Notlarımda adın geçmeyecek.", "Notlarımda adınız geçmeyecek.") }),
    ]);
    frame(content, null, false);
  }

  function renderError(title, text) {
    frame(el("section", { class: "content done" }, [
      el("h1", { text: title }),
      el("p", { text: text }),
    ]), null, false);
  }

  function confirmDialog(title, text, okLabel) {
    return new Promise(function (resolve) {
      var d = el("dialog", { "aria-labelledby": "dlg-t" });
      var close = function (v) {
        d.close();
        d.remove();
        resolve(v);
      };
      var actions = okLabel
        ? [el("button", { class: "btn btn-ghost", text: "Vazgeç", onclick: function () { close(false); } }),
           el("button", { class: "btn btn-primary", text: okLabel, onclick: function () { close(true); } })]
        : [el("button", { class: "btn btn-primary", text: "Tamam", onclick: function () { close(false); } })];
      d.appendChild(el("h2", { id: "dlg-t", text: title }));
      d.appendChild(el("p", { text: text }));
      d.appendChild(el("div", { class: "dlg-actions" }, actions));
      d.addEventListener("cancel", function (e) {
        e.preventDefault();
        close(false);
      });
      document.body.appendChild(d);
      if (d.showModal) {
        d.showModal();
      } else {
        resolve(window.confirm(title + "\n\n" + text));
      }
    });
  }

  // ---------- start ----------

  function start() {
    if (!token) {
      renderError("Link eksik", "Bu sayfayı sana gönderilen kişisel linkle aç.");
      return;
    }
    if (!demo && !API) {
      renderError("Form henüz hazır değil", "Biraz sonra tekrar dene.");
      return;
    }
    api("load").then(function (res) {
      S = window.SURVEYS[res.tur];
      if (!S) {
        renderError("Form bulunamadı", "Linki gönderen kişiye haber ver.");
        return;
      }
      document.title = S.title;
      var n = 0;
      S.sections.forEach(function (sec) {
        sec.qs.forEach(function (q) {
          n++;
          flat.push({ n: n, sec: sec.name, concept: sec.concept, t: q.t, h: q.h });
        });
      });
      answers = {};
      Object.keys(res.answers || {}).forEach(function (k) {
        answers[k] = { text: res.answers[k].text || "", audio: !!res.answers[k].audio };
      });
      if (res.locked) {
        renderDone();
        return;
      }
      // Restore text typed while offline that never reached the server.
      try {
        var draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}");
        Object.keys(draft).forEach(function (k) {
          if (draft[k] && (!answers[k] || !answers[k].text)) {
            answers[k] = answers[k] || { text: "", audio: false };
            answers[k].text = draft[k];
            dirty[k] = true;
          }
        });
      } catch (err) {
        // Ignore a broken draft.
      }
      go(-1);
      flushAll();
    }).catch(function (err) {
      if (err && err.code === "unknown_token") {
        renderError("Link geçersiz", "Bu link tanınmadı. Linki gönderen kişiye haber ver.");
      } else {
        renderError("Bağlanılamadı", "İnternet bağlantını kontrol edip sayfayı yenile.");
      }
    });
  }

  start();
})();
