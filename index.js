const fetch = require("node-fetch");
const response = require("./cfFetchResponse.js");

exports.handler = async (event, context) => {
    console.log(`REQUEST RECEIVED: \
        ${JSON.stringify(event)}`);
    console.log(`Context RECEIVED: \
        ${JSON.stringify(context)}`);

    return response.sendSuccess(event,context, {
        data:{
            SubArn: 'another_arn'
        }
    });
};