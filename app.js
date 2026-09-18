// ======================================================
// CRICKETLIVE
// STABLE HLS PLAYER
// ======================================================


// ======================================================
// YOUR AUTHORIZED HLS STREAM
// ======================================================

const TEST_STREAM =
  "https://optical-named-woods-contracts.trycloudflare.com/live/index.m3u8";


// ======================================================
// MATCH DATA
// ======================================================

const matches = [

  {
    id: 1,

    league: "odi series",

    team1: "zimbabwe",

    team2: "Australia",

    score1: "",

    score2: "",

    status: "LIVE",

    stream: TEST_STREAM

  }

];


// ======================================================
// ELEMENTS
// ======================================================

const video =
  document.getElementById("player");

const overlay =
  document.getElementById("overlay");

const overlayTitle =
  document.getElementById("overlayTitle");

const message =
  document.getElementById("message");

const matchTitle =
  document.getElementById("matchTitle");

const statusText =
  document.getElementById("statusText");

const matchesGrid =
  document.getElementById("matchesGrid");

const refreshBtn =
  document.getElementById("refreshBtn");


// ======================================================
// HLS VARIABLES
// ======================================================

let hls = null;

let currentTitle = "";

let currentUrl = "";

let reconnectTimer = null;

let stallTimer = null;

let reconnectAttempts = 0;

let isStarting = false;


// ======================================================
// PLAYER CLEANUP
// ======================================================

function destroyPlayer() {

  clearTimeout(reconnectTimer);

  clearTimeout(stallTimer);

  reconnectTimer = null;

  stallTimer = null;


  if (hls) {

    hls.destroy();

    hls = null;

  }


  try {

    video.pause();

  } catch (error) {

    console.log(error);

  }


  video.removeAttribute("src");

  video.load();

}


// ======================================================
// STATUS
// ======================================================

function setStatus(status) {

  statusText.textContent =
    status;

}


// ======================================================
// OVERLAY
// ======================================================

function showOverlay(title, text) {

  overlayTitle.textContent =
    title;

  message.textContent =
    text;

  overlay.classList.remove("hidden");

}


function hideOverlay() {

  overlay.classList.add("hidden");

}


// ======================================================
// SAFE PLAY
// ======================================================

function safePlay() {

  if (!video) {
    return;
  }


  const promise =
    video.play();


  if (promise !== undefined) {

    promise
      .then(() => {

        hideOverlay();

        setStatus("LIVE");

        reconnectAttempts = 0;

      })
      .catch(() => {

        showOverlay(
          currentTitle,
          "Press play to start."
        );

        setStatus("READY");

      });

  }

}


// ======================================================
// RECONNECT
// ======================================================

function reconnect(reason = "Connection interrupted") {

  if (!currentUrl) {
    return;
  }


  if (isStarting) {
    return;
  }


  clearTimeout(reconnectTimer);


  reconnectAttempts++;


  setStatus("RECONNECTING");


  showOverlay(
    "Reconnecting...",
    reason
  );


  const delay =
    Math.min(
      1000 * reconnectAttempts,
      5000
    );


  reconnectTimer =
    setTimeout(() => {

      playStream(
        currentTitle,
        currentUrl,
        true
      );

    }, delay);

}


// ======================================================
// HLS PLAYER
// ======================================================

