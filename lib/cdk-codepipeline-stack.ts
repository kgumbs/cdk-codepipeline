import { SecretValue, Stack, StackProps } from 'aws-cdk-lib';
import { CodePipeline, CodePipelineSource, ShellStep } from 'aws-cdk-lib/pipelines';
import { Construct } from 'constructs';
import { AppStage } from './app-stage';

export class CdkCodepipelineStack extends Stack {

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const oauth = SecretValue.secretsManager('github-token')
    const source = CodePipelineSource.gitHub('kgumbs/cdk-codepipeline', 'master', {
      authentication: oauth
    });
    const pipeline = new CodePipeline(this, 'mycodepipeline', {
      pipelineName: 'demo-pipeline',
      synth: new ShellStep('Synth', {
        input: source,
        commands: ['npm install', 'npm run build', 'npx cdk synth'],
      }),

    })
    //const stage = pipeline.addStage(new AppStage(this, 'dev'))
    // stage.addPre(new ManualApprovalStep('Approval'))


  }

}