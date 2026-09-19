// ======================================================
// CRICKETLIVE
// STABLE HLS PLAYER
// ======================================================


// ======================================================
// YOUR AUTHORIZED HLS STREAM
// ======================================================

const TEST_STREAM =
  "https://test-streams.mux.dev/test_001/stream.m3u8";


// ======================================================
// MATCH DATA
// ======================================================

const matches = [

  {
    id: 1,

    league: "one t20i",

    team1: "india",

    team2: "japan",

    score1: "",

    score2: "",

    status: "live",

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
              "Media error — reconnecting..."
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
        ${match.status}
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


    <button class="watch-button" type="button" aria-label="Watch ${match.team1} versus ${match.team2} live">
      Watch Live
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

async function legacyScoreUpdate() {

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
      battingTeam || "�"
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
    let target = "�";

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
    let required = "�";

    if (
      target !== "�" &&
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
        `${count} Watching`

    }
  );


// ======================================================
// START
// ======================================================

loadMatches();

/* ======================================================
   CRICKETDATA LIVE SCORE
   ====================================================== */

async function legacyDetailedScoreUpdate() {

  const scoreboard = document.getElementById("liveScoreboard");
  const quickScore = document.getElementById("quickScore");

  try {

    const siteMatch = matches.find(
      m => String(m.status).toUpperCase() === "LIVE"
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
      throw new Error("API request failed: " + response.status);
    }

    const result = await response.json();

    const apiMatches =
      Array.isArray(result.data)
        ? result.data
        : [];

    function clean(value) {
      return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
    }

    const wanted1 = clean(siteMatch.team1);
    const wanted2 = clean(siteMatch.team2);

    /*
      Find the exact Zimbabwe vs Australia match.

      We check:
      1. teamInfo[].name
      2. teams[]
      3. match name
    */

    const liveMatch = apiMatches.find(match => {

      const infoTeams =
        Array.isArray(match.teamInfo)
          ? match.teamInfo
              .map(t => clean(t.name))
              .filter(Boolean)
          : [];

      const teams =
        Array.isArray(match.teams)
          ? match.teams
              .map(clean)
              .filter(Boolean)
          : [];

      const matchName =
        clean(match.name);

      const allTeamText =
        [
          ...infoTeams,
          ...teams,
          matchName
        ].join(" ");

      const found1 =
        infoTeams.includes(wanted1) ||
        teams.includes(wanted1) ||
        matchName.includes(wanted1);

      const found2 =
        infoTeams.includes(wanted2) ||
        teams.includes(wanted2) ||
        matchName.includes(wanted2);

      return found1 && found2;

    });

    if (!liveMatch) {

      console.log(
        "Target match not found:",
        siteMatch.team1,
        "vs",
        siteMatch.team2
      );

      // DEBUG: show API matches in console
      console.log(
        "API matches:",
        apiMatches.map(m => ({
          name: m.name,
          teams: m.teams,
          teamInfo: m.teamInfo
            ? m.teamInfo.map(t => t.name)
            : []
        }))
      );

      if (scoreboard) scoreboard.style.display = "none";
      if (quickScore) quickScore.style.display = "none";

      return;
    }

    console.log(
      "TARGET MATCH FOUND:",
      liveMatch.name
    );

    const scores =
      Array.isArray(liveMatch.score)
        ? liveMatch.score
        : [];

    if (!scores.length) {
      console.log("Match found but score array is empty.");
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

    let battingTeam =
      String(current.inning || "")
        .replace(/\s+Inning\s*\d+$/i, "")
        .trim();

    if (!battingTeam) {

      const teamInfo =
        Array.isArray(liveMatch.teamInfo)
          ? liveMatch.teamInfo
          : [];

      battingTeam =
        teamInfo[0]?.name ||
        siteMatch.team1;

    }

    function setText(id, value) {

      const element =
        document.getElementById(id);

      if (element) {
        element.textContent = value;
      }

    }

    /* FULL SCOREBOARD */

    if (scoreboard) {
      scoreboard.style.display = "block";
    }

    setText(
      "scoreMatchTitle",
      `${siteMatch.team1} vs ${siteMatch.team2}`
    );

    setText(
      "battingTeam",
      battingTeam
    );

    setText(
      "teamScore",
      scoreText
    );

    setText(
      "overs",
      oversText
    );

    setText(
      "inningsText",
      current.inning || "Live Innings"
    );

    /* CRR */

    const crr =
      overs > 0
        ? (runs / overs).toFixed(2)
        : "0.00";

    setText(
      "currentRunRate",
      crr
    );

    /* TARGET */

    let target = "�";

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

    /* REQUIRED RATE */

    let required = "�";

    if (
      target !== "�" &&
      Number(target) > runs
    ) {

      const remainingOvers =
        20 - overs;

      if (remainingOvers > 0) {

        required =
          (
            (Number(target) - runs) /
            remainingOvers
          ).toFixed(2);

      }

    }

    setText(
      "requiredRate",
      required
    );

    /* QUICK SCORE */

    if (quickScore) {
      quickScore.style.display = "flex";
    }

    setText(
      "quickScoreText",
      scoreText
    );

    setText(
      "quickOvers",
      oversText
    );

    console.log(
      "LIVE SCORE:",
      scoreText,
      oversText,
      battingTeam
    );

  } catch (error) {

    console.error(
      "Live score error:",
      error
    );

  }

}

// ==========================================
// LIVE SCOREBOARD - CRICKETDATA CRICSCORE
// ==========================================

const TARGET_TEAM_1 = "india";
const TARGET_TEAM_2 = "japan";

function normalizeTeamName(name) {
  return String(name || "")
    .replace(/\[.*?\]/g, "")
    .trim()
    .toLowerCase();
}

function isTargetMatch(match) {
  const team1 = normalizeTeamName(match.t1);
  const team2 = normalizeTeamName(match.t2);

  return (
    (team1.includes(TARGET_TEAM_1) && team2.includes(TARGET_TEAM_2)) ||
    (team1.includes(TARGET_TEAM_2) && team2.includes(TARGET_TEAM_1))
  );
}

function parseScore(scoreText) {
  if (!scoreText) {
    return { runs: "?", wickets: "?", overs: "?" };
  }

  const match = String(scoreText).match(
    /(\d+)\s*\/\s*(\d+)\s*\(([\d.]+)\)/
  );

  if (!match) {
    return { runs: "?", wickets: "?", overs: "?" };
  }

  return {
    runs: match[1],
    wickets: match[2],
    overs: match[3]
  };
}

function hideLiveScoreboard() {
  const scoreboard = document.getElementById("liveScoreboard");
  const quickScore = document.getElementById("quickScore");

  if (scoreboard) scoreboard.style.display = "none";
  if (quickScore) quickScore.style.display = "none";
}

function showLiveScoreboard(match) {
  const scoreboard = document.getElementById("liveScoreboard");
  const quickScore = document.getElementById("quickScore");

  if (!scoreboard) return;

  scoreboard.style.display = "block";

  if (quickScore) {
    quickScore.style.display = "flex";
  }

  const team1Name = normalizeTeamName(match.t1)
    .replace(/\b\w/g, c => c.toUpperCase());

  const team2Name = normalizeTeamName(match.t2)
    .replace(/\b\w/g, c => c.toUpperCase());

  const team1Score = parseScore(match.t1s);
  const team2Score = parseScore(match.t2s);

  const title = document.getElementById("scoreMatchTitle");

  if (title) {
    title.textContent = `${team1Name} vs ${team2Name}`;
  }

  // Current innings = score available for the batting side.
  // Prefer the side whose score has not reached 10 wickets.
  let battingTeam = team1Name;
  let battingScore = team1Score;

  if (
    team1Score.wickets === "10" &&
    team2Score.wickets !== "10"
  ) {
    battingTeam = team2Name;
    battingScore = team2Score;
  } else if (
    team2Score.wickets === "10" &&
    team1Score.wickets !== "10"
  ) {
    battingTeam = team1Name;
    battingScore = team1Score;
  } else if (match.t2s) {
    battingTeam = team2Name;
    battingScore = team2Score;
  }

  const battingTeamElement =
    document.getElementById("battingTeam");

  const teamScoreElement =
    document.getElementById("teamScore");

  const oversElement =
    document.getElementById("overs");

  const inningsElement =
    document.getElementById("inningsText");

  const crrElement =
    document.getElementById("currentRunRate");

  const targetElement =
    document.getElementById("targetScore");

  const requiredRateElement =
    document.getElementById("requiredRate");

  if (battingTeamElement) {
    battingTeamElement.textContent = battingTeam;
  }

  if (teamScoreElement) {
    teamScoreElement.textContent =
      `${battingScore.runs}/${battingScore.wickets}`;
  }

  if (oversElement) {
    oversElement.textContent =
      `(${battingScore.overs} ov)`;
  }

  if (inningsElement) {
    inningsElement.textContent = "LIVE";
  }

  const oversNumber = parseFloat(battingScore.overs);
  const runsNumber = parseInt(battingScore.runs, 10);

  let crr = "?";

  if (
    Number.isFinite(oversNumber) &&
    oversNumber > 0 &&
    Number.isFinite(runsNumber)
  ) {
    crr = (runsNumber / oversNumber).toFixed(2);
  }

  if (crrElement) {
    crrElement.textContent = crr;
  }

  if (targetElement) {
    targetElement.textContent = "?";
  }

  if (requiredRateElement) {
    requiredRateElement.textContent = "?";
  }

  // Current cricScore response does not provide batter/bowler figures.
  [
    "strikerName",
    "strikerRuns",
    "strikerBalls",
    "strikerSR",
    "nonStrikerName",
    "nonStrikerRuns",
    "nonStrikerBalls",
    "nonStrikerSR",
    "bowlerName",
    "bowlerFigures"
  ].forEach(id => {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = "?";
    }
  });

  const quickScoreText =
    document.getElementById("quickScoreText");

  const quickOvers =
    document.getElementById("quickOvers");

  if (quickScoreText) {
    quickScoreText.textContent =
      `${battingTeam} ${battingScore.runs}/${battingScore.wickets}`;
  }

  if (quickOvers) {
    quickOvers.textContent =
      `(${battingScore.overs} ov)`;
  }
}

async function updateLiveScore() {
  // Live Server (127.0.0.1:5500) does not provide Vercel /api routes.
  // Skip the API call locally to avoid repeated 404 console errors.
  if (window.__CRX_LOCAL_STATIC_SERVER__) {
    return;
  }
  try {
    const response = await fetch("/api/live-score", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`API HTTP ${response.status}`);
    }

    const result = await response.json();

    console.log("CricketData cricScore response:", result);

    const matches =
      Array.isArray(result)
        ? result
        : Array.isArray(result.data)
          ? result.data
          : [];

    console.log("CricketData matches:", matches);

    // EXACT MATCH ONLY
    const targetMatch = matches.find(isTargetMatch);

    if (!targetMatch) {
      console.log(
        "Target match not found:",
        TARGET_TEAM_1,
        "vs",
        TARGET_TEAM_2
      );

      hideLiveScoreboard();
      return;
    }

    // Never show a finished/result/fixture match.
    if (
      String(targetMatch.ms || "").toLowerCase() !== "live"
    ) {
      console.log(
        "Target match exists but is not LIVE:",
        targetMatch
      );

      hideLiveScoreboard();
      return;
    }

    console.log("TARGET LIVE MATCH FOUND:", targetMatch);

    showLiveScoreboard(targetMatch);

  } catch (error) {
    console.error("Live scoreboard error:", error);
    hideLiveScoreboard();
  }
}

// First score load
updateLiveScore();

// Refresh every 60 seconds
setInterval(updateLiveScore, 60 * 1000);

/* ======================================================
   LIVE STARTUP EXPERIENCE
   UI-only adapter for the existing player flow.
   ====================================================== */

(() => {

  const startupOverlay =
    document.getElementById("overlay");

  const startupOverlayTitle =
    document.getElementById("overlayTitle");

  const startupMessage =
    document.getElementById("message");

  const watchLiveButton =
    document.getElementById("watchLiveButton");

  const soundToggle =
    document.getElementById("soundToggle");

  const autoplayPreference =
    document.getElementById("autoplayPreference");

  const startupLiveMatches =
    matches.filter(match =>
      String(match.status).toUpperCase() === "LIVE" &&
      Boolean(match.stream)
    );

  // Avoid choosing arbitrarily if the existing match list ever has multiple LIVE entries.
  const startupMatch =
    startupLiveMatches.length === 1
      ? startupLiveMatches[0]
      : null;

  const autoplayStorageKey =
    "cricket-live-autoplay";

  let savedAutoplay = null;

  try {
    savedAutoplay =
      localStorage.getItem(autoplayStorageKey);
  } catch (error) {
    console.warn("Autoplay preference is unavailable.", error);
  }

  const autoplayEnabled =
    savedAutoplay !== "false";

  if (autoplayPreference) {
    autoplayPreference.checked =
      autoplayEnabled;

    autoplayPreference.addEventListener(
      "change",
      () => {
        try {
          localStorage.setItem(
            autoplayStorageKey,
            String(autoplayPreference.checked)
          );
        } catch (error) {
          console.warn("Autoplay preference could not be saved.", error);
        }
      }
    );
  }

  function setSoundLabel() {

    if (!soundToggle) {
      return;
    }

    const muted =
      Boolean(video.muted);

    soundToggle.textContent =
      muted
        ? "?? Sound off"
        : "?? Sound on";

    soundToggle.setAttribute(
      "aria-pressed",
      String(!muted)
    );

    soundToggle.setAttribute(
      "aria-label",
      muted
        ? "Unmute live stream"
        : "Mute live stream"
    );

  }

  function prepareLiveOverlay() {

    if (!startupMatch) {

      startupOverlay
        ?.querySelector(".live-overlay-badge")
        ?.setAttribute("hidden", "");

      watchLiveButton?.setAttribute(
        "hidden",
        ""
      );

      soundToggle?.setAttribute(
        "hidden",
        ""
      );

      return;

    }

    startupOverlay?.classList.add(
      "startup-overlay"
    );

    if (startupOverlayTitle) {
      startupOverlayTitle.textContent =
        "LIVE NOW";
    }

    if (startupMessage) {
      startupMessage.textContent =
        `${startupMatch.team1} vs ${startupMatch.team2} is streaming now.`;
    }

    watchLiveButton?.removeAttribute(
      "hidden"
    );

    soundToggle?.removeAttribute(
      "hidden"
    );

    setSoundLabel();

  }

  function startStartupMatch(muted) {

    if (!startupMatch) {
      return;
    }

    video.muted =
      muted;

    setSoundLabel();

    playStream(
      `${startupMatch.team1} vs ${startupMatch.team2}`,
      startupMatch.stream
    );

  }

  watchLiveButton?.addEventListener(
    "click",
    () => {
      startStartupMatch(false);
    }
  );

  soundToggle?.addEventListener(
    "click",
    () => {

      if (!startupMatch) {
        return;
      }

      video.muted =
        !video.muted;

      setSoundLabel();

      if (!currentUrl) {
        startStartupMatch(
          video.muted
        );
      }

    }
  );

  prepareLiveOverlay();

  if (startupMatch && autoplayEnabled) {
    startStartupMatch(true);
  }

})();


/* =========================================================
   CRICKET LIVE ? MATCH STATUS UI PATCH #2
   Fixes:
   - Mojibake emoji
   - Upcoming match showing Watch Live
   - Finished match showing Watch Live
   - Match-card state styling
   - Preserves existing HLS/Firebase/API logic
   ========================================================= */

(function premiumMatchStatusPatch() {
  "use strict";

  const STATUS_SELECTOR = ".match-card";

  function normalizeBrokenText(root = document) {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT
    );

    const replacements = {
      "????": "\u{1F441}",
      "????": "\u{1F534}",
      "???": "\u25B6",
      "???": "\u2715",
      "???": "\u2713",
      "???": "\u26A1"
    };

    const nodes = [];

    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }

    nodes.forEach(node => {
      let value = node.nodeValue;

      Object.entries(replacements).forEach(([broken, fixed]) => {
        value = value.split(broken).join(fixed);
      });

      if (value !== node.nodeValue) {
        node.nodeValue = value;
      }
    });
  }

  function getMatchFromCard(card) {
    if (!Array.isArray(window.matches) && typeof matches === "undefined") {
      return null;
    }

    const sourceMatches =
      Array.isArray(window.matches)
        ? window.matches
        : matches;

    const cardText = card.textContent
      .toLowerCase()
      .replace(/\s+/g, " ");

    return sourceMatches.find(match => {
      const team1 = String(match.team1 || "").toLowerCase();
      const team2 = String(match.team2 || "").toLowerCase();

      return (
        team1 &&
        team2 &&
        cardText.includes(team1) &&
        cardText.includes(team2)
      );
    }) || null;
  }

  function applyMatchState(card, match) {
    if (!match) return;

    const status = String(match.status || "")
      .trim()
      .toLowerCase();

    const button =
      card.querySelector("button") ||
      card.querySelector(".watch-btn") ||
      card.querySelector(".watch-live");

    if (!button) return;

    card.dataset.matchStatus = status;

    card.classList.remove(
      "match-is-live",
      "match-is-upcoming",
      "match-is-finished"
    );

    if (status === "live") {
      card.classList.add("match-is-live");

      button.disabled = false;
      button.removeAttribute("aria-disabled");
      button.textContent = "\u25B6 Watch Live";

      return;
    }

    if (status === "upcoming") {
      card.classList.add("match-is-upcoming");

      /*
       * Clone the button.
       * This removes the old inline/event listeners attached
       * by the existing match-card renderer.
       */
      if (
        button.disabled &&
        button.getAttribute("aria-disabled") === "true" &&
        button.textContent.trim() === "Starts Soon"
      ) {
        return;
      }

      const cleanButton = button.cloneNode(true);

      cleanButton.disabled = true;
      cleanButton.setAttribute("aria-disabled", "true");
      cleanButton.removeAttribute("onclick");
      cleanButton.textContent = "Starts Soon";

      button.replaceWith(cleanButton);

      return;
    }

    if (
      status === "finished" ||
      status === "complete" ||
      status === "completed"
    ) {
      card.classList.add("match-is-finished");

      if (
        button.disabled &&
        button.getAttribute("aria-disabled") === "true" &&
        button.textContent.trim() === "Finished"
      ) {
        return;
      }

      const cleanButton = button.cloneNode(true);

      cleanButton.disabled = true;
      cleanButton.setAttribute("aria-disabled", "true");
      cleanButton.removeAttribute("onclick");
      cleanButton.textContent = "Finished";

      button.replaceWith(cleanButton);
    }
  }

  function refreshMatchCards() {
    normalizeBrokenText();

    const cards = document.querySelectorAll(STATUS_SELECTOR);

    cards.forEach(card => {
      const match = getMatchFromCard(card);

      if (match) {
        applyMatchState(card, match);
      }
    });
  }

  function start() {
    refreshMatchCards();

    const grid = document.getElementById("matchesGrid");

    if (!grid) return;

    const observer = new MutationObserver(() => {
      refreshMatchCards();
    });

    observer.observe(grid, {
      childList: true,
      subtree: true
    });

    /*
     * Existing app code can re-render matches after filters,
     * refreshes or state changes, so perform lightweight
     * synchronization periodically.
     */
    setInterval(refreshMatchCards, 1500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, {
      once: true
    });
  } else {
    start();
  }
})();

