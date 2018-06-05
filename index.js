const fetch = require("node-fetch");

exports.handler = async (event, context) => {
    console.log(`REQUEST RECEIVED: \
        ${JSON.stringify(event)}`);

    await fetch(event.ResponseURL,
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