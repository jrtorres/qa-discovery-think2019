/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var express = require('express'); // app server
var bodyParser = require('body-parser'); // parser for post requests
var AssistantV1 = require('watson-developer-cloud/assistant/v1'); // watson sdk
var DiscoveryV1 = require('watson-developer-cloud/discovery/v1');

var app = express();

// Bootstrap application settings
app.use(express.static('./public')); // load UI from public folder
app.use(bodyParser.json());

// Create the service wrapper, SDK will search env properties file and fallback to vcap services if no iam key is provided here
var assistant = new AssistantV1({
  version: '2018-09-20'
});

var discovery = new DiscoveryV1({
  version: '2018-10-15'
});

// Endpoint to be call from the client side
app.post('/api/message', function (req, res) {
  var workspace = process.env.WORKSPACE_ID || '<workspace-id>';
  if (!workspace || workspace === '<workspace-id>') {
    return res.json({
      'output': {
        'text': 'The app has not been configured with a <b>WORKSPACE_ID</b> environment variable. Please refer to the ' + '<a href="https://github.com/watson-developer-cloud/assistant-simple">README</a> documentation on how to set this variable. <br>' + 'Once a workspace has been defined the intents may be imported from ' + '<a href="https://github.com/watson-developer-cloud/assistant-simple/blob/master/training/car_workspace.json">here</a> in order to get a working application.'
      }
    });
  }
  var payload = {
    workspace_id: workspace,
    context: req.body.context || {},
    input: req.body.input || {},
    alternate_intents: true
  };

  var call_discovery_flag_name = 'call_discovery';
  var discovery_environment_id = process.env.DISCOVERY_ENVIRONMENT_ID || '<discovery-environment-id>';
  var discovery_collection_id = process.env.DISCOVERY_COLLECTION_ID || '<discovery-collection-id>';
  //var discovery_collection_ids = process.env.DISCOVERY_COLLECTION_IDS
  //if (!discovery_environment_id || !discovery_collection_id) {
  //  return res.json({
  //    'output': {
  //      'text': 'The app requires a DISCOVERY instance to be setup and documents ingest into a collection. Need to provide the environment id for the Discovery instance and the collection id which includes the corpus of documents.'
  //    }
  //  });
  //}

  // Send the input to the assistant service
  assistant.message(payload, function (err, data) {
    if (err) {
      return res.status(err.code || 500).json(err);
    }
    //return res.json(updateMessage(payload, data));

    if (data.output && data.output.action) {
      console.log('Have an action to call....')
      var outaction = JSON.stringify(data.output.action);
      if (outaction.indexOf(call_discovery_flag_name) > -1) {
        console.log('call to discovery....')

        var user_input = data.input.text;
        var discovery_payload = {
          environment_id: discovery_environment_id,
          collection_id: discovery_collection_id,
          //collection_ids: discovery_collection_ids,
          natural_language_query: user_input,
          passages: true
        };

        console.log("------------------------------------------------------------------------------");
        console.log(discovery_payload);
        console.log("------------------------------------------------------------------------------");

        //discovery.federatedQuery(discovery_payload, function (error, discovery_response) {
        discovery.query(discovery_payload, function (error, discovery_response) {
          if (error) {
            console.log("There was a problem with the wds call....")
            return res.status(error.code || 500).json(error);
          }
          //Capture original conversation message to add discovery responses.
          var resp = data;

          // In the following option we return the top 3 documents from Discovery
          /* var numResults = discovery_response.results.length;
          console.log("Number of resutls - " + numResults);
          var nResponses = 0;
          if (numResults > 3) {
            nResponses = 3;
          } else {
            nResponses = numResults;
          }
          resp.output.text = "";
          for (var i = 0; i < nResponses; i++) {
            console.log(i)
            resp.output.text = resp.output.text + "["+discovery_response.results[i].extracted_metadata.filename+"]<br>" + discovery_response.results[i].text.substring(0,250) + "<br><hr><br><br>";
          } */

          // In the following option, we return top 3 passages instead of complete documents
          var numResults = discovery_response.passages.length;
          console.log("number of responses - " + numResults);
          var nResponses = 0;
          if (numResults > 3) {
            nResponses = 3;
          } else {
            nResponses = numResults;
          }
          resp.output.text = "";
          for (var i = 0; i < nResponses; i++) {
            resp.output.text = resp.output.text + "["+discovery_response.passages[i].document_id+"]<br>" + discovery_response.passages[i].passage_text + "<br><hr><br><br>";
          } 

          console.log(resp);
          console.log("here 1");

          return res.json(updateMessage(payload, resp));

        });
      } else {
        console.log("here 2");
        return res.json(data);
      }
    } else {
      console.log("here 3");
      return res.json(data);
    }
  });
});

/**
 * Updates the response text using the intent confidence
 * @param  {Object} input The request to the Assistant service
 * @param  {Object} response The response from the Assistant service
 * @return {Object}          The response with the updated message
 */
function updateMessage(input, response) {
  var responseText = null;
  if (!response.output) {
    response.output = {};
  } else {
    return response;
  }
  if (response.intents && response.intents[0]) {
    var intent = response.intents[0];
    // Depending on the confidence of the response the app can return different messages.
    // The confidence will vary depending on how well the system is trained. The service will always try to assign
    // a class/intent to the input. If the confidence is low, then it suggests the service is unsure of the
    // user's intent . In these cases it is usually best to return a disambiguation message
    // ('I did not understand your intent, please rephrase your question', etc..)
    if (intent.confidence >= 0.75) {
      responseText = 'I understood your intent was ' + intent.intent;
    } else if (intent.confidence >= 0.5) {
      responseText = 'I think your intent was ' + intent.intent;
    } else {
      responseText = 'I did not understand your intent';
    }
  }
  response.output.text = responseText;
  return response;
}

module.exports = app;