const fetch = require("node-fetch");
const url = require("url");

exports.handler = async (event, context) => {
    console.log(`REQUEST RECEIVED: \
        ${JSON.stringify(event)}`);
    console.log(`Context RECEIVED: \
        ${JSON.stringify(context)}`);

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
        }.then(response => response.text())
            .then(data => console.log(data)) // JSON from `response.json()` call
            .catch(error => console.log("Err:" + error))
    );


    return "fin"
};