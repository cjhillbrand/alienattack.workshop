#!/bin/bash
# This Script deploys a websocket with the correct lambda routes
# This script will also change various IAM Roles to invoke the websocket
# source fixwebsocket.sh <envName>

function removeQuotes() {
    retval=$1
    retval=${retval#\"}
    retval=${retval%\"}
    echo "$retval"
}

function createWebSocket() {
    envName=$1
    region=$2
    accountId=$3

    websocketCreateCommand=$(echo aws apigatewayv2 --region "$region" create-api --name "$envName"WebSocket --protocol-type WEBSOCKET --route-selection-expression '\$request.body.action' --query ApiId --output text)
    websocketApiId=$(removeQuotes $( eval $websocketCreateCommand ))

    getApiRole=$(echo aws "iam list-roles --query 'Roles[?contains(RoleName,\`"$envName"API\`)].Arn|[0]'")
    apiRoleArn=$(removeQuotes $( eval $getApiRole ))

    connectIntegration=$(aws apigatewayv2 create-integration --api-id $websocketApiId --integration-type AWS_PROXY --integration-method POST\
    --integration-uri arn:aws:apigateway:"$region":lambda:path/2015-03-31/functions/arn:aws:lambda:"$region":"$accountId":function:"$envName"WebSocketConnect/invocations\
    --query IntegrationId --output text --credentials-arn "$apiRoleArn")

    connectId=$(aws apigatewayv2 --region "$region" create-route --api-id "$websocketApiId"\
    --route-key \$connect --output text --query RouteId --target integrations/"$connectIntegration")

    startGameIntegration=$(aws apigatewayv2 create-integration --api-id $websocketApiId --integration-type AWS_PROXY --integration-method POST\
    --integration-uri arn:aws:apigateway:"$region":lambda:path/2015-03-31/functions/arn:aws:lambda:"$region":"$accountId":function:"$envName"WebSocketSynchronizeStart/invocations\
    --query IntegrationId --output text --credentials-arn "$apiRoleArn")

    startGameId=$(aws apigatewayv2 --region "$region" create-route --api-id "$websocketApiId"\
    --route-key start-game --output text --query RouteId --target integrations/"$startGameIntegration")

    disconnectIntegration=$(aws apigatewayv2 create-integration --api-id $websocketApiId --integration-type AWS_PROXY --integration-method POST\
    --integration-uri arn:aws:apigateway:"$region":lambda:path/2015-03-31/functions/arn:aws:lambda:"$region":"$accountId":function:"$envName"WebSocketDisconnect/invocations\
    --query IntegrationId --output text --credentials-arn "$apiRoleArn")

    disconnectId=$(aws apigatewayv2 --region "$region" create-route --api-id "$websocketApiId"\
    --route-key \$disconnect --output text --query RouteId --target integrations/"$disconnectIntegration")
    
    deploymentId=$(aws apigatewayv2 --region "$region" create-deployment --api-id "$websocketApiId" --query DeploymentId --output text)

    stageId=$(aws apigatewayv2 --region "$region" create-stage --api-id "$websocketApiId" --deployment-id "$deploymentId" --stage-name production)

    echo ${websocketApiId}

}

function createUrlParam() {
    URL=$2
    envName=$(echo $1 | tr 'A-Z' 'a-z')
    success=$(aws ssm put-parameter --name /"$envName"/websocket --value $URL --type String --overwrite)
}

function adjustLambdaIamRole() {
    region=$2
    accountId=$3
    apiId=$4
    roleName="$1"WebSocketSynchronizeStartFn_Role
    # Create JSON variable that stores in-line policy
    apiArn="arn:aws:execute-api:"$region":"$accountId":"$apiId"/*"
    inlinePolicy=$(cat <<-EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "execute-api:Invoke",
                "execute-api:ManageConnections"
            ],
            "Resource": "$apiArn"
        }
    ]
}
EOF
    )
    putIamRole=$(cat <<-END 
    aws iam put-role-policy --role-name '$roleName'\
    --policy-name Invoke-Api\
    --policy-document '$inlinePolicy'
END
    )
    echo $putIamRole
    eval $putIamRole
}

if [ "$1" == "" ]; then
    echo 
    echo "** ERROR**"
    echo At least the environment name must be provided
    echo 
    echo Usage:
    echo "fixwebsocket <envName>"
    echo
    echo example: fixcognito testenv
else
    envName=$(echo $1 | tr 'a-z' 'A-Z')
    region=$(aws configure get region)
    accountId=$(aws sts get-caller-identity --output text --query 'Account')
    apiId=$( createWebSocket $envName $region $accountId )
    URL="wss://${apiId}.execute-api.${region}.amazonaws.com/production"
    createUrlParam $envName $URL
    # Uncomment the line below if you are running this command outside of Cloud 9
    #adjustLambdaIamRole $envName $region $accountId $apiId
    echo WebSocket ARN: "arn:aws:execute-api:"$region":"$accountId":"$apiId"/*"

fi