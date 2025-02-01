require('dotenv').config();
const { WebClient } = require('@slack/web-api');

// Initialize the WebClient with your Slack bot token
const slackBotToken = 'xoxb-1727826119732-6544901763073-QVmGVfI8w7a3YS4VHpYsL3NQ';
const web = new WebClient(slackBotToken);

// Function to send a Slack notification
async function sendSlackNotification(channel, message) {
  try {
    const result = await web.chat.postMessage({
      text: message,
      channel: channel, // Replace with the Slack channel ID or name
    });

    console.log('Slack notification sent:', result.ts);
  } catch (error) {
    console.error('Error sending Slack notification:', error.message);
  }
}

module.exports = { sendSlackNotification };
