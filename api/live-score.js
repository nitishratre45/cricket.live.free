export default async function handler(req, res) {
  try {
    const apiKey = process.env.CRICKET_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        status: "failure",
        reason: "CRICKET_API_KEY is not configured"
      });
    }

    const url =
      `https://api.cricapi.com/v1/cricScore?apikey=${encodeURIComponent(apiKey)}`;

    const response = await fetch(url, {
      cache: "no-store"
    });

    const data = await response.json();

    console.log("CRICSCORE RESPONSE:", JSON.stringify(data));

    return res.status(response.status).json(data);

  } catch (error) {
    console.error("CRICSCORE ERROR:", error);

    return res.status(500).json({
      status: "failure",
      reason: "Unable to fetch CricketData",
      message: error.message
    });
  }
}