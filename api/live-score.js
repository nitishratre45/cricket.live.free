export default async function handler(req, res) {

  try {

    const apiKey = process.env.CRICKET_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "CRICKET_API_KEY is not configured"
      });
    }

    const url =
      `https://api.cricapi.com/v1/currentMatches?apikey=${encodeURIComponent(apiKey)}&offset=0`;

    const response = await fetch(url, {
      cache: "no-store"
    });

    const data = await response.json();

    console.log("CRICKETDATA RESPONSE:", JSON.stringify(data));

    return res.status(response.status).json(data);

  } catch (error) {

    console.error("CRICKETDATA ERROR:", error);

    return res.status(500).json({
      error: "Unable to fetch CricketData",
      message: error.message
    });

  }

}
