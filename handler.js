const response = require("cf-fetch-response");

exports.handler = async (event, context) => {
    console.log(`REQUEST: ${JSON.stringify(event)}`);
    console.log(`CONTEXT: ${JSON.stringify(context)}`);

    let sendFail = (e) => {
        console.log(`ERROR: ${e}`);
        return response.sendFail(event, context, e.message)
    };

    try {
        return (async () => require("./handler.js").doHandle(event, context))
            .catch((e) => sendFail(e));
    } catch (e) {
        return sendFail(e);
    }
};