/**
  *
  * Format and send request to Watson Discovery service if marked as necessary.
  *
  * @param {object} params - the parameters.
  * @param {string} params.iam_apikey - default parameter, must be set. The IAM apikey for Discovery service.
  * @param {string} params.url - default parameter, must be set. The url for Discovery service.
  * @param {string} params.environment_id - default parameter, must be set. The environment_id for Discovery service.
  * @param {string} params.collection_id - default parameter, must be set. The collection_id for Discovery service
  * @param {string} params.input - input text to be sent to Discovery service.
  * @param {string} params.output - the output of the Conversation service results
  *
  * @return {object} the JSON of Discovery's response, or the original JSON if discovery was not called.
  *
  */
 const assert = require('assert');
 const DiscoveryV1 = require('watson-developer-cloud/discovery/v1');
 
 function main(params) {
   return new Promise(function (resolve, reject) {
     assert(params, 'params cannot be null');
     assert(params.iam_apikey, 'params.iam_apikey cannot be null');
     assert(params.environment_id, 'params.environment_id cannot be null');
     assert(params.collection_id, 'params.collection_id cannot be null');
 
     let discovery;
     
     discovery = new DiscoveryV1({
         iam_apikey: params.iam_apikey,
         url: params.url,
         version: '2018-08-01',
     });
 
 
     discovery.query({
         environment_id: params.environment_id,
         collection_id: params.collection_id,
         'natural_language_query':params.text
         }, function(err, data) {
             if (err) {
                 return reject(err);
             }
             var i = 0;
             var discoveryResults = [];
             while (data.results[i] && i < 3 ) {
                 let body = data.results[i].contentHtml;
                 discoveryResults[i] = {
                     body: body,
                     bodySnippet: (body.length < 144 ? body : (body.substring(0, 144) + '...')).replace(/<\/?[a-zA-Z]+>/g, ''),
                     confidence: data.results[i].score,
                     id: data.results[i].id,
                     sourceUrl: data.results[i].sourceUrl,
                     title: data.results[i].title
                 };
                 i++;
             }
 
             //params.output.discoveryResults = discoveryResults;
             params.discoveryResults = discoveryResults;
             var conversationWithData = params;
             delete conversationWithData.iam_apikey;
             return resolve(conversationWithData);
             //return resolve(discoveryResults);
     });
     });
 }
 
 module.exports.main = main;