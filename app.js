// ======================================================
// CRICKETLIVE
// ======================================================


// ======================================================
// YOUR AUTHORIZED HLS STREAM
// ======================================================
//
// Testing ke liye Mux stream.
// Baad me yaha apni authorized HLS URL daal sakte ho.
//

const TEST_STREAM =
  "https://incentive-infrared-block-realized.trycloudflare.com/live/index.m3u8";


// ======================================================
// MATCH DATA
// ======================================================
//
// Yaha apne authorized/free streams add kar sakte ho.
//

const matches = [

  {
    id: 1,

    league: "odi  series",

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
// HLS
// ======================================================

let hls = null;


// ======================================================
// PLAYER
// ======================================================

function destroyPlayer() {

  if (hls) {

    hls.destroy();

    hls = null;

  }

  video.pause();

  video.removeAttribute("src");

  video.load();

}


function showOverlay(title, text) {

  overlayTitle.textContent =
    title;

  message.textContent =
    text;

  overlay.classList.remove(
    "hidden"
  );

}


function hideOverlay() {

  overlay.classList.add(
    "hidden"
  );

}


function playStream(
  title,
  url
) {

  if (!url) {

    showOverlay(
      "No stream",
      "No authorized stream is available."
    );

    return;

  }


  destroyPlayer();


  matchTitle.textContent =
    title;

  statusText.textContent =
    "LOADING";


  showOverlay(
    title,
    "Connecting to live stream..."
  );


  if (
    window.Hls &&
    Hls.isSupported()
  ) {

    hls = new Hls({

      enableWorker: true,

      lowLatencyMode: false,

      maxBufferLength: 25,
      maxMaxBufferLength: 40,
      liveSyncDurationCount: 3,
      liveMaxLatencyDurationCount: 6,
      maxBufferHole: 0.5

    });


    hls.loadSource(url);

    hls.attachMedia(video);


    hls.on(
      Hls.Events.MANIFEST_PARSED,
      () => {

        statusText.textContent =
          "LIVE";

        video.play()
          .then(() => {
            hideOverlay();
            statusText.textContent = "LIVE";
          })
          .catch(() => {

            showOverlay(
              title,
              "Press play to start."
            );

          });

      }
    );


    hls.on(Hls.Events.ERROR, (_, data) => {

      console.log("HLS error:", data);

      if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {

        console.log("Recovering media...");

        hls.recoverMediaError();

        return;
      }

      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {

        console.log("Recovering network...");

        setTimeout(() => {
          hls.startLoad();
        }, 1000);

        return;
      }

      if (data.fatal) {

        statusText.textContent = "RECONNECTING";

        showOverlay(
          "Reconnecting...",
          "Trying to restore the live stream."
        );

        setTimeout(() => {

          if (hls) {
            hls.destroy();
            hls = null;
          }

          playStream(title, url);

        }, 2000);
      }
    });

  }


  else if (
    video.canPlayType(
      "application/vnd.apple.mpegurl"
    )
  ) {

    video.src =
      url;


    video.addEventListener(
      "loadedmetadata",
      () => {

        video.play()
          .then(() => {
            hideOverlay();
            statusText.textContent = "LIVE";
          })
          .catch(() => {

            showOverlay(
              title,
              "Press play to start."
            );

          });

      },
      {
        once: true
      }
    );


    video.addEventListener(
      "playing",
      () => {

        hideOverlay();

        statusText.textContent =
          "LIVE";

      },
      {
        once: true
      }
    );

  }


  else {

    showOverlay(
      "HLS unsupported",
      "This browser cannot play HLS."
    );

  }

}


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






