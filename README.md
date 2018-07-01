#S3-Event-Notifier
Cloudformation Custom Resource for S3 Event Notification with Lambda

## Input:
``` yaml
#required
S3Bucket: Bucketname which the event should be added to 
S3Event: The S3 bucket event for which to invoke the Lambda function. For more information, see Supported Event Types in the Amazon Simple Storage Service Developer Guide.
EventLambdaArn: The Amazon Resource Name (ARN) of the Lambda function that Amazon S3 invokes when the specified event type occurs.             

#optional:
S3Prefix: prefix event filter (something like /myapp/static)
S3Suffix: suffix event filter (something like .img)

```

## Example

```yaml
S3EventNotifierCustomResource: 
  Type: "Custom::TestLambdaCrossStackRef"
  Properties: 
    ServiceToken:
      !Sub |
        arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:${LambdaFunctionName}
    S3Event: 's3:ObjectCreated:*'
    S3Bucket: my-bucket
    S3Prefix: this/is/an/example/path
    S3Suffix: "*.png"
    EventLambdaArn: GetAtt(event_lambda_function,'Arn')
    StackName: 
      Ref: "StackName"      
```

cloud_formation.CustomResource(
        ServiceToken=ImportValue(s3EventNotifierCustomARN),
        S3Event='s3:ObjectCreated:*',
        S3Bucket=ImportValue(s3BaseBucketId),
        S3Prefix='gcp/not-transcoded',
        EventLambdaArn=ImportValue(incomingNotTranscodedFileEventHandlerARN)
    )

## Limitations

Currently only on S3Event can be set.

Simultaneous creation of S3 event notification on the same bucket leads to crashes of the cloudformation template.
Workaround: build a chain with DependsOn method to ensure that S3-Event-Notifier will be called sequential.