function playStream(
  title,
  url,
  isReconnect = false
) {

  if (!url) {

    showOverlay(
      "No stream",
      "No authorized stream is available."
    );

    setStatus("OFFLINE");

    return;

  }


  if (isStarting) {
    return;
  }


  isStarting = true;


  currentTitle =
    title;

  currentUrl =
    url;


  if (!isReconnect) {

    reconnectAttempts = 0;

  }


  destroyPlayer();


  matchTitle.textContent =
    title;

  setStatus("LOADING");


  showOverlay(
    title,
    "Connecting to live stream..."
  );


  // ====================================================
  // HLS.JS
  // ====================================================

  if (
    window.Hls &&
    Hls.isSupported()
  ) {

    hls =
      new Hls({

        enableWorker: true,

        lowLatencyMode: false,

        backBufferLength: 30,

        maxBufferLength: 30,

        maxMaxBufferLength: 60,

        liveSyncDurationCount: 3,

        liveMaxLatencyDurationCount: 8,

        maxBufferHole: 1,

        highBufferWatchdogPeriod: 2,

        nudgeOffset: 0.2,

        nudgeMaxRetry: 5,

        fragLoadingMaxRetry: 6,

        manifestLoadingMaxRetry: 6,

        levelLoadingMaxRetry: 6,

        fragLoadingRetryDelay: 1000,

        manifestLoadingRetryDelay: 1000,

        levelLoadingRetryDelay: 1000

      });


    hls.loadSource(url);

    hls.attachMedia(video);


    // ==================================================
    // MANIFEST
    // ==================================================

    hls.on(
      Hls.Events.MANIFEST_PARSED,
      () => {

        isStarting = false;

        setStatus("LIVE");

        safePlay();

      }
    );


    // ==================================================
    // FRAGMENT LOADED
    // ==================================================

    hls.on(
      Hls.Events.FRAG_LOADED,
      () => {

        reconnectAttempts = 0;

        if (!video.paused) {

          setStatus("LIVE");

        }

      }
    );


    // ==================================================
    // BUFFER APPENDED
    // ==================================================

    hls.on(
      Hls.Events.BUFFER_APPENDED,
      () => {

        if (!video.paused) {

          clearTimeout(stallTimer);

          setStatus("LIVE");

        }

      }
    );


    // ==================================================
    // HLS ERROR
    // ==================================================

    hls.on(
      Hls.Events.ERROR,
      (_, data) => {

        console.log(
          "HLS error:",
          data
        );


        // ----------------------------------------------
        // NETWORK ERROR
        // ----------------------------------------------

        if (
          data.type ===
          Hls.ErrorTypes.NETWORK_ERROR
        ) {

          setStatus(
            "RECONNECTING"
          );


          try {

            hls.startLoad();

          } catch (error) {

            console.log(error);

          }


          return;

        }


        // ----------------------------------------------
        // MEDIA ERROR
        // ----------------------------------------------

        if (
          data.type ===
          Hls.ErrorTypes.MEDIA_ERROR
        ) {

          console.log(
            "Recovering media..."
          );


          try {

            hls.recoverMediaError();

          } catch (error) {

            console.log(error);

            reconnect(
              "Media error â€” reconnecting..."
            );

          }


          return;

        }


        // ----------------------------------------------
        // FATAL ERROR
        // ----------------------------------------------

        if (data.fatal) {

          console.log(
            "Fatal HLS error"
          );


          isStarting = false;


          reconnect(
            "Stream connection lost."
          );

        }

      }
    );

  }


  // ====================================================
  // NATIVE HLS
  // ====================================================

  else if (
    video.canPlayType(
      "application/vnd.apple.mpegurl"
    )
  ) {

    isStarting = false;


    video.src =
      url;


    video.addEventListener(
      "loadedmetadata",
      () => {

        setStatus("LIVE");

        safePlay();

      },
      {
        once: true
      }
    );


    video.addEventListener(
      "playing",
      () => {

        hideOverlay();

        setStatus("LIVE");

        reconnectAttempts = 0;

      }
    );


    video.addEventListener(
      "error",
      () => {

        isStarting = false;

        reconnect(
          "Video connection lost."
        );

      }
    );

  }


  // ====================================================
  // UNSUPPORTED
  // ====================================================

  else {

    isStarting = false;


    showOverlay(
      "HLS unsupported",
      "This browser cannot play HLS."
    );


    setStatus("ERROR");

  }

}


// ======================================================
// VIDEO EVENTS
// ======================================================


// ------------------------------------------------------
// PLAYING
// ------------------------------------------------------

video.addEventListener(
  "playing",
  () => {

    clearTimeout(stallTimer);

    hideOverlay();

    setStatus("LIVE");

    reconnectAttempts = 0;

  }
);


// ------------------------------------------------------
// WAITING
// ------------------------------------------------------

