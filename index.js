const response = require("cf-fetch-response");

exports.handler = async (event, context) => {
    console.log(`REQUEST: ${JSON.stringify(event)}`);
    console.log(`CONTEXT: ${JSON.stringify(context)}`);

    let sendFail = (e) => {
        console.log(`ERROR: ${e}`);
        return response.sendFail(event, context, e.message)
    };

    return (async () => {
        try {
            return require("./index_impl.js").handler(event, context).catch((e) => sendFail(e));
        } catch (e) {
            return sendFail(e);
        }
    })();
};