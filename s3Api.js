const AWS = require('aws-sdk');
const s3 = new AWS.S3();

let retries = 0;
let getDelay = () => Math.floor(Math.random() * 5000);

//delay timer to put Bucket Notification.
//Otherwise following error could occur, if multiple s3 events will be appended:
//A conflicting conditional operation is currently in progress against this resource`
let putBucketNotificationConfiguration = async (params) =>
    setTimeout(() => new Promise((resolve, rejected) =>
        s3.putBucketNotificationConfiguration(params, (err, data) =>
            err ? rejected(err) : resolve(data))), getDelay());


/**
 * Retry when `A conflicting conditional operation is currently in progress against this resource` occur
 */
let putBucketNotificationConfigurationWithRetry = async (params) => putBucketNotificationConfiguration(params)
    .catch(e => {
        if (e.contains('A conflicting conditional operation is currently in progress against this resource')
            && retries < 5) {
            ++retries;
            return putBucketNotificationConfigurationWithRetry(params)
        }
    });

module.exports = {
    putBucketNotificationConfiguration: async (params) => putBucketNotificationConfigurationWithRetry(params),
    getBucketNotificationConfiguration: async (params) =>
        new Promise((resolve, rejected) =>
            s3.getBucketNotificationConfiguration(params, (err, data) =>
                err ? rejected(err) : resolve(data)))
};