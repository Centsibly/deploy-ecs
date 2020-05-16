const core = require('@actions/core');
const aws = require('aws-sdk');

const WAIT_DEFAULT_DELAY_SEC = 15;

// Deploy to a service that uses the 'ECS' deployment controller
async function updateEcsService(ecs, clusterName, service, waitForMinutes) {
  core.debug('Updating the service');
  await ecs.updateService({
    cluster: clusterName,
    service: service,
    forceNewDeployment: true,
  }).promise();
  core.info(`Deployment started. Watch this deployment's progress in the Amazon ECS console: https://console.aws.amazon.com/ecs/home?region=${aws.config.region}#/clusters/${clusterName}/services/${service}/events`);

  // Wait for service stability
  core.debug(`Waiting for the service to become stable. Will wait for ${waitForMinutes} minutes`);
  const maxAttempts = (waitForMinutes * 60) / WAIT_DEFAULT_DELAY_SEC;
  await ecs.waitFor('servicesStable', {
    services: [service],
    cluster: clusterName,
    $waiter: {
      delay: WAIT_DEFAULT_DELAY_SEC,
      maxAttempts: maxAttempts
    }
  }).promise();
}

async function run() {
  try {
    const ecs = new aws.ECS({
      customUserAgent: 'centsibly-ecs-deploy-task-definition-for-github-actions'
    });

    // Get inputs
    const service = core.getInput('service', { required: false });
    const cluster = core.getInput('cluster', { required: false });
    let waitForMinutes = 30 

    // Redeploy the service 
    if (service) {
      const clusterName = cluster ? cluster : 'default';

      await updateEcsService(ecs, clusterName, service, waitForMinutes);
    } else {
      core.debug('Service was not specified, no service updated');
    }
  }
  catch (error) {
    core.setFailed(error.message);
    core.debug(error.stack);
  }
}

module.exports = run;

/* istanbul ignore next */
if (require.main === module) {
    run();
}