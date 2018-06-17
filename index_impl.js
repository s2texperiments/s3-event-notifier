const s3Api = require('./s3Api.js');
const response = require("cf-fetch-response");


exports.handler = async (event, context) => {
    switch (event.RequestType.toLowerCase()) {
        case 'create': {
            return create(event, context);
        }
        case 'update': {
            return update(event, context);
        }
        case 'delete': {
            return deleteFn(event, context);
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

    let notificationId = createNotificationId({StackId, LogicalResourceId});

    console.log(`Create S3 notification configuration for ${notificationId}`);
    //mandatory fields
    if (!S3Bucket || !S3Event || !EventLambdaArn) {
        throw `missing mandatory argument: s3Bucket=${S3Bucket} S3Event=${S3Event} eventLambdaArn=${EventLambdaArn}`
    }

    console.log(`get bucket notification configuration for ${S3Bucket}`);
    let {
        TopicConfigurations: oldTopicConfigurations,
        QueueConfigurations: oldQueueConfigurations,
        LambdaFunctionConfigurations: oldLambdaFnConfigurations
    } = await s3Api.getBucketNotificationConfiguration({Bucket: S3Bucket});
    console.log(`Old LambdaFunctionConfigurations: ${oldLambdaFnConfigurations}`);

    console.log(`Search existing lambda function configuration with same id`);
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
    await s3Api.putBucketNotificationConfiguration({
        Bucket: S3Bucket,
        NotificationConfiguration: {
            TopicConfigurations: oldTopicConfigurations,
            QueueConfigurations: oldQueueConfigurations,
            LambdaFunctionConfigurations: [...oldLambdaFnConfigurations, newLambdaFnConfiguration]
        }
    });


    console.log(`Wait till lambda function configuration is updated in S3`);

    await new Promise((resolve,rejected)=>{
        setInterval(async ()=>{
            let {
                LambdaFunctionConfigurations: updatedLambdaFnConfigurations
            } = await s3Api.getBucketNotificationConfiguration({Bucket: S3Bucket});
            let lambdaConfigWasUpdated = updatedLambdaFnConfigurations.find(n => n.Id === notificationId);
            if (lambdaConfigWasUpdated) {
                resolve(lambdaConfigWasUpdated);
            }
        },1000);
    });

    return response.sendSuccess(event, context, {
        data: {
            NotificationId: createNotificationId({StackId, LogicalResourceId})
        },
        physicalResourceId: createNotificationId({StackId, LogicalResourceId})
    });
};

let update = async (event, context) => {

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

    let notificationId = createNotificationId({StackId, LogicalResourceId});

    console.log(`Update S3 notification configuration for ${notificationId}`);
    //mandatory fields
    if (!S3Bucket || !S3Event || !EventLambdaArn) {
        throw `missing mandatory argument: s3Bucket=${S3Bucket} S3Event=${S3Event} eventLambdaArn=${EventLambdaArn}`
    }

    console.log(`get bucket notification configuration for ${S3Bucket}`);
    let {
        TopicConfigurations: oldTopicConfigurations,
        QueueConfigurations: oldQueueConfigurations,
        LambdaFunctionConfigurations: oldLambdaFnConfigurations
    } = await s3Api.getBucketNotificationConfiguration({Bucket: S3Bucket});
    console.log(`Old LambdaFunctionConfigurations: ${oldLambdaFnConfigurations}`);

    console.log(`Search lambda function configuration to update`);
    let existingLambdaFnConfig = oldLambdaFnConfigurations.find(n => n.Id === notificationId);
    if (!existingLambdaFnConfig) {
        throw `lambda function with id ${notificationId} not found`
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
            LambdaFunctionConfigurations: [...(oldLambdaFnConfigurations.filter(n => n.Id !== notificationId)), newLambdaFnConfiguration]
        }
    }).then(() => response.sendSuccess(event, context, {
        data: {
            NotificationId: createNotificationId({StackId, LogicalResourceId})
        },
        physicalResourceId: createNotificationId({StackId, LogicalResourceId})
    }));
};

let deleteFn = async (event, context) => {

    let {
        StackId: StackId,
        LogicalResourceId: LogicalResourceId,
        ResourceProperties: {
            S3Bucket
        }
    } = event;

    let notificationId = createNotificationId({StackId, LogicalResourceId});

    console.log(`Delete S3 notification configuration for ${notificationId}`);
    //mandatory fields
    if (!S3Bucket) {
        throw `missing mandatory argument: s3Bucket=${s3Bucket}`
    }

    console.log(`get bucket notification configuration for ${S3Bucket}`);
    let {
        TopicConfigurations: oldTopicConfigurations,
        QueueConfigurations: oldQueueConfigurations,
        LambdaFunctionConfigurations: oldLambdaFnConfigurations
    } = await s3Api.getBucketNotificationConfiguration({Bucket: S3Bucket});
    console.log(`Old LambdaFunctionConfigurations: ${oldLambdaFnConfigurations}`);

    console.log(`Search lambda function configuration to delete`);
    let existingLambdaFnConfig = oldLambdaFnConfigurations.find(n => n.Id === notificationId);
    if (!existingLambdaFnConfig) {
        return response.sendSuccess(event, context, {
            physicalResourceId: notificationId
        });
    }


    console.log(`Delete lambda function configuration and push it to bucket ${S3Bucket}`);
    return s3Api.putBucketNotificationConfiguration({
        Bucket: S3Bucket,
        NotificationConfiguration: {
            TopicConfigurations: oldTopicConfigurations,
            QueueConfigurations: oldQueueConfigurations,
            LambdaFunctionConfigurations: [...(oldLambdaFnConfigurations.filter(n => n.Id !== notificationId))]
        }
    }).then(() => response.sendSuccess(event, context, {
        data: {
            NotificationId: createNotificationId({StackId, LogicalResourceId})
        },
        physicalResourceId: createNotificationId({StackId, LogicalResourceId})
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

let createNotificationId = ({StackId, LogicalResourceId}) => `${StackId}:s3EventNotifier:${LogicalResourceId}`;
