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
// LIVE CRICKET SCORE API
// ======================================================

async function updateLiveScore() {

  const scoreboard = document.getElementById("liveScoreboard");
  const quickScore = document.getElementById("quickScore");

  try {

    // Website par selected/live match
    const siteMatch = matches.find(
      match => match.status === "LIVE"
    );

    if (!siteMatch) {

      if (scoreboard) scoreboard.style.display = "none";
      if (quickScore) quickScore.style.display = "none";

      return;
    }

    const response = await fetch(
      "/api/live-score",
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error("Live score API failed");
    }

    const result = await response.json();

    const apiMatches =
      Array.isArray(result.data)
        ? result.data
        : [];

    // ----------------------------------------------
    // NORMALIZE TEAM NAMES
    // ----------------------------------------------

    function normalizeTeam(name) {

      return String(name || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

    }

    const team1 =
      normalizeTeam(siteMatch.team1);

    const team2 =
      normalizeTeam(siteMatch.team2);

    // ----------------------------------------------
    // EXACT MATCH ONLY
    // ----------------------------------------------

    const liveMatch =
      apiMatches.find(match => {

        if (
          match.matchStarted !== true ||
          match.matchEnded === true
        ) {
          return false;
        }

        const teams =
          Array.isArray(match.teams)
            ? match.teams.map(normalizeTeam)
            : [];

        const matchName =
          normalizeTeam(match.name);

        const foundTeam1 =
          teams.includes(team1) ||
          matchName.includes(team1);

        const foundTeam2 =
          teams.includes(team2) ||
          matchName.includes(team2);

        return foundTeam1 && foundTeam2;

      });

    // ----------------------------------------------
    // WEBSITE MATCH NOT LIVE IN API
    // ----------------------------------------------

    if (!liveMatch) {

      if (scoreboard) {
        scoreboard.style.display = "none";
      }

      if (quickScore) {
        quickScore.style.display = "none";
      }

      console.log(
        "Selected match is not currently live in API."
      );

      return;
    }

    // ----------------------------------------------
    // SCORE AVAILABLE
    // ----------------------------------------------

    const scores =
      Array.isArray(liveMatch.score)
        ? liveMatch.score
        : [];

    if (!scores.length) {
      return;
    }

    const current =
      scores[scores.length - 1];

    const runs =
      Number(current.r || 0);

    const wickets =
      Number(current.w || 0);

    const overs =
      Number(current.o || 0);

    const scoreText =
      `${runs}/${wickets}`;

    const oversText =
      `${overs} overs`;

    // ----------------------------------------------
    // BATTING TEAM
    // ----------------------------------------------

    let battingTeam =
      String(current.inning || "")
        .replace(
          /\s+Inning[s]?\s*\d*$/i,
          ""
        )
        .trim();

    if (!battingTeam) {

      battingTeam =
        Array.isArray(liveMatch.teams)
          ? liveMatch.teams[0]
          : siteMatch.team1;

    }

    // ----------------------------------------------
    // HELPER
    // ----------------------------------------------

    function setScoreText(id, value) {

      const element =
        document.getElementById(id);

      if (element) {
        element.textContent = value;
      }

    }

    // ----------------------------------------------
    // FULL SCOREBOARD
    // ----------------------------------------------

    if (scoreboard) {
      scoreboard.style.display = "";
    }

    setScoreText(
      "scoreMatchTitle",
      `${siteMatch.team1} vs ${siteMatch.team2}`
    );

    setScoreText(
      "battingTeam",
      battingTeam
    );

    setScoreText(
      "teamScore",
      scoreText
    );

    setScoreText(
      "overs",
      oversText
    );

    setScoreText(
      "inningsText",
      current.inning || "Live Innings"
    );

    // ----------------------------------------------
    // CRR
    // ----------------------------------------------

    let crr = 0;

    if (overs > 0) {
      crr = runs / overs;
    }

    setScoreText(
      "currentRunRate",
      crr.toFixed(2)
    );

    // ----------------------------------------------
    // TARGET
    // ----------------------------------------------

    let target = null;

    if (scores.length >= 2) {

      const previous =
        scores[scores.length - 2];

      target =
        Number(previous.r || 0) + 1;

    }

    setScoreText(
      "targetScore",
      target ? String(target) : "—"
    );

    // ----------------------------------------------
    // REQUIRED RATE
    // ----------------------------------------------

    let requiredRate = "—";

    if (
      target &&
      target > runs &&
      overs > 0
    ) {

      const remainingOvers =
        20 - overs;

      if (remainingOvers > 0) {

        requiredRate =
          (
            (target - runs) /
            remainingOvers
          ).toFixed(2);

      }

    }

    setScoreText(
      "requiredRate",
      requiredRate
    );

    // ----------------------------------------------
    // QUICK SCORE BELOW VIDEO
    // ----------------------------------------------

    if (quickScore) {
      quickScore.style.display = "";
    }

    setScoreText(
      "quickScoreText",
      scoreText
    );

    setScoreText(
      "quickOvers",
      oversText
    );

    console.log(
      `LIVE SCORE: ${battingTeam} ${scoreText} (${oversText})`
    );

  }

  catch (error) {

    console.error(
      "Live score error:",
      error
    );

  }

}


// First check
updateLiveScore();

// Update every 60 seconds
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
