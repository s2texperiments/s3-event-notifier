const response = require("cf-fetch-response");

exports.handler = async (event, context) => {
    console.log(`REQUEST: ${JSON.stringify(event)}`);
    console.log(`CONTEXT: ${JSON.stringify(context)}`);

    try {
        return (async () => require("./handler.js").doHandle(event, context))
            .catch((e) => {
                console.log(`REJECTED: ${e}`);
                response.sendFail(event, context, e.message);
            });
    } catch (e) {
        console.log(`ERROR: ${e}`);
        return response.sendFail(event, context, e.message);
    }
};