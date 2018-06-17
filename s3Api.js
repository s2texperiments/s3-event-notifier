const AWS = require('aws-sdk');
const s3 = new AWS.S3();

module.exports = {
    putBucketNotificationConfiguration: async (params) =>new Promise((resolve, rejected) =>
        s3.putBucketNotificationConfiguration(params, (err, data) =>
            err ? rejected(err) : resolve(data))),
    getBucketNotificationConfiguration: async (params) =>
        new Promise((resolve, rejected) =>
            s3.getBucketNotificationConfiguration(params, (err, data) =>
                err ? rejected(err) : resolve(data)))
};