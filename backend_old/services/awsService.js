const { upsertResource, upsertRelationship, ensureInternetNode, seedDemoData } = require('./graphService');

/**
 * Ingest AWS resources via STS AssumeRole.
 * Falls back to demo seed data on any SDK/credential error.
 */
async function ingestAWS({ roleArn, externalId }) {
  try {
    const { STSClient, AssumeRoleCommand } = require('@aws-sdk/client-sts');
    const { EC2Client, DescribeInstancesCommand, DescribeSecurityGroupsCommand } = require('@aws-sdk/client-ec2');
    const { IAMClient, ListRolesCommand } = require('@aws-sdk/client-iam');

    // 1. Assume Role
    const stsClient = new STSClient({ region: 'us-east-1' });
    const assumed = await stsClient.send(new AssumeRoleCommand({
      RoleArn: roleArn,
      RoleSessionName: 'HawkeyeScan',
      ExternalId: externalId,
    }));
    const creds = {
      accessKeyId: assumed.Credentials.AccessKeyId,
      secretAccessKey: assumed.Credentials.SecretAccessKey,
      sessionToken: assumed.Credentials.SessionToken,
    };

    const ec2Client = new EC2Client({ region: 'us-east-1', credentials: creds });
    const iamClient = new IAMClient({ region: 'us-east-1', credentials: creds });

    await ensureInternetNode();

    // 2. Fetch EC2 Instances
    const ec2Resp = await ec2Client.send(new DescribeInstancesCommand({ MaxResults: 20 }));
    const instances = ec2Resp.Reservations?.flatMap((r) => r.Instances) || [];
    for (const inst of instances) {
      const isPublic = !!inst.PublicIpAddress;
      const props = {
        id: inst.InstanceId,
        name: inst.Tags?.find((t) => t.Key === 'Name')?.Value || inst.InstanceId,
        type: 'compute',
        cloud: 'aws',
        public: isPublic,
        sensitive: false,
        icon: 'Server',
        description: `EC2 ${inst.InstanceType} in ${inst.Placement?.AvailabilityZone}`,
        region: inst.Placement?.AvailabilityZone,
      };
      await upsertResource(props);
      if (isPublic) {
        await upsertRelationship('internet', 'EXPOSED_TO', inst.InstanceId, { isAttackPath: true });
      }
    }

    // 3. Fetch Security Groups — detect open 0.0.0.0/0
    const sgResp = await ec2Client.send(new DescribeSecurityGroupsCommand({ MaxResults: 20 }));
    const sgs = sgResp.SecurityGroups || [];
    for (const sg of sgs) {
      const isOpen = sg.IpPermissions?.some((perm) =>
        perm.IpRanges?.some((r) => r.CidrIp === '0.0.0.0/0')
      );
      await upsertResource({
        id: sg.GroupId,
        name: sg.GroupName,
        type: 'network',
        cloud: 'aws',
        public: isOpen,
        openFirewall: isOpen,
        sensitive: false,
        icon: 'ShieldAlert',
        description: sg.Description,
      });
      if (isOpen) {
        await upsertRelationship('internet', 'EXPOSED_TO', sg.GroupId, { isAttackPath: true });
      }
    }

    // 4. Fetch IAM Roles
    const iamResp = await iamClient.send(new ListRolesCommand({ MaxItems: 20 }));
    const roles = iamResp.Roles || [];
    for (const role of roles) {
      const isAdmin = role.AssumeRolePolicyDocument?.includes('*');
      await upsertResource({
        id: role.RoleId,
        name: role.RoleName,
        type: 'identity',
        cloud: 'aws',
        public: false,
        sensitive: false,
        privilegedRole: isAdmin,
        icon: 'User',
        description: role.Description || `IAM Role ${role.RoleName}`,
      });
    }

    const ingested = instances.length + sgs.length + roles.length + 1;
    console.log(`✅ AWS ingestion complete: ${ingested} resources`);
    return { source: 'live', resourceCount: ingested };

  } catch (err) {
    console.warn(`⚠️  AWS ingestion failed (${err.message}). Falling back to demo data.`);
    await seedDemoData();
    return { source: 'demo', resourceCount: 13 };
  }
}

module.exports = { ingestAWS };
