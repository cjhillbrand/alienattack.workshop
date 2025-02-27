import { Construct } from '@aws-cdk/cdk';
import { ResourceAwareConstruct, IParameterAwareProps } from './../resourceawarestack'


import KDS = require('@aws-cdk/aws-kinesis');
import KDF = require('@aws-cdk/aws-kinesisfirehose');
import IAM = require('@aws-cdk/aws-iam');
import APIGTW = require('@aws-cdk/aws-apigateway');
import { PolicyDocument } from '@aws-cdk/aws-iam';
import { Table } from '@aws-cdk/aws-dynamodb';
import Lambda = require('@aws-cdk/aws-lambda');
/**
 * MISSING KINESIS INTEGRATION - side effect
 * Uncomment the following line to solve it
 */
//import { KinesisEventSource, ApiEventSource } from '@aws-cdk/aws-lambda-event-sources';

export class IngestionConsumptionLayer extends ResourceAwareConstruct {

    kinesisStreams: KDS.Stream;
    kinesisFirehose: KDF.CfnDeliveryStream;
    /**
     * MISSING KINESIS FIREHOSE - side effect
     * Uncomment the following section to solve it
     */
    //private rawbucketarn: string;
    private userpool: string;
    private api: APIGTW.CfnRestApi;

    constructor(parent: Construct, name: string, props: IParameterAwareProps) {
        super(parent, name, props);
    /**
     * MISSING KINESIS FIREHOSE - side effect
     * Uncomment the following section to solve it
     */
        //this.rawbucketarn = props.getParameter('rawbucketarn');
        this.userpool = props.getParameter('userpool');
        this.createKinesis(props);
        this.createAPIGateway(props);
        this.updateUsersRoles(props);
    }

    createKinesis(props: IParameterAwareProps) {

        this.kinesisStreams = new KDS.Stream(this, props.getApplicationName() + 'InputStream', {
            streamName: props.getApplicationName() + '_InputStream',
            shardCount: 1
        });

        /**
         * MISSING KINESIS INTEGRATION
         * Uncomment the following lines to solve it
         */
        /*
        (<Lambda.Function> props.getParameter('lambda.scoreboard')).addEventSource(
               new KinesisEventSource(this.kinesisStreams, {
                batchSize : 700,
                startingPosition : Lambda.StartingPosition.Latest
               })
        );
        */

        /**
         * MISSING KINESIS FIREHOSE
         * Uncomment the following section to solve it
         */
/*
        let firehoseLogGroup = '/aws/kinesisfirehose/' + ((props.getAppRefName() + 'firehose').toLowerCase());
        let self = this;
        let firehoseRole = new IAM.Role(this, props.getAppRefName() + 'FirehoseToStreamsRole', {
            roleName: props.getAppRefName() + 'FirehoseToStreamsRole',
            assumedBy: new IAM.ServicePrincipal('firehose.amazonaws.com'),
            inlinePolicies: {
                'S3RawDataPermission': new PolicyDocument()
                    .addStatement(new IAM.PolicyStatement()
                        .allow()
                        .addAction('s3:AbortMultipartUpload')
                        .addAction('s3:GetBucketLocation')
                        .addAction('s3:GetObject')
                        .addAction('s3:ListBucket')
                        .addAction('s3:ListBucketMultipartUploads')
                        .addAction('s3:PutObject')
                        .addResource(self.rawbucketarn)
                        .addResource(self.rawbucketarn + '/*')
                    )
                ,
                'InputStreamReadPermissions': new PolicyDocument()
                    .addStatement(new IAM.PolicyStatement()
                        .allow()
                        .addAction('kinesis:DescribeStream')
                        .addAction('kinesis:GetShardIterator')
                        .addAction('kinesis:GetRecords')
                        .addResource(this.kinesisStreams.streamArn)
                    )
                ,
                'GluePermissions': new PolicyDocument()
                    .addStatement(new IAM.PolicyStatement()
                        .allow()
                        .addAllResources()
                        .addAction('glue:GetTableVersions')
                    )
                ,
                'CloudWatchLogsPermissions': new PolicyDocument()
                    .addStatement(new IAM.PolicyStatement()
                        .allow()
                        .addAction('logs:PutLogEvents')
                        .addResource('arn:aws:logs:' + props.region + ':' + props.accountId + ':log-group:' + firehoseLogGroup + ':*:*')
                        .addResource('arn:aws:logs:' + props.region + ':' + props.accountId + ':log-group:' + firehoseLogGroup)
                    )
            }
        });

        this.kinesisFirehose = new KDF.CfnDeliveryStream(this, props.getAppRefName() + 'RawData', {
            deliveryStreamType: 'KinesisStreamAsSource',
            deliveryStreamName: props.getAppRefName() + 'Firehose',
            kinesisStreamSourceConfiguration: {
                kinesisStreamArn: this.kinesisStreams.streamArn,
                roleArn: firehoseRole.roleArn
            }
            , s3DestinationConfiguration: {
                bucketArn: <string>this.rawbucketarn,
                bufferingHints: {
                    intervalInSeconds: 900,
                    sizeInMBs: 10
                },
                compressionFormat: 'GZIP',
                roleArn: firehoseRole.roleArn,
                cloudWatchLoggingOptions: {
                    enabled: true,
                    logGroupName: firehoseLogGroup,
                    logStreamName: firehoseLogGroup
                }
            }
        })
        */
    
    }

