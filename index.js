const response = require('cfn-response');

exports.handler = async (event, context) => {

    console.log(`REQUEST RECEIVED: \
        ${JSON.stringify(event)}`);

    response.send(
        event,
        context,
        response.Success,
        {
            'SubArn': '<sub_arn>'
        });
    return "fin";
};