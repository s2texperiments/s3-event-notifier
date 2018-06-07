const response = require("cf-fetch-response");

exports.handler = async (event, context) => {
    console.log(`REQUEST RECEIVED: ${JSON.stringify(event)}`);
    console.log(`Context RECEIVED: ${JSON.stringify(context)}`);
    return doHandle(event, context)
        .catch((e) => response.sendFail(event, context, e.message));
};

async function doHandle(event, context) {

    let {
        ResourceProperties: {
            S3Bucket: s3Bucket,
            S3Prefix: s3Prefix,
            EventLambdaArn: eventLambdaArn
        }
    } = event;
    if(!s3Bucket || !s3Prefix || !eventLambdaArn){
        throw `missing mandatory argument: s3Bucket=${s3Bucket} s3Prefix=${s3Prefix} eventLambdaArn=${eventLambdaArn}`
    }
    return response.sendSuccess(event, context, {
        data: {
            SubArn: 'wtf'
        }
    });
}