    createAPIGateway(props: IParameterAwareProps) {

        let apirole = new IAM.Role(this, props.getApplicationName() + 'APIRole', {
            roleName: props.getApplicationName() + 'API'
            , assumedBy: new IAM.ServicePrincipal('apigateway.amazonaws.com')
            , inlinePolicies: {
                'LambdaPermissions':
                    new PolicyDocument()
                        .addStatement(
                            new IAM.PolicyStatement()
                                .allow()
                                .addAction('lambda:InvokeFunction')
                                .addAction('lambda:InvokeAsync')
                                .addResource('arn:aws:lambda:' + props.region + ':' + props.accountId + ':function:' + props.getApplicationName() + '*')
                        ),
                'SSMPermissions':
                    new PolicyDocument()
                        .addStatement(
                            new IAM.PolicyStatement()
                                .allow()
                                .addActions("ssm:GetParameterHistory")
                                .addAction("ssm:GetParametersByPath")
                                .addAction("ssm:GetParameters")
                                .addAction("ssm:GetParameter")
                                .addResource('arn:aws:ssm:'.concat(props.region!, ':', props.accountId!, ':parameter/', props.getApplicationName().toLowerCase(), '/*'))
                        ),
                'DynamoDBPermissions':
                    new PolicyDocument()
                        .addStatement(
                            new IAM.PolicyStatement()
                                .allow()
                                .addAction('dynamodb:GetItem')
                                .addResources(
                                     (<Table>props.getParameter('table.session')).tableArn
                                    ,(<Table>props.getParameter('table.sessiontopx')).tableArn
                                )
                        ),
                'KinesisPermissions':
                    new PolicyDocument()
                        .addStatement(
                            new IAM.PolicyStatement()
                                .addAction('kinesis:PutRecord')
                                .addAction('kinesis:PutRecords')
                                .addResource(this.kinesisStreams.streamArn)
                        )
            }
        });
        apirole.attachManagedPolicy('arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs');

        this.api = new APIGTW.CfnRestApi(this, props.getApplicationName() + "API", {
              name: props.getApplicationName().toLowerCase()
            , description: 'API supporting the application ' + props.getApplicationName()

        });

        new APIGTW.CfnGatewayResponse(this,props.getApplicationName()+'GTWResponse', {
            restApiId : this.api.restApiId
            ,responseType : 'DEFAULT_4XX'
            ,responseParameters : {
            "gatewayresponse.header.Access-Control-Allow-Headers": "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
            "gatewayresponse.header.Access-Control-Allow-Methods": "'*'",
            "gatewayresponse.header.Access-Control-Allow-Origin": "'*'"
            }
            ,responseTemplates : {
            "application/json": "{\"message\":$context.error.messageString}"
            }
        }).addDependsOn(this.api);

        let authorizer = new APIGTW.CfnAuthorizer(this, props.getApplicationName() + "Authorizer", {
            name: props.getApplicationName().toLowerCase() + 'Authorizer'
            , restApiId: this.api.restApiId
            , type: 'COGNITO_USER_POOLS'
            , identitySource: 'method.request.header.Authorization'
            , providerArns: [
                this.userpool
            ]
        });

        let apiModelScoreboardResponse = new APIGTW.CfnModel(this, props.getApplicationName() + 'APIModelScoreboardResponseModel', {
            contentType: 'application/json'
            , description: 'Scoreboard response model (for /scoreboard/GET)'
            , name: 'ScoreboardResponseModel'
            , restApiId: this.api.restApiId
            , schema: {
                "$schema": "http://json-schema.org/draft-04/schema#",
                "title": "ScoreboardResponseModel",
                "type": "object",
                "properties": {
                    "Scoreboard": {
                        "type": "array",
                        "items": {
                            "$ref": "#/definitions/GamerScore"
                        }
                    }
                },
                "definitions": {
                    "GamerScore": {
                        "type": "object",
                        "properties": {
                            "Name": { "type": "integer" },
                            "Score": { "type": "integer" },
                            "Level": { "type": "integer" },
                            "Shots": { "type": "integer" },
                            "Nickname": { "type": "string" },
                            "Lives": { "type": "integer" }
                        }
                    }
                }
            }
        });

        let apiModelGetParametersRequest = new APIGTW.CfnModel(this, props.getApplicationName() + 'APIModelGetParametersRequest', {
            contentType: 'application/json'
            , description: 'Model to request SSM:GetParameters'
            , name: 'GetParametersRequest'
            , restApiId: this.api.restApiId
            , schema: {
                "$schema": "http://json-schema.org/draft-04/schema#",
                "title": "GetParametersRequest",
                "type": "object",
                "properties": {
                    "names": { "type": "array" }
                }
            }
        });

        //Version 1 of the API
        let v1 = new APIGTW.CfnResource(this, props.getApplicationName() + "APIv1", {
            parentId: this.api.restApiRootResourceId
            , pathPart: 'v1'
            , restApiId: this.api.restApiId
        });


    

        /**
         * SESSION resource /session
         * GET {no parameter} - returns session data from ssm.parameter /ssm/session
         * 
         */
        let session = new APIGTW.CfnResource(this, props.getApplicationName() + "APIv1session", {
            parentId: v1.resourceId
            , pathPart: 'session'
            , restApiId: this.api.restApiId
        });

        let sessionGetMethod = new APIGTW.CfnMethod(this, props.getApplicationName() + "APIv1sessionGET", {
            restApiId: this.api.restApiId
            , resourceId: session.resourceId
            , authorizationType: APIGTW.AuthorizationType.Cognito
            , authorizerId: authorizer.authorizerId
            , httpMethod: 'GET'
            , requestParameters: {
                  'method.request.querystring.Name': true
                , 'method.request.header.Authentication': true
            }
            , requestModels : undefined
            , integration: {
                passthroughBehavior: 'WHEN_NO_MATCH'
                , integrationHttpMethod: 'POST'
                , type: 'AWS'
                , uri: 'arn:aws:apigateway:' + props.region + ':ssm:action/GetParameter'
                , credentials: apirole.roleArn
                , requestParameters: {
                      'integration.request.querystring.Name': "'/" + props.getApplicationName().toLowerCase() + "/session'"
                    , 'integration.request.header.Authentication': 'method.request.header.Authentication'
                }
                , requestTemplates : undefined
                , integrationResponses: [
                    {
                        statusCode: '200'
                        , responseParameters: {
                            'method.response.header.Access-Control-Allow-Origin': "'*'"
                        }
                        , responseTemplates: {
                            'application/json': `"$util.escapeJavaScript("$input.path('$').GetParameterResponse.GetParameterResult.Parameter.Value").replaceAll("\'",'"')"`
                        }
                    }]
            }
            , methodResponses: [
                {
                    statusCode: '200'
                    , responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': false
                    }
                    , responseModels: {
                           'application/json': 'Empty'
                    }
                }
            ]
        });

