var response = require('./cfn-response');
exports.handler = async (event, context) => {
    console.log(`REQUEST RECEIVED: \
        ${JSON.stringify(event)}`);

    response.send(
        event,
        context,
        response.SUCCESS,
        {
            SubArn: 'some_arn'
        });
    return "fin"
};