video.addEventListener(
  "waiting",
  () => {

    console.log(
      "Video waiting/buffering..."
    );


    setStatus(
      "BUFFERING"
    );


    clearTimeout(stallTimer);


    stallTimer =
      setTimeout(() => {

        if (
          video.readyState < 3 &&
          !video.paused
        ) {

          console.log(
            "Buffer stall detected"
          );


          reconnect(
            "Buffering for too long..."
          );

        }

      }, 6000);

  }
);


// ------------------------------------------------------
// STALLED
// ------------------------------------------------------

video.addEventListener(
  "stalled",
  () => {

    console.log(
      "Video stalled"
    );


    setStatus(
      "BUFFERING"
    );


    clearTimeout(stallTimer);


    stallTimer =
      setTimeout(() => {

        if (
          video.readyState < 3 &&
          !video.paused
        ) {

          reconnect(
            "Stream stalled. Reconnecting..."
          );

        }

      }, 6000);

  }
);


// ------------------------------------------------------
// CAN PLAY
// ------------------------------------------------------

video.addEventListener(
  "canplay",
  () => {

    if (!video.paused) {

      setStatus("LIVE");

    }

  }
);


// ------------------------------------------------------
// ENDED
// ------------------------------------------------------

video.addEventListener(
  "ended",
  () => {

    if (currentUrl) {

      reconnect(
        "Live stream ended unexpectedly."
      );

    }

  }
);


// ======================================================
// MATCH CARD
// ======================================================

function createMatchCard(match) {

  const card =
    document.createElement("div");


  card.className =
    "match-card";


  card.innerHTML = `

    <div class="match-top">

      <span class="live-label">
        ðŸ”´ ${match.status}
      </span>

      <span class="match-league">
        ${match.league}
      </span>

    </div>


    <div class="team">

      <span class="team-name">
        ${match.team1}
      </span>

      <span class="team-score">
        ${match.score1}
      </span>

    </div>


    <div class="team">

      <span class="team-name">
        ${match.team2}
      </span>

      <span class="team-score">
        ${match.score2}
      </span>

    </div>


    <button class="watch-button">
      â–¶ Watch Live
    </button>

  `;


  const button =
    card.querySelector(
      ".watch-button"
    );


  button.addEventListener(
    "click",
    () => {

      playStream(
        `${match.team1} vs ${match.team2}`,
        match.stream
      );


      document
        .getElementById("live")
        .scrollIntoView({
          behavior: "smooth"
        });

    }
  );


  return card;

}


// ======================================================
// LOAD MATCHES
// ======================================================

function loadMatches() {

  matchesGrid.innerHTML =
    "";


  matches.forEach(
    match => {

      matchesGrid.appendChild(
        createMatchCard(match)
      );

    }
  );

}


// ======================================================
// REFRESH
// ======================================================

refreshBtn.addEventListener(
  "click",
  () => {

    loadMatches();

  }
);


 
// ======================================================
// LIVE SCORE - CRICKETDATA
// ======================================================

