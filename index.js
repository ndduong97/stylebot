'use strict';

// --------------- HTTP -----------------------

var https = require('https');

// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
  return {
    outputSpeech: {
      type: 'PlainText',
      text: output,
    },
    card: {
      type: 'Simple',
      title: `${title}`,
      content: `${output}`,
    },
    reprompt: {
      outputSpeech: {
        type: 'PlainText',
        text: repromptText,
      },
    },
    shouldEndSession,
  };
}

function buildResponse(sessionAttributes, speechletResponse) {
  return {
    version: '1.0',
    sessionAttributes,
    response: speechletResponse,
  };
}

function buildSSMLResponses(title, output, repromptText, shouldEndSession) {
  return {
    outputSpeech: {
      type: 'text',
      ssml: output
    },
    card: {
      type: 'Simple',
      title: `SessionSpeechlet - ${title}`,
      content: `SessionSpeechlet - ${output}`,
    },
    reprompt: {
      outputSpeech: {
        type: 'PlainText',
        text: repromptText,
      },
    },
    shouldEndSession,
  };
}

// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
  // If we wanted to initialize the session to have some attributes we could add those here.
  const sessionAttributes = {};
  const cardTitle = 'Welcome to ColorBot';
  const speechOutput = 'Welcome to Color Bot. You can ask me which colors pair well together for an outfit. ' +
   'For example, ask what color jacket goes well with blue pants';

  // If the user either does not reply to the welcome message or says something that is not
  // understood, they will be prompted again with this text.
  const repromptText = 'You can ask me which colors pair well together for an out fit. ' +
   'For example, ask what color shirt goes well with blue jeans';
  const shouldEndSession = false;

  callback(sessionAttributes,
    buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
  }

function handleSessionEndRequest(callback) {
    const cardTitle = 'Quit ColorBot';
    const speechOutput = 'Goodbye!';
    // Setting this to true ends the session and exits the skill.
    const shouldEndSession = true;

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
  }

function getQuestionIntent(intent, session, callback) {
    const colorGivenSlot = intent.slots.Color;
    const clothesGivenSlot = intent.slots.Clothes;
    const clothes2GivenSlot = intent.slots.Clothes_two;
    const cardTitle = 'Match Clothing Items';
    let shouldEndSession = true;
    let speechOutput = '';
    let repromptText = '';

    let sessionAttributes = {
      "count" : 1
    };

    getJSON(function (events) {
      const colorGiven = colorGivenSlot.value;
      const clothesGiven = clothesGivenSlot.value;
      const clothes2Given = clothes2GivenSlot.value;
      var parsingJSON = events;

      try {
        let colorMatched = parsingJSON[clothesGiven][colorGiven][clothes2Given][0];

        if (clothesGiven === 'jeans' | clothesGiven === 'shoes' | clothesGiven === 'pants') {
          speechOutput = `A pair of ${colorMatched} ${clothesGiven} goes best with ${colorGiven} ${clothes2Given}.`;
        } else {
          speechOutput = `A ${colorMatched} ${clothesGiven} goes best with ${colorGiven} ${clothes2Given}.`;
        }

        callback(sessionAttributes,
          buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
      } catch (err) {

        try {
          if (session.attributes.count == 1) {
            speechOutput = `Sorry, I currently do not know that color and clothing item combination. Please try another one.`;

            callback(sessionAttributes,
              buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
          }
        } catch (err) {
          shouldEndSession = false;
          repromptText = `I couldn't hear you. Can you repeat that?`;
          speechOutput = `I couldn't hear you. Can you repeat that?`;

          callback(sessionAttributes,
            buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
        }
      }
    });
}

function getHelpIntent (intent, session, callback) {
  const cardTitle = 'ColorBot Help';
  let shouldEndSession = false;
  let speechOutput = '';
  let repromptText = '';
  let sessionAttributes = {};

  speechOutput = `You can ask me the following colors: green, red, blue, navy, orange, yellow, black,
                  gray, purple, white, brown, pink. ` + `And also the following clothing items:
                  jeans, shirt, jacket, coat, shoes, sweater, hoodie, pants. `;

  callback(sessionAttributes,
    buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function getJSON(eventCallback) {
    var url = `https://api.myjson.com/bins/nscvh`;

    https.get(url, function(res) {
        var body = '';

        res.on('data', function (chunk) {
            body += chunk;
        });

        res.on('end', function () {
            var stringResult = JSON.parse(body);
            eventCallback(stringResult);
        });
    }).on('error', function (e) {
        console.log("Got error: ", e);
    });
}

// --------------- Events -----------------------

/**
* Called when the session starts.
*/
function onSessionStarted(sessionStartedRequest, session) {
  console.log(`onSessionStarted requestId=${sessionStartedRequest.requestId}, sessionId=${session.sessionId}`);
}

/**
* Called when the user launches the skill without specifying what they want.
*/
function onLaunch(launchRequest, session, callback) {
  console.log(`onLaunch requestId=${launchRequest.requestId}, sessionId=${session.sessionId}`);
  // Dispatch to your skill's launch.
  getWelcomeResponse(callback);
}

/**
* Called when the user specifies an intent for this skill.
*/
function onIntent(intentRequest, session, callback) {
  console.log(`onIntent requestId=${intentRequest.requestId}, sessionId=${session.sessionId}`);

  const intent = intentRequest.intent;
  const intentName = intentRequest.intent.name;

  // Dispatch to your skill's intent handlers
  if (intentName === 'WhatColorMatch') {
    getQuestionIntent(intent, session, callback);
  } else if (intentName === 'ColorBotHelp') {
    getHelpIntent(intent, session, callback);
  } else if (intentName === 'AMAZON.HelpIntent') {
    getWelcomeResponse(callback);
  } else if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent') {
    handleSessionEndRequest(callback);
  } else {
    throw new Error('Invalid intent');
  }
}

/**
* Called when the user ends the session.
* Is not called when the skill returns shouldEndSession=true.
*/
function onSessionEnded(sessionEndedRequest, session) {
  console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);
  // Add cleanup logic here
}

// --------------- Main handler -----------------------

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = (event, context, callback) => {
  try {
    console.log(`event.session.application.applicationId=${event.session.application.applicationId}`);

    /**
    * Uncomment this if statement and populate with your skill's application ID to
    * prevent someone else from configuring a skill that sends requests to this function.
    */
    /*
    if (event.session.application.applicationId !== 'amzn1.echo-sdk-ams.app.[unique-value-here]') {
    callback('Invalid Application ID');
  }
  */

  if (event.session.new) {
    onSessionStarted({ requestId: event.request.requestId }, event.session);
  }

  if (event.request.type === 'LaunchRequest') {
    onLaunch(event.request,
      event.session,
      (sessionAttributes, speechletResponse) => {
        callback(null, buildResponse(sessionAttributes, speechletResponse));
      });
    } else if (event.request.type === 'IntentRequest') {
      onIntent(event.request,
        event.session,
        (sessionAttributes, speechletResponse) => {
          callback(null, buildResponse(sessionAttributes, speechletResponse));
        });
      } else if (event.request.type === 'SessionEndedRequest') {
        onSessionEnded(event.request, event.session);
        callback();
      }
    } catch (err) {
      callback(err);
    }
  };
