const fetch = require("node-fetch");
const url = require("url");

exports.handler = async (event, context) => {
    console.log(`REQUEST RECEIVED: \
        ${JSON.stringify(event)}`);
    console.log(`Context RECEIVED: \
        ${JSON.stringify(context)}`);

    let payload = JSON.stringify({
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
    });

    await fetch(event.ResponseURL, {
            method: 'PUT',
            headers: {
                'content-type': '',
                'content-length':payload.length
            },
            body: payload
        }
    ).then(response => response.text())
        .then(data => console.log(data))
        .catch(error => console.log("Err:" + error));


    return "fin"
}