const AWS = require('aws-sdk');
const s3 = new AWS.S3();

module.exports = {
    putBucketNotificationConfiguration: async (params) =>
        new Promise((resolve, rejected) => {
            //delay timer to put Butcket Notification.
            //Otherwise following error could occur, if multiple s3 events will be appended:
            //A conflicting conditional operation is currently in progress against this resource`
            setTimeout(() => s3.putBucketNotificationConfiguration(params, (err, data) => err ? rejected(err) : resolve(data)),
                Math.floor(Math.random() * 5000));
        }),
    getBucketNotificationConfiguration: async (params) =>
        new Promise((resolve, rejected) =>
            s3.getBucketNotificationConfiguration(params, (err, data) =>
                err ? rejected(err) : resolve(data)))
};