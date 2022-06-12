import { aws_codepipeline, aws_codepipeline_actions, SecretValue, Stack, StackProps } from 'aws-cdk-lib';
import { BuildSpec, Cache, LinuxBuildImage, LocalCacheMode, PipelineProject } from 'aws-cdk-lib/aws-codebuild';
import { Action, Artifact, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import { ManualApprovalAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import { CodePipeline } from 'aws-cdk-lib/pipelines';
import { Construct } from 'constructs';


export class CdkCodepipelineStack extends Stack {

  sourceArtifact: Artifact
  buildArtifact: Artifact
  scanArtifact: Artifact

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const pipeline = new Pipeline(this, 'mycodepipeline', {
      pipelineName: 'demo-pipeline'
    })

    this.sourceArtifact = new Artifact()
    const oauth = SecretValue.secretsManager('github-token')
    const sourceAction = new aws_codepipeline_actions.GitHubSourceAction({
      output: this.sourceArtifact,
      actionName: 'SourceAction',
      oauthToken: oauth,
      owner: 'kgumbs',
      repo: 'cdk-codepipeline',
      branch: 'master',
      runOrder: 1
    })
    pipeline.addStage({
      stageName: 'Source',
      actions: [sourceAction]
    })

    this.buildArtifact = new Artifact()
    const buidAction = new aws_codepipeline_actions.CodeBuildAction({
      actionName: 'BuildAction',
      input: this.sourceArtifact,
      outputs: [this.buildArtifact],
      project: this.createCodeBuildProject()
    })

    pipeline.addStage({
      stageName: 'Build',
      actions: [buidAction]
    })

    this.scanArtifact = new Artifact()
    const scanAction = new aws_codepipeline_actions.CodeBuildAction({
      actionName: 'ScanAction',
      input: this.sourceArtifact,
      outputs: [this.scanArtifact],
      runOrder: 3,
      project: new PipelineProject(this, 'Project', {
        buildSpec: BuildSpec.fromObject({
          version: '0.2',
          env: {
            'exported-variables': [
              'MY_VAR',
            ],
          },
          phases: {
            build: {
              commands: ['export MY_VAR="some value"', 'echo doing qualitygate scans....'],
            },
          },
        }),
      }),
    })

    pipeline.addStage({
      stageName: 'Scan',
      actions: [scanAction]
    })

    pipeline.addStage({
      stageName: 'ManualApproval',
      actions: [new ManualApprovalAction({
        actionName: 'QA Approval',
        notifyEmails: ['kwesigumbs@hotmail.com'],
        runOrder: 4
      })]
    })

  }

  private createCodeBuildProject = (): PipelineProject => {

    const codeBuildProject = new PipelineProject(this, 'mypCodeBuildProject', {
      projectName: 'demo-project',
      buildSpec: BuildSpec.fromObject(this.buildSpecContent),
      environment: {
        buildImage: LinuxBuildImage.STANDARD_1_0,
        privileged: true
      },
      environmentVariables: {
        VAR_ID: { value: 'Test Var 1' }
      },
      cache: Cache.local(LocalCacheMode.DOCKER_LAYER, LocalCacheMode.CUSTOM)
    })
    codeBuildProject.role?.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryPowerUser'))
    return codeBuildProject
  }
  private buildSpecContent = {
    version: '0.2',
    phases: {
      // install: {
      //   'runtime-versions': {
      //     java: 'corretto8'
      //   }
      // },
      pre_build: {
        commands: [
          'echo pre_build running....',
        ]
      },
      build: {
        commands: [
          'echo Build started on `date`',
          'echo Build running...',
          'echo Build completed on `date`'
        ]
      },
      post_build: {
        commands: [
          'echo Post Build completed on `date`'
        ]
      }
    }
  }
}
