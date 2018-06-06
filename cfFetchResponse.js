const fetch = require("node-fetch");


module.exports = {

// {size = 'big', cords = { x: 0, y: 0 }, radius = 25} = {}
    sendSuccess: async (event, context, {data = {}, physicalResourceId = context.logStreamName} = {}) => {

        let payload = JSON.stringify({
            Status: 'SUCCESS',
            Reason: `See the details in CloudWatch Log Stream: ${context.logStreamName}`,
            PhysicalResourceId: physicalResourceId,
            StackId: event.StackId,
            RequestId: event.RequestId,
            LogicalResourceId: event.LogicalResourceId,
            NoEcho: false,
            Data: data
        });

        return await fetch(event.ResponseURL, {
            method: 'PUT',
            headers: {
                'content-type': '',
                'content-length': payload.length
            },
            body: payload
        }).then(response => response.text())
            .then(data => console.log(data))
            .catch(error => console.warn(error));
    }
};