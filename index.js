const fetch = require("node-fetch");
const url = require("url");

exports.handler = async (event, context) => {
    console.log(`REQUEST RECEIVED: \
        ${JSON.stringify(event)}`);

    let parsedUrl = url.parse(event.ResponseURL);

    await fetch(`https://${parsedUrl.hostname}${parsedUrl.path}`,
        {
            method: 'PUT',
            body: JSON.stringify({
                Status: "SUCCESS",
                Reason: "See the details in CloudWatch Log Stream: " + context.logStreamName,
                PhysicalResourceId: context.logStreamName,
                StackId: event.StackId,
                RequestId: event.RequestId,
                LogicalResourceId: event.LogicalResourceId,
                NoEcho: false,
                Data: {
                    SubArn: 'some_arn'
                }
            })
        }
    );


    return "fin"
};