        // OPTIONS
        let sessionOptionsMethod = new APIGTW.CfnMethod(this, props.getApplicationName() + "APIv1sessionOPTIONS", {
            restApiId: this.api.restApiId
            , resourceId: session.resourceId
            , authorizationType: APIGTW.AuthorizationType.None
            , httpMethod: 'OPTIONS'
            , integration: {
                passthroughBehavior: 'WHEN_NO_MATCH'
                , type: 'MOCK'
                , requestTemplates: {
                    'application/json': '{\"statusCode\": 200}'
                }
                , integrationResponses: [
                    {
                        statusCode: '200'
                        , responseParameters: {
                            'method.response.header.Access-Control-Allow-Headers' : "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
                            ,'method.response.header.Access-Control-Allow-Methods' : "'*'"
                            ,'method.response.header.Access-Control-Allow-Origin' : "'*'"
                        }
                    }]
            }
            , methodResponses: [
                {
                    statusCode: '200'
                    , responseParameters: {
                          'method.response.header.Access-Control-Allow-Origin': false
                        , 'method.response.header.Access-Control-Allow-Methods': false
                        , 'method.response.header.Access-Control-Allow-Headers': false
                    }
                    , responseModels: {
                        "application/json": 'Empty'
                    }
                }
            ]
        });
        
        /**
         * Websocket resource /websocket
         * GET {no parameter} - returns websocketURL data from ssm.parameter /ssm/websocket
         * 
         */
        let websocket = new APIGTW.CfnResource(this, props.getApplicationName() + "APIv1websocket", {
            parentId: v1.resourceId
            , pathPart: 'websocket'
            , restApiId: this.api.restApiId
        });

