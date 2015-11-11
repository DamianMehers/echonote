/**
 * Created by damian mehers on 10 Nov 2015.
 * Copyright (c) 2015 Atadore SARL
 */

/**
 * For more information on using this Skill please see https://damianblog.com/2015/11/11/alexa-evernote
 * This is based on the example Skill, and most of the comments and code come from it.
 *
 * For additional samples, visit the Alexa Skills Kit Getting Started guide at
 * http://amzn.to/1LGWsLG
 */


// To get IntelliJ to be happy
if(!require) {
    var require : any = {};
}

var Evernote = require('evernote').Evernote;


// The following are (incomplete) TypeScript definitions for the Alexa API.
interface AlexaApplication {
    applicationId : string
}

interface AlexaSession {
    'new' : boolean,
    sessionId : string,
    application : AlexaApplication,
    attributes : any, // TODO: Fix these
    user : any

}


//interface AlexaSlot {
//    name : string,
//    value : string
//}

//interface AlexaSlots {
//    [slots : string]  : AlexaSlot;
//}


interface AlexaIntent {
    slots : any; // AlexaSlots;
    name : string;
}

interface AlexaRequest {
    requestId : string,
    type : string,
    timestamp? : string,
}


interface AlexaLaunchRequest extends AlexaRequest {
}

interface AlexaIntentRequest extends AlexaRequest {
    intent : AlexaIntent
}

interface SessionEndedRequest extends AlexaRequest {
    reason : string
}

interface AlexaEvent {
    session : AlexaSession,
    request : AlexaLaunchRequest|AlexaIntentRequest|SessionEndedRequest,
    version : string
}

interface AlexaOutputSpeech {
    type : string,
    text : string,
    ssml? : string
}

interface AlexaCard {
    type : string,
    title : string,
    content : string
}

interface AlexaReprompt {
    outputSpeech : AlexaOutputSpeech
}

interface AlexaSessionAttributes {
    string : any
}

interface AlexaSpeechletResponse {
    outputSpeech : AlexaOutputSpeech,
    card : AlexaCard,
    reprompt : AlexaReprompt,
    shouldEndSession : boolean
}

interface AlexaResponse {
    version : string,
    [sessionAttributes : number] : AlexaSessionAttributes,
    response : AlexaSpeechletResponse,

}

interface AlexaContext {
    succeed(response?:AlexaResponse) : void;
    fail(reason:string) : void;
}

if (!exports) {
    var exports:any = {handler: null};
}

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event:AlexaEvent, context:AlexaContext) {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */
        /*
         if (event.session.application.applicationId !== "amzn1.echo-sdk-ams.app.[unique-value-here]") {
         context.fail("Invalid Application ID");
         }
         */

        if (event.session.new) {
            var sessionStartedRequest:SessionStartedRequest = {requestId: event.request.requestId};
            onSessionStarted(sessionStartedRequest, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(<AlexaIntentRequest>event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(<SessionEndedRequest>event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

interface SessionStartedRequest {
    requestId : string
}


/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest:SessionStartedRequest, session:AlexaSession) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId +
        ", sessionId=" + session.sessionId);
}

interface LaunchCallback {
    (sessionAttributes:AlexaSessionAttributes[], speechletResponse:AlexaSpeechletResponse) : void;
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest:AlexaRequest, session:AlexaSession, callback:LaunchCallback) {
    console.log("onLaunch requestId=" + launchRequest.requestId +
        ", sessionId=" + session.sessionId);

    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

interface IntentCallback {
    (sessionAttributes:AlexaSessionAttributes[], speechletResponse:AlexaSpeechletResponse) :void;
}


/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest:AlexaIntentRequest, session:AlexaSession, callback:IntentCallback) {

    console.log("onIntent requestId=" + intentRequest.requestId +
        ", sessionId=" + session.sessionId);

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    if ("TakeANote" === intentName) {
        saveNote(intent, session, callback);
    } else {
        throw "Invalid intent: " + intentName;
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest:SessionEndedRequest, session:AlexaSession) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId +
        ", sessionId=" + session.sessionId);
    // Add cleanup logic here
}

// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback:LaunchCallback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    var sessionAttributes:AlexaSessionAttributes[] = [];
    var cardTitle = "Welcome";
    var speechOutput = "...";
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    var repromptText = "...";
    var shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}


/**
 * Sets the color in the session and prepares the speech to reply to the user.
 */
function saveNote(intent:AlexaIntent, session:AlexaSession, callback:LaunchCallback) {

    var cardTitle = intent.name;
    var contentSlot = intent.slots["Content"];
    var repromptText = "";
    var sessionAttributes:any = [];
    var shouldEndSession = false;
    var speechOutput = "";


    if (contentSlot) {
        var noteText:string = contentSlot.value;
        speechOutput = "OK.";
        repromptText = "What was that?";
        shouldEndSession = true;
        var noteStoreURL = '...';
        var authenticationToken:string = '...';
        var noteStoreTransport = new Evernote.Thrift.NodeBinaryHttpTransport(noteStoreURL);
        var noteStoreProtocol = new Evernote.Thrift.BinaryProtocol(noteStoreTransport);
        var noteStore = new Evernote.NoteStoreClient(noteStoreProtocol);

        var note = new Evernote.Note();
        note.title = "New note from Alexa";
        var nBody : string = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>";
        nBody += "<!DOCTYPE en-note SYSTEM \"http://xml.evernote.com/pub/enml2.dtd\">";
        nBody += "<en-note>" + noteText + "</en-note>";
        note.content = nBody;

        noteStore.createNote(authenticationToken, note, function(result : any) {
            console.log('Create note result: ' + JSON.stringify(result));
            callback(sessionAttributes,
                buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
        });
    } else {
        speechOutput = "I didn't catch that note, please try again";
        repromptText = "I didn't hear that note.  You can take a note by saying Take a Note followed by your content";
        callback(sessionAttributes,
            buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
    }
}

// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title:string, output:string, repromptText:string, shouldEndSession:boolean):AlexaSpeechletResponse {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: "SessionSpeechlet - " + title,
            content: "SessionSpeechlet - " + output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes:AlexaSessionAttributes[], speechletResponse:AlexaSpeechletResponse):AlexaResponse {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}
