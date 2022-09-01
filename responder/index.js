const { CloudEvent, HTTP } = require('cloudevents');
const axios = require('axios');

const token = process.env.TELEGRAM_API_KEY;
const url = `https://api.telegram.org/bot${token}/sendMessage`;

// Sanity check - we can't do anything without an API token
if (!token) {
  throw new Error('No $TELEGRAM_API_KEY found.');
}

/**
 * A complex emotion represented as tuple of various emotions
 * @typedef {{anger:     Number,
 *            contempt:  Number,
 *            disgust:   Number,
 *            fear:      Number,
 *            happiness: Number,
 *            neutral:   Number,
 *            sadness:   Number,
 *            surprise:  Number}} Emotion
 */

/**
 * A face
 * @typedef {{age:     Number,
 *            emotion: Emotion}} Face
 */


/**
 * Your CloudEvent handling function, invoked with each request.
 * This example function logs its input, and responds with a CloudEvent
 * which echoes the incoming event data
 *
 * It can be invoked with 'func invoke'
 * It can be tested with 'npm test'
 *
 * @param {Context} context a context object.
 * @param {object} context.body the request body if any
 * @param {object} context.query the query string deserialzed as an object, if any
 * @param {object} context.log logging object with methods for 'info', 'warn', 'error', etc.
 * @param {object} context.headers the HTTP request headers
 * @param {string} context.method the HTTP request method
 * @param {string} context.httpVersion the HTTP protocol version
 * See: https://github.com/knative-sandbox/kn-plugin-func/blob/main/docs/guides/nodejs.md#the-context-object
 * @param {CloudEvent} event the CloudEvent
 * 
 * Should receive a cloud event with a Telegram chat ID
 * Make this function async so we can return immediately
 * to the invoker, while doing the work of replying to
 * the original chat message.
 * @param {{faces: Face[], chat: String}} event.data event with data
 * Contains telegram chatID and image face analysis.
 * @returns {Promise<{code: Number?, message: String?}>}
 */
const handle = async (context, event) => {

  if (!event) {
    context.log.error('No CloudEvent received');
    return {
      message: 'No CloudEvent received'
    };
  }

  let chatId;
  const eventType = event.type;

  let response;
  if (eventType === 'telegram.image.processed') {
    response = formatResponse(event.data.faces);
    chatId = event.data.chat;
  } else if (eventType === 'telegram.text') {
    response = `👋 😃
Send me an image with faces in it and I will analyze it for you.`;
    chatId = event.data.chat;
  } else {
    // Don't know how to handle any other kind of event
    context.log.error(`Cannot handle events of type: ${eventType}`);
  }

  // send chat response async
  axios.post(url, {
    chat_id: chatId,
    text: response
  })
    .then(_ => context.log.info('Done'))
    .catch(err => context.log.error(err));

  return { statusCode: 204 };
};

/**
 *
 * @param {Face[]} response
 * @returns {string}
 */
function formatResponse(response) {
  let faces = response.length === 1 ? 'face' : 'faces';
  let text = `Hi! Thanks for playing. 😃
I found ${response.length} ${faces} in this image.
`;

  response.forEach(image => {
    text += `

* Age: ${image.age}`;

    for (const emotion in image.emotion) {
      text += `
  - ${emotion}: ${image.emotion[emotion]}`;
    }
  });
  return text;
}

module.exports = { handle };