async function updateLiveScore() {

  const scoreboard = document.getElementById("liveScoreboard");
  const quickScore = document.getElementById("quickScore");

  try {

    const siteMatch = matches.find(
      m => m.status === "LIVE"
    );

    if (!siteMatch) {
      if (scoreboard) scoreboard.style.display = "none";
      if (quickScore) quickScore.style.display = "none";
      return;
    }

    const response = await fetch("/api/live-score", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Score API request failed");
    }

    const result = await response.json();

    const apiMatches =
      Array.isArray(result.data) ? result.data : [];

    function normalize(value) {
      return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
    }

    const team1 = normalize(siteMatch.team1);
    const team2 = normalize(siteMatch.team2);

    // EXACT TEAM MATCH
    const liveMatch = apiMatches.find(match => {

      const teams = Array.isArray(match.teams)
        ? match.teams.map(normalize)
        : [];

      const name = normalize(match.name);

      const hasTeam1 =
        teams.includes(team1) ||
        name.includes(team1);

      const hasTeam2 =
        teams.includes(team2) ||
        name.includes(team2);

      return hasTeam1 && hasTeam2;

    });

    if (!liveMatch) {

      console.log(
        "Zimbabwe vs Australia not found in current API data."
      );

      if (scoreboard) scoreboard.style.display = "none";
      if (quickScore) quickScore.style.display = "none";

      return;
    }

    const scores =
      Array.isArray(liveMatch.score)
        ? liveMatch.score
        : [];

    if (!scores.length) {
      console.log("Match found but score is not available yet.");
      return;
    }

    const current =
      scores[scores.length - 1];

    const runs = Number(current.r || 0);
    const wickets = Number(current.w || 0);
    const overs = Number(current.o || 0);

    const score = `${runs}/${wickets}`;
    const overText = `${overs} overs`;

    let battingTeam =
      String(current.inning || "")
        .replace(/Inning\s*\d+/i, "")
        .trim();

    if (!battingTeam && Array.isArray(liveMatch.teams)) {
      battingTeam = liveMatch.teams[0];
    }

    function setText(id, value) {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    }

    // SHOW SCOREBOARD
    if (scoreboard) {
      scoreboard.style.display = "block";
    }

    // MATCH
    setText(
      "scoreMatchTitle",
      `${siteMatch.team1} vs ${siteMatch.team2}`
    );

    // BATTING TEAM
    setText(
      "battingTeam",
      battingTeam || "—"
    );

    // SCORE
    setText(
      "teamScore",
      score
    );

    setText(
      "overs",
      overText
    );

    setText(
      "inningsText",
      current.inning || "Live Innings"
    );

    // CRR
    const crr =
      overs > 0
        ? (runs / overs).toFixed(2)
        : "0.00";

    setText(
      "currentRunRate",
      crr
    );

    // TARGET
    let target = "—";

    if (scores.length >= 2) {
      const previous =
        scores[scores.length - 2];

      target =
        String(Number(previous.r || 0) + 1);
    }

    setText(
      "targetScore",
      target
    );

    // REQUIRED RATE
    let required = "—";

    if (
      target !== "—" &&
      Number(target) > runs &&
      overs < 20
    ) {

      const remaining =
        20 - overs;

      required =
        ((Number(target) - runs) / remaining)
          .toFixed(2);
    }

    setText(
      "requiredRate",
      required
    );

    // QUICK SCORE
    if (quickScore) {
      quickScore.style.display = "flex";
    }

    setText(
      "quickScoreText",
      score
    );

    setText(
      "quickOvers",
      overText
    );

    console.log(
      "LIVE SCORE:",
      siteMatch.team1,
      "vs",
      siteMatch.team2,
      "|",
      score,
      "|",
      overText
    );

  } catch (error) {

    console.error(
      "Live score error:",
      error
    );

  }
}


// FIRST UPDATE
updateLiveScore();


// UPDATE EVERY 60 SECONDS
setInterval(
  updateLiveScore,
  60000
);


// ======================================================
// FIREBASE
// ======================================================

const firebaseConfig = {

  apiKey:
    "AIzaSyDm3DIHJfRPEqNqrUlYJutRQm8XIA6H3fs",

  authDomain:
    "cricket-live-39106.firebaseapp.com",

  databaseURL:
    "https://cricket-live-39106-default-rtdb.asia-southeast1.firebasedatabase.app",

  projectId:
    "cricket-live-39106",

  storageBucket:
    "cricket-live-39106.firebasestorage.app",

  messagingSenderId:
    "841890143",

  appId:
    "1:841890143:web:ca5b87c9395bdc19145eea",

  measurementId:
    "G-ZNEZC8YVMX"

};


firebase.initializeApp(
  firebaseConfig
);


const database =
  firebase.database();


const viewerCountElement =
  document.getElementById(
    "viewerCount"
  );


const viewerRef =
  database
    .ref("liveViewers")
    .push();


viewerRef
  .onDisconnect()
  .remove();


viewerRef.set(true);


database
  .ref("liveViewers")
  .on(
    "value",
    snapshot => {

      const count =
        snapshot.numChildren();


      viewerCountElement.textContent =
        `ðŸ‘ ${count} Watching`;

    }
  );


// ======================================================
// START
// ======================================================

loadMatches();
