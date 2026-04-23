//Creates one shared Anthropic client for the entire app 

import Anthropic from "@anthropic-ai/sdk";

//Reads the API key from .env — throws at startup if it's missing
const anthropic = new Anthropic({
  apiKey: process.env["ANTHROPIC_API_KEY"],
});

export default anthropic;
