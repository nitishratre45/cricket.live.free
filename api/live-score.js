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

    const response = await fetch(url);

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Cricket API request failed"
      });
    }

    const data = await response.json();

    return res.status(200).json(data);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Unable to fetch live cricket data"
    });
  }
}