        let websocketGetMethod = new APIGTW.CfnMethod(this, props.getApplicationName() + "APIv1websocketGET", {
            restApiId: this.api.restApiId
            , resourceId: websocket.resourceId
            , authorizationType: APIGTW.AuthorizationType.Cognito
            , authorizerId: authorizer.authorizerId
            , httpMethod: 'GET'
            , requestParameters: {
                  'method.request.querystring.Name': true
                , 'method.request.header.Authentication': true
            }
            , requestModels : undefined
            , integration: {
                passthroughBehavior: 'WHEN_NO_MATCH'
                , integrationHttpMethod: 'POST'
                , type: 'AWS'
                , uri: 'arn:aws:apigateway:' + props.region + ':ssm:action/GetParameter'
                , credentials: apirole.roleArn
                , requestParameters: {
                      'integration.request.querystring.Name': "'/" + props.getApplicationName().toLowerCase() + "/websocket'"
                    , 'integration.request.header.Authentication': 'method.request.header.Authentication'
                }
                , requestTemplates : undefined
                , integrationResponses: [
                    {
                        statusCode: '200'
                        , responseParameters: {
                            'method.response.header.Access-Control-Allow-Origin': "'*'"
                        }
                        , responseTemplates: {
                            'application/json': `"$util.escapeJavaScript("$input.path('$').GetParameterResponse.GetParameterResult.Parameter.Value").replaceAll("\'",'"')"`
                        }
                    }]
            }
            , methodResponses: [
                {
                    statusCode: '200'
                    , responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': false
                    }
                    , responseModels: {
                           'application/json': 'Empty'
                    }
                }
            ]
        });

        // OPTIONS
        let websocketOptionsMethod = new APIGTW.CfnMethod(this, props.getApplicationName() + "APIv1websocketOPTIONS", {
            restApiId: this.api.restApiId
            , resourceId: websocket.resourceId
            , authorizationType: APIGTW.AuthorizationType.None
            , httpMethod: 'OPTIONS'
            , integration: {
                passthroughBehavior: 'WHEN_NO_MATCH'
                , type: 'MOCK'
                , requestTemplates: {
                    'application/json': '{\"statusCode\": 200}'
                }
                , integrationResponses: [
                    {
                        statusCode: '200'
                        , responseParameters: {
                            'method.response.header.Access-Control-Allow-Headers' : "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
                            ,'method.response.header.Access-Control-Allow-Methods' : "'*'"
                            ,'method.response.header.Access-Control-Allow-Origin' : "'*'"
                        }
                    }]
            }
            , methodResponses: [
                {
                    statusCode: '200'
                    , responseParameters: {
                          'method.response.header.Access-Control-Allow-Origin': false
                        , 'method.response.header.Access-Control-Allow-Methods': false
                        , 'method.response.header.Access-Control-Allow-Headers': false
                    }
                    , responseModels: {
                        "application/json": 'Empty'
                    }
                }
            ]
        });


        /**
         * CONFIG 
         * Resource: /config
         * Method: GET 
         * Request Parameters : none
         * Response format:
            {
            "Parameters": [
                {
                "Name": "/<app>/clientid",
                "Value": "4tfe5l26kdp59tc4k4v0b688nm"
                },
                {
                "Name": "/<app>/identitypoolid",
                "Value": "<region>:17092df6-7e3a-4893-4d85-c6de33cdfabc"
                },
                {
                "Name": "/<app>>/userpoolid",
                "Value": "<region>_ueLfdaSXi"
                },
                {
                "Name": "/<app>>/userpoolurl",
                "Value": "cognito-idp.<region>>.amazonaws.com/<region>_ueLfdaSXi"
                }
            ]
            }
         */
        let config = new APIGTW.CfnResource(this, props.getApplicationName() + "APIv1config", {
            parentId: v1.resourceId
            , pathPart: 'config'
            , restApiId: this.api.restApiId
        });

        // GET
        let configGetMethod = new APIGTW.CfnMethod(this, props.getApplicationName() + "APIv1configGET", {
            restApiId: this.api.restApiId
            , resourceId: config.resourceId
            , authorizationType: APIGTW.AuthorizationType.None
            , httpMethod: 'GET'
            , requestParameters: {
                'method.request.header.Content-Type': true
                , 'method.request.header.X-Amz-Target': true
            }
            , requestModels: {
                'application/json': apiModelGetParametersRequest.ref
            }
            , integration: {
                integrationHttpMethod: 'POST'
                , type: 'AWS'
                , uri: 'arn:aws:apigateway:' + props.region + ':ssm:path//'
                , credentials: apirole.roleArn
                , requestParameters: {
                    'integration.request.header.Content-Type': "'application/x-amz-json-1.1'"
                    , 'integration.request.header.X-Amz-Target': "'AmazonSSM.GetParameters'"
                }
                , requestTemplates: {
                    'application/json': '{"Names" : [' +
                        '"/' + props.getApplicationName().toLowerCase() + '/userpoolid",' +
                        '"/' + props.getApplicationName().toLowerCase() + '/userpoolurl",' +
                        '"/' + props.getApplicationName().toLowerCase() + '/clientid",' +
                        '"/' + props.getApplicationName().toLowerCase() + '/identitypoolid"' +
                        ']}'
                }
                , passthroughBehavior: 'WHEN_NO_TEMPLATES'
                , integrationResponses: [
                    {
                        statusCode: '200'
                        , responseParameters: {
                            'method.response.header.Access-Control-Allow-Origin': "'*'"
                        }
                        , responseTemplates: {
                            'application/json': `
                                #set($inputRoot = $input.path('$'))
                                {
                                    "Parameters" : [
                                        #foreach($elem in $inputRoot.Parameters)
                                        {
                                            "Name" : "$elem.Name",
                                            "Value" :  "$util.escapeJavaScript("$elem.Value").replaceAll("'",'"')"
                                        } 
                                        #if($foreach.hasNext),#end
                                    #end
                                ]
                                }`
                        }
                    }]
            }
            , methodResponses: [
                {
                    statusCode: '200'
                    , responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': true
                    }
                        , responseModels: {
                          'application/json': 'Empty'
                         }
                }
            ]
        });


        // OPTIONS
        let configOptionsMethod = new APIGTW.CfnMethod(this, props.getApplicationName() + "APIv1configOPTIONS", {
            restApiId: this.api.restApiId
            , resourceId: config.resourceId
            , authorizationType: APIGTW.AuthorizationType.None
            , httpMethod: 'OPTIONS'
            , integration: {
                passthroughBehavior: 'when_no_match'
                , type: 'MOCK'
                , requestTemplates: {
                    'application/json': `{\"statusCode\": 200}`
                }
                , integrationResponses: [
                    {
                        statusCode: '200'
                        , responseParameters: {
                             'method.response.header.Access-Control-Allow-Origin': "'*'"
                            , 'method.response.header.Access-Control-Allow-Methods': "'*'"
                            , 'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
                        }
                    }]
            }
            , methodResponses: [
                {
                    statusCode: '200'
                    , responseParameters: {
                          'method.response.header.Access-Control-Allow-Origin': true
                        , 'method.response.header.Access-Control-Allow-Methods': true
                        , 'method.response.header.Access-Control-Allow-Headers': true
                    }
                    , responseModels: {
                     'application/json': 'Empty'
                    }
                }
            ]
        });

        /**
         * ALLOCATE 
         * Resource: /allocate
         * Method: POST
         * Request format: { 'Username' : '<the user name>'}
         */
        let allocate = new APIGTW.CfnResource(this, props.getApplicationName() + "APIv1allocate", {
            parentId: v1.resourceId
            , pathPart: 'allocate'
            , restApiId: this.api.restApiId
        });


        let lambdaAllocate = (<Lambda.Function> props.getParameter('lambda.allocate'));

        // POST
        let allocatePostMethod = new APIGTW.CfnMethod(this, props.getApplicationName() + "APIv1allocatePOST", {
            restApiId: this.api.restApiId
            , resourceId: allocate.resourceId
            , authorizationType: APIGTW.AuthorizationType.Cognito
            , authorizerId: authorizer.authorizerId
            , httpMethod: 'POST'
            , integration: {
                passthroughBehavior: 'WHEN_NO_MATCH'
                , integrationHttpMethod: 'POST'
                , type: 'AWS_PROXY'
                , uri: 'arn:aws:apigateway:' + props.region + ':lambda:path/2015-03-31/functions/' + lambdaAllocate.functionArn + '/invocations'
                , credentials: apirole.roleArn
              //  , uri: 'arn:aws:apigateway:' + props.region + ':lambda:path/2015-03-31/functions/' + props.getParameter('lambda.allocate') + '/invocations'
            }
            , methodResponses: [
                {
                    statusCode: '200'
                }
            ]
        });

