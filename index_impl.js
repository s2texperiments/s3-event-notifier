const s3Api = require('./s3Api.js');
const response = require("cf-fetch-response");


exports.handler = async (event, context) => {
    switch (event.RequestType.toLowerCase()) {
        case 'create': {
            return create(event, context);
        }
        case 'update': {
            return create(event, context);
        }
        case 'delete': {
            console.log('d');
            break;
        }
    }
};

let create = async (event, context) => {

    let {
        StackId: StackId,
        LogicalResourceId: LogicalResourceId,
        ResourceProperties: {
            S3Bucket,
            S3Prefix,
            S3Suffix,
            S3Event,
            EventLambdaArn,
        }
    } = event;

    let notificationId = collectNotificationId({StackId, LogicalResourceId});

    console.log(`Create s3 notification configuration for ${notificationId}`);
    //mandatory fields
    if (!S3Bucket || !S3Event || !EventLambdaArn) {
        throw `missing mandatory argument: s3Bucket=${s3Bucket} S3Event=${s3Event} eventLambdaArn=${eventLambdaArn}`
    }

    console.log(`get bucket notification configuration for ${S3Bucket}`);
    let {
        TopicConfigurations: oldTopicConfigurations,
        QueueConfigurations: oldQueueConfigurations,
        LambdaFunctionConfigurations: oldLambdaFnConfigurations
    } = await s3Api.getBucketNotificationConfiguration({Bucket: S3Bucket});


    console.log(`Search preexisting lambda function configuration with same id`);
    let existingLambdaFnConfig = oldLambdaFnConfigurations.find(n => n.Id === notificationId);
    if (existingLambdaFnConfig) {
        throw `lamdba function with id ${notificationId} already exists`
    }



    let newLambdaFnConfiguration = createLamdbaFnConfig({
        Id: notificationId,
        S3Event,
        EventLambdaArn,
        S3Prefix,
        S3Suffix
    });

    console.log(`Merge lambda function configuration and push it to bucket ${S3Bucket}`);
    return s3Api.putBucketNotificationConfiguration({
        Bucket: S3Bucket,
        NotificationConfiguration: {
            TopicConfigurations: oldTopicConfigurations,
            QueueConfigurations: oldQueueConfigurations,
            LambdaFunctionConfigurations: [...oldLambdaFnConfigurations, newLambdaFnConfiguration]
        }
    }).then(() => response.sendSuccess(event, context, {
        data: {
            NotificationId: collectNotificationId({StackId, LogicalResourceId})
        }
    }));
};

let createLamdbaFnConfig = ({
                                Id,
                                S3Event,
                                EventLambdaArn,
                                S3Prefix,
                                S3Suffix
                            } = {}) => {
    console.log(`Create lambda function configuration from: 
    Id: ${Id}, 
    S3Event: ${S3Event}, 
    EventLmbdaArn: ${EventLambdaArn},  
    S3Prefix: ${S3Prefix},
    S3Suffix: ${S3Suffix}
    `);
    return Object.assign(collectFilterProperty({S3Prefix, S3Suffix}), {
        Events: [S3Event],
        LambdaFunctionArn: EventLambdaArn,
        Id: Id
    });
};

let collectFilterProperty = ({S3Prefix, S3Suffix} = {}) => {

    console.log(`Collect filter property`);
    let rules = [{Name: 'prefix', Value: S3Prefix}, {Name: 'suffix', Value: S3Suffix}]
        .reduce((rules, filterCfg) =>
            filterCfg.Value ? [...rules, filterCfg] : rules, []);
    console.log(`Filter rules: ${rules}`);

    return rules.length ? {
        Filter: {
            Key: {
                FilterRules: rules
            }
        },
    } : {};
};

let collectNotificationId = ({StackId, LogicalResourceId}) => `${StackId}:s3EventNotifier:${LogicalResourceId}`;

let deleteFn = () => {

};
