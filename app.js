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
        🔴 ${match.status}
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
      ▶ Watch Live
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
        `👁 ${count} Watching`;

    }
  );


// ======================================================
// START
// ======================================================

loadMatches();