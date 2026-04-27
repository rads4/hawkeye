const { upsertResource, upsertRelationship, ensureInternetNode, seedDemoData } = require('./graphService');

/**
 * Ingest GCP resources via service account JSON.
 * Falls back to demo seed data on any SDK/credential error.
 */
async function ingestGCP({ serviceAccountJson }) {
  try {
    const serviceAccount = typeof serviceAccountJson === 'string'
      ? JSON.parse(serviceAccountJson)
      : serviceAccountJson;

    if (!serviceAccount.project_id || !serviceAccount.private_key) {
      throw new Error('Invalid service account JSON');
    }

    const { Compute } = require('@google-cloud/compute');
    const compute = new Compute({
      projectId: serviceAccount.project_id,
      credentials: serviceAccount,
    });

    await ensureInternetNode();

    const projectId = serviceAccount.project_id;
    let resourceCount = 1; // internet node

    // 1. Fetch Compute Instances (all zones)
    const [vmsResponse] = await compute.getVMs({ maxResults: 20 });
    for (const vm of vmsResponse) {
      const meta = vm.metadata;
      const hasExternalIp = meta.networkInterfaces?.some(
        (ni) => ni.accessConfigs?.some((ac) => ac.natIP)
      );
      await upsertResource({
        id: `gcp-vm-${meta.id}`,
        name: meta.name,
        type: 'compute',
        cloud: 'gcp',
        public: hasExternalIp,
        sensitive: false,
        icon: 'Server',
        description: `GCP VM in ${meta.zone?.split('/').pop()} (${meta.machineType?.split('/').pop()})`,
        region: meta.zone?.split('/').pop(),
      });
      if (hasExternalIp) {
        await upsertRelationship('internet', 'EXPOSED_TO', `gcp-vm-${meta.id}`, { isAttackPath: true });
      }
      resourceCount++;
    }

    // 2. Fetch Firewall rules — detect open ingress
    const [firewallsResponse] = await compute.getFirewalls({ maxResults: 20 });
    for (const fw of firewallsResponse) {
      const meta = fw.metadata;
      const isOpen = meta.sourceRanges?.includes('0.0.0.0/0') && meta.direction === 'INGRESS';
      await upsertResource({
        id: `gcp-fw-${meta.id}`,
        name: meta.name,
        type: 'network',
        cloud: 'gcp',
        public: isOpen,
        openFirewall: isOpen,
        sensitive: false,
        icon: 'ShieldAlert',
        description: meta.description || `GCP Firewall rule`,
      });
      if (isOpen) {
        await upsertRelationship('internet', 'EXPOSED_TO', `gcp-fw-${meta.id}`, { isAttackPath: true });
      }
      resourceCount++;
    }

    console.log(`✅ GCP ingestion complete: ${resourceCount} resources`);
    return { source: 'live', resourceCount };

  } catch (err) {
    console.warn(`⚠️  GCP ingestion failed (${err.message}). Falling back to demo data.`);
    await seedDemoData();
    return { source: 'demo', resourceCount: 13 };
  }
}

module.exports = { ingestGCP };
