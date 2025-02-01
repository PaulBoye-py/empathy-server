require('dotenv').config();
const { WebClient } = require('@slack/web-api');

// Initialize the WebClient with your Slack bot token
const slackBotToken = process.env.NEW_SLACK_BOT_TOKEN;
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
