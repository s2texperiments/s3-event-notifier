const response = require("cf-fetch-response");
const s3Api = require('./s3Api.js');

exports.handler = async (event, context) => {
    console.log(`REQUEST RECEIVED: ${JSON.stringify(event)}`);
    console.log(`Context RECEIVED: ${JSON.stringify(context)}`);
    return doHandle(event, context)
        .catch((e) => response.sendFail(event, context, e.message));
};

async function doHandle(event, context) {

    let {
        StackId: stackId,
        ResourceProperties: {
            S3Bucket: s3Bucket,
            S3Prefix: s3Prefix,
            S3Suffix: s3Suffix,
            S3Event: s3Event,
            EventLambdaArn: eventLambdaArn
        }
    } = event;

    //mandatory fields
    if (!s3Bucket || !s3Event || !eventLambdaArn) {
        throw `missing mandatory argument: s3Bucket=${s3Bucket} 
        S3Event=${s3Event}
        eventLambdaArn=${eventLambdaArn}`
    }

    let collectFilterProperty = () => {
        if (!(s3Prefix || s3Suffix)) {
            return {};
        }

        let rules = [];
        let pushIf = (condition, value) => condition ? rules.push(value) : -1;

        pushIf(s3Prefix, {
            Name: 'prefix',
            Value: s3Prefix
        });

        pushIf(s3Suffix, {
            Name: 'suffix',
            Value: s3Suffix
        });

        return {
            Filter: {
                Key: {
                    FilterRules: rules
                }
            },
        }
    };

    let createLamdbaFnConfiguration = () => {
        let cfg = {
            Events: [s3Event],
            LambdaFunctionArn: eventLambdaArn,
            Id: `${stackId}:s3EventNotifier:${s3Bucket}:${s3Event}:${eventLambdaArn}`,
        };
        return Object.assign(collectFilterProperty(s3Prefix, s3Suffix), cfg);
    };


    return s3Api.putBucketNotification({
        Bucket: s3Bucket,
        NotificationConfiguration: {
            LambdaFunctionConfigurations: [createLamdbaFnConfiguration()]
        },
    }).then(() => response.sendSuccess(event, context, {
        data: {
            NotificationId: `${stackId}:s3EventNotifier:${s3Bucket}:${s3Event}:${eventLambdaArn}`
        }
    }));
}