/* =========================================================
   CRX V3 � MATCH CARD VISUAL ADAPTER
   ========================================================= */

(() => {
  const enhanceMatchCardsV3 = () => {
    const cards = document.querySelectorAll("#matchesGrid .match-card");

    cards.forEach((card) => {
      const text = (card.textContent || "").toLowerCase();

      card.classList.toggle(
        "crx-v3-live-card",
        text.includes("live")
      );

      card.classList.toggle(
        "crx-v3-upcoming-card",
        text.includes("upcoming") ||
        text.includes("starts soon")
      );

      const buttons = card.querySelectorAll("button");

      buttons.forEach((button) => {
        const label = (button.textContent || "")
          .trim()
          .toLowerCase();

        if (label.includes("watch")) {
          button.classList.add("crx-v3-watch-button");
        }

        if (
          label.includes("starts") ||
          label.includes("finished")
        ) {
          button.classList.add("crx-v3-disabled-button");
        }
      });
    });
  };

  const bootV3 = () => {
    enhanceMatchCardsV3();

    const grid = document.getElementById("matchesGrid");

    if (grid) {
      const observer = new MutationObserver(() => {
        enhanceMatchCardsV3();
      });

      observer.observe(grid, {
        childList: true,
        subtree: true
      });
    }

    window.setTimeout(enhanceMatchCardsV3, 500);
    window.setTimeout(enhanceMatchCardsV3, 1500);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootV3, {
      once: true
    });
  } else {
    bootV3();
  }
})();
/* =========================================================
   CRX LOCAL DEV GUARD
   Prevent Live Server from spamming /api/live-score 404s
   ========================================================= */

(() => {
  const isLocalStaticServer =
    location.hostname === "127.0.0.1" ||
    location.hostname === "localhost";

  const isLiveServerPort =
    location.port === "5500" ||
    location.port === "5501" ||
    location.port === "3000";

  if (isLocalStaticServer && isLiveServerPort) {
    window.__CRX_LOCAL_STATIC_SERVER__ = true;
  }
})();