/* TO BE IMPLEMENTED ON CDK
        lambdaAllocate.addEventSource(
            new ApiEventSource( 'POST','/v1/allocate',{
                   authorizationType : APIGTW.AuthorizationType.Cognito
                 , authorizerId : authorizer.authorizerId
            })
        );
*/

        // OPTIONS
        let allocateOptionsMethod = new APIGTW.CfnMethod(this, props.getApplicationName() + "APIv1allocateOPTIONS", {
            restApiId: this.api.restApiId
            , resourceId: allocate.resourceId
            , authorizationType: APIGTW.AuthorizationType.None
            , httpMethod: 'OPTIONS'
            , integration: {
                passthroughBehavior: 'WHEN_NO_MATCH'
                , type: 'MOCK'
                , requestTemplates: {
                    'application/json': `{\"statusCode\": 200}`
                }
                , integrationResponses: [
                    {
                        statusCode: '200'
                        , responseParameters: {
                            'method.response.header.Access-Control-Allow-Origin': "'*'"
                            , 'method.response.header.Access-Control-Allow-Methods': "'*'"
                            , 'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
                        }
                    }]
            }
            , methodResponses: [
                {
                    statusCode: '200'
                    , responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': true
                        , 'method.response.header.Access-Control-Allow-Methods': true
                        , 'method.response.header.Access-Control-Allow-Headers': true
                    }
                    , responseModels: {
                    'application/json': 'Empty'
                    }
                }
            ]
        });


        /**
         * DEALLOCATE 
         * Resource: /deallocate
         * Method: POST
         * Request format: { 'Username' : '<the user name>'}
         */
        let deallocate = new APIGTW.CfnResource(this, props.getApplicationName() + "APIv1deallocate", {
            parentId: v1.resourceId
            , pathPart: 'deallocate'
            , restApiId: this.api.restApiId
        });

        // POST
        let deallocatePostMethod = new APIGTW.CfnMethod(this, props.getApplicationName() + "APIv1deallocatePOST", {
              restApiId: this.api.restApiId
            , resourceId: deallocate.resourceId
            , authorizationType: APIGTW.AuthorizationType.Cognito
            , authorizerId: authorizer.authorizerId
            , httpMethod: 'POST'
            , integration: {
                integrationHttpMethod: 'POST'
                , type: 'AWS_PROXY'
                , contentHandling: "CONVERT_TO_TEXT"
                , uri: 'arn:aws:apigateway:' + props.region + ':lambda:path/2015-03-31/functions/' + props.getParameter('lambda.deallocate') + '/invocations'
                , credentials: apirole.roleArn
            }
            , methodResponses: [
                {
                    statusCode: '200'
                }
            ]
        });


        // OPTIONS
        let deallocateOptionsMethod = new APIGTW.CfnMethod(this, props.getApplicationName() + "APIv1deallocateOPTIONS", {
            restApiId: this.api.restApiId
            , resourceId: deallocate.resourceId
            , authorizationType: APIGTW.AuthorizationType.None
            , httpMethod: 'OPTIONS'
            , integration: {
                passthroughBehavior: 'when_no_match'
                , type: 'MOCK'
                , requestTemplates: {
                    'application/json': `{\"statusCode\": 200}`
                }
                , integrationResponses: [
                    {
                        statusCode: '200'
                        , responseParameters: {
                            'method.response.header.Access-Control-Allow-Origin': "'*'"
                            , 'method.response.header.Access-Control-Allow-Methods': "'*'"
                            , 'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
                        }
                    }]
            }
            , methodResponses: [
                {
                    statusCode: '200'
                    , responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': true
                        , 'method.response.header.Access-Control-Allow-Methods': true
                        , 'method.response.header.Access-Control-Allow-Headers': true
                    }
                    , responseModels: {
                        'application/json': 'Empty'
                    }
                }
            ]
        });



        /**
         * SCOREBOARD 
         * Resource: /deallocate
         * Method: GET
         * Request format: 
         *      querystring: sessionId=<<Session Id>>
         * Response format:
         * {
                "Scoreboard": [
                    {
                    "Score": 7055,
                    "Level": 13,
                    "Shots": 942,
                    "Nickname": "PSC",
                    "Lives": 3
                    }..,
                ]
            }
         */
        let scoreboard = new APIGTW.CfnResource(this, props.getApplicationName() + "APIv1scoreboard", {
            parentId: v1.resourceId
            , pathPart: 'scoreboard'
            , restApiId: this.api.restApiId
        });

        // POST
        let scoreboardPostMethod = new APIGTW.CfnMethod(this, props.getApplicationName() + "APIv1scoreboardPOST", {
            restApiId: this.api.restApiId
            , resourceId: scoreboard.resourceId
            , authorizationType: APIGTW.AuthorizationType.Cognito
            , authorizerId: authorizer.authorizerId
            , httpMethod: 'GET'
            , requestParameters: {
                'method.request.querystring.sessionId': true
            }
            , integration: {
                integrationHttpMethod: 'POST'
                , type: 'AWS'
                , uri: 'arn:aws:apigateway:' + props.region + ':dynamodb:action/GetItem'
                , credentials: apirole.roleArn
                , requestParameters: {
                    'integration.request.querystring.sessionId': 'method.request.querystring.sessionId'
                }
                , passthroughBehavior: 'WHEN_NO_TEMPLATES'
                , requestTemplates: {
                    'application/json': `{
                        "TableName" : "`+ (<Table>props.getParameter('table.sessiontopx')).tableName + `",
                        "Key" : {
                            "SessionId" : {
                                "S" : "$input.params('sessionId')"
                            }
                        }
                    }`
                }
                , integrationResponses: [
                    {
                        statusCode: '200'
                        , responseParameters: {
                            'method.response.header.Access-Control-Allow-Origin': "'*'"
                        }
                        , responseTemplates: {
                            // This is going to be tricky to be generalized
                            'application/json':
                                `#set($scoreboard = $input.path('$.Item.TopX.L'))
                                        { 
                                        "Scoreboard" : [
                                                #foreach($gamerScore in $scoreboard)
                                                        {
                                                            "Score" : $gamerScore.M.Score.N ,
                                                            "Level" : $gamerScore.M.Level.N ,
                                                            "Shots" : $gamerScore.M.Shots.N ,
                                                            "Nickname" : "$gamerScore.M.Nickname.S" ,
                                                            "Lives" : $gamerScore.M.Lives.N
                                                        }#if($foreach.hasNext),#end
                                                
                                                #end
                                            ]
                                        }`
                        }
                    }]
            }
            , methodResponses: [
                {
                    statusCode: '200'
                    , responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': true
                    }
                    , responseModels: {
                        'application/json': apiModelScoreboardResponse.ref
                    }
                }
            ]
        });


        // OPTIONS
        let scoreboardOptionsMethod = new APIGTW.CfnMethod(this, props.getApplicationName() + "APIv1scoreboardOPTIONS", {
            restApiId: this.api.restApiId
            , resourceId: scoreboard.resourceId
            , authorizationType: APIGTW.AuthorizationType.None
            , httpMethod: 'OPTIONS'
            , integration: {
                passthroughBehavior: 'when_no_match'
                , type: 'MOCK'
                , requestTemplates: {
                    'application/json': `{\"statusCode\": 200}`
                }
                , integrationResponses: [
                    {
                        statusCode: '200'
                        , responseParameters: {
                            'method.response.header.Access-Control-Allow-Origin': "'*'"
                            , 'method.response.header.Access-Control-Allow-Methods': "'*'"
                            , 'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
                        }
                    }]
            }
            , methodResponses: [
                {
                    statusCode: '200'
                    , responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': true
                        , 'method.response.header.Access-Control-Allow-Methods': true
                        , 'method.response.header.Access-Control-Allow-Headers': true
                    }
                    , responseModels: {
                        'application/json': 'Empty'
                    }
                }
            ]
        });


        /**
         * UPDATESTATUS
         * Resource: /updatestatus
         * Method: POST
         * Request format:
         *  body : {
         *       "Level": 1,
         *       "Lives": 3,
         *       "Nickname": "chicobento",
         *       "Score": 251,
         *       "SessionId": "X181001T215808",
         *       "Shots": 4,
         *       "Timestamp": "2018-10-10T23:57:26.137Z"
         *       }
         */
        let updateStatus = new APIGTW.CfnResource(this, props.getApplicationName() + "APIv1updatestatus", {
            parentId: v1.resourceId
            , pathPart: 'updatestatus'
            , restApiId: this.api.restApiId
        });

        // POST
        let updatestatusPostMethod = new APIGTW.CfnMethod(this, props.getApplicationName() + "APIv1updatestatusPOST", {
            restApiId: this.api.restApiId
            , resourceId: updateStatus.resourceId
            , authorizationType: APIGTW.AuthorizationType.Cognito
            , authorizerId: authorizer.authorizerId
            , httpMethod: 'POST'
            , requestParameters: {
                'method.request.header.Authentication': true
            }
            , integration: {
                integrationHttpMethod: 'POST'
                , type: 'AWS'
                , uri: 'arn:aws:apigateway:' + props.region + ':kinesis:action/PutRecord'
                , credentials: apirole.roleArn
                , passthroughBehavior: 'WHEN_NO_TEMPLATES'
                , requestTemplates: {
                    'application/json':
                        `#set($inputRoot = $input.path('$'))
                        {
                            "Data" : "$util.base64Encode("$input.json('$')")",
                            "PartitionKey" : $input.json('$.SessionId'),
                            "StreamName" : "`+ this.kinesisStreams.streamName + `"
                        }`
                }
                , integrationResponses: [
                    {
                        statusCode: '200'
                        , responseParameters: {
                            'method.response.header.Access-Control-Allow-Origin': "'*'"
                        }
                    }]
            }
            , methodResponses: [
                {
                    statusCode: '200'
                    , responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': true
                    }
                   , responseModels: {
                    'application/json': 'Empty'
                }
                }
            ]
        });


        // OPTIONS
        let updatestatusOptionsMethod = new APIGTW.CfnMethod(this, props.getApplicationName() + "APIv1updateStatusOPTIONS", {
            restApiId: this.api.restApiId
            , resourceId: updateStatus.resourceId
            , authorizationType: APIGTW.AuthorizationType.None
            , httpMethod: 'OPTIONS'
            , integration: {
                passthroughBehavior: 'when_no_match'
                , type: 'MOCK'
                , requestTemplates: {
                    'application/json': `{\"statusCode\": 200}`
                }
                , integrationResponses: [
                    {
                        statusCode: '200'
                        , responseParameters: {
                            'method.response.header.Access-Control-Allow-Origin': "'*'"
                            , 'method.response.header.Access-Control-Allow-Methods': "'*'"
                            , 'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
                        }
                    }]
            }
            , methodResponses: [
                {
                    statusCode: '200'
                    , responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': true
                        , 'method.response.header.Access-Control-Allow-Methods': true
                        , 'method.response.header.Access-Control-Allow-Headers': true
                    }
                      , responseModels: {
                           'application/json': 'Empty'
                      }
                }
            ]
        });


        let deployment = new APIGTW.CfnDeployment(this, props.getApplicationName() + "APIDeployment", {
            restApiId: this.api.restApiId
            , stageName: 'prod'
            , description: 'Production deployment'
        });
        deployment.addDependsOn(sessionGetMethod);
        deployment.addDependsOn(sessionOptionsMethod);
        deployment.addDependsOn(websocketGetMethod);
        deployment.addDependsOn(websocketOptionsMethod);
        deployment.addDependsOn(configGetMethod);
        deployment.addDependsOn(configOptionsMethod);
        deployment.addDependsOn(allocatePostMethod);
        deployment.addDependsOn(allocateOptionsMethod);
        deployment.addDependsOn(deallocatePostMethod);
        deployment.addDependsOn(deallocateOptionsMethod);
        deployment.addDependsOn(scoreboardPostMethod);
        deployment.addDependsOn(scoreboardOptionsMethod);
        deployment.addDependsOn(updatestatusPostMethod);
        deployment.addDependsOn(updatestatusOptionsMethod);
    }


    updateUsersRoles(props: IParameterAwareProps) {

        let baseArn = 'arn:aws:apigateway:' + props.region + ':'+props.accountId+':' + this.api.restApiId + '/prod/*/';
        let baseExecArn = 'arn:aws:execute-api:' + props.region + ':'+props.accountId+':' + this.api.restApiId + '/prod/';
        let playerRole = (<IAM.Role>props.getParameter('security.playersrole'));

        playerRole.addToPolicy(
            new IAM.PolicyStatement()
                .describe('APIGatewayGETPermissions')
                .allow()
                .addAction('apigateway:GET')
                .addResources(
                    baseArn + 'config',
                    baseArn + 'session',
                    baseArn + 'scoreboard'
                )
        );
        playerRole.addToPolicy(
            new IAM.PolicyStatement()
                .describe('APIGatewayEXECGETPermissions')
                .allow()
                .addAction('execute-api:Invoke')
                .addResources(
                    baseExecArn + 'GET/config',
                    baseExecArn + 'GET/session',
                    baseExecArn + 'GET/scoreboard'
                )
        );
        playerRole.addToPolicy(
            new IAM.PolicyStatement()
                .describe('APIGatewayPOSTPermissions')
                .allow()
                .addAction('apigateway:POST')
                .addResources(
                    baseArn + 'updatestatus',
                    baseArn + 'allocate',
                    baseArn + 'deallocate'
                )
        );
        playerRole.addToPolicy(
            new IAM.PolicyStatement()
                .describe('APIGatewayEXECPOSTPermissions')
                .allow()
                .addAction('execute-api:Invoke')
                .addResources(
                    baseExecArn + 'POST/updatestatus',
                    baseExecArn + 'POST/allocate',
                    baseExecArn + 'POST/deallocate'
                )
        );

        let managerRole = (<IAM.Role> props.getParameter('security.managersrole'));
        managerRole.addToPolicy(
            new IAM.PolicyStatement()
                .describe('DynamoDBPermissions')
                .allow()
                .addActions(
                    "dynamodb:BatchGetItem",
                    "dynamodb:BatchWriteItem",
                    "dynamodb:PutItem",
                    "dynamodb:Scan",
                    "dynamodb:Query",
                    "dynamodb:GetItem"                  
                )
                .addResource(
                    "arn:aws:dynamodb:"+props.region+":"+props.accountId+":table/"+props.getApplicationName()+"*"
                )
        );
        managerRole.addToPolicy(
            new IAM.PolicyStatement()
                .describe('SystemsManagerPermissions')
                .addActions(
                    "ssm:GetParameters",
                    "ssm:GetParameter",
                    "ssm:DeleteParameters",
                    "ssm:PutParameter",
                    "ssm:DeleteParameter"
                )
                .addResource(
                    "arn:aws:ssm:"+props.region+":"+props.accountId+":parameter/"+props.getApplicationName().toLowerCase()+"/*"
                )
        );
        managerRole.addToPolicy(
            new IAM.PolicyStatement()
            .describe('KinesisPermissions')
            .addActions(
                "kinesis:GetShardIterator",
                "kinesis:DescribeStream",
                "kinesis:GetRecords"
            )
            .addResource(
                this.kinesisStreams.streamArn
            )
        );

        managerRole.addToPolicy(
            new IAM.PolicyStatement()
                .describe('APIGatewayPermissions')
                .allow()
                .addAction('apigateway:*')
                .addResources(
                    baseArn + '*' 
                )
        );
    }

}