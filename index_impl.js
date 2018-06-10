const s3Api = require('./s3Api.js');
const response = require("cf-fetch-response");

exports.handler = async (event, context) => {

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
        let rules = [{
            Name: 'prefix',
            Value: s3Prefix
        }, {
            Name: 'suffix',
            Value: s3Suffix
        }].reduce((rules, filterCfg) => {
            if (filterCfg.Value) {
                rules.push(filterCfg)
            }
            return rules;
        }, []);

        return rules.length ? {
            Filter: {
                Key: {
                    FilterRules: rules
                }
            },
        } : {};
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
};
