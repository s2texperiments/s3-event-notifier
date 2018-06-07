const response = require("cf-fetch-response");

exports.handler = async (event, context) => {
    console.log(`REQUEST RECEIVED: \
        ${JSON.stringify(event)}`);
    console.log(`Context RECEIVED: \
        ${JSON.stringify(context)}`);

    return response.sendSuccess(event,context, {
        data:{
            SubArn: 'does_it_work_arn'
        }
    });
};