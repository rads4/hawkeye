const mockFindings = [
  {
    id: "f-1",
    title: "Admin Role → Public EC2 → Open Network",
    severity: "CRITICAL",
    summary: "An internet-facing EC2 instance has an IAM role with administrative privileges attached.",
    affectedResources: ["i-0abcd1234efgh5678", "arn:aws:iam::123456789012:role/AdminRole"],
    whyItMatters: "If an attacker compromises this public-facing instance, they immediately gain full administrative control over the entire AWS environment via the attached IAM role.",
    fixSteps: [
      "1. Remove the AdminRole from the EC2 instance.",
      "2. Create a new IAM role with least-privilege permissions required for the instance's function.",
      "3. Restrict the security group rules to only allow required inbound traffic (e.g., port 443)."
    ],
    tags: ["EC2", "IAM", "Network"],
    riskScore: 98,
    blastRadius: 4,
    attackPathSummary: "Internet → EC2 (Public) → IAM Admin Role → Sensitive Data",
    provider: "aws"
  },
  {
    id: "f-2",
    title: "Public VM with open firewall",
    severity: "HIGH",
    summary: "A virtual machine is exposed to the internet with unrestricted inbound firewall rules (0.0.0.0/0 on all ports).",
    affectedResources: ["vm-web-server-01", "vpc-firewall-rule-allow-all"],
    whyItMatters: "Unrestricted inbound access significantly increases the attack surface, allowing anyone on the internet to attempt to connect to any service running on the VM.",
    fixSteps: [
      "1. Identify the specific ports required for the VM's application (e.g., 80, 443).",
      "2. Modify the firewall rule to only allow traffic on those specific ports.",
      "3. Restrict the source IP addresses if possible, rather than allowing 0.0.0.0/0."
    ],
    tags: ["Compute", "Network"],
    riskScore: 85,
    blastRadius: 2,
    attackPathSummary: "Internet → Firewall (0.0.0.0/0) → Web Server VM",
    provider: "gcp"
  }
];

const mockGraphs = {
  "f-1": {
    nodes: [
      { id: "n1", type: "custom", position: { x: 0, y: 0 }, data: { label: "Internet", type: "Network", icon: "Globe", description: "Public internet access" } },
      { id: "n2", type: "custom", position: { x: 0, y: 0 }, data: { label: "i-0abcd1234efgh5678", type: "Compute", icon: "Server", description: "Publicly accessible EC2 instance" } },
      { id: "n3", type: "custom", position: { x: 0, y: 0 }, data: { label: "AdminRole", type: "Identity", icon: "User", description: "Overly permissive IAM Role" } },
      { id: "n4", type: "custom", position: { x: 0, y: 0 }, data: { label: "Production Data", type: "Data", icon: "Database", description: "Sensitive RDS database" } },
      { id: "n5", type: "custom", position: { x: 0, y: 0 }, data: { label: "vpc-prod", type: "Network", icon: "Network", description: "Production VPC" } }
    ],
    edges: [
      { id: "e1-2", source: "n1", target: "n2", isAttackPath: true },
      { id: "e2-3", source: "n2", target: "n3", isAttackPath: true },
      { id: "e3-4", source: "n3", target: "n4", isAttackPath: true },
      { id: "e5-2", source: "n5", target: "n2", isAttackPath: false }
    ]
  },
  "f-2": {
    nodes: [
      { id: "n1", type: "custom", position: { x: 0, y: 0 }, data: { label: "Internet", type: "Network", icon: "Globe", description: "Public internet access" } },
      { id: "n2", type: "custom", position: { x: 0, y: 0 }, data: { label: "Allow-All Firewall", type: "Network", icon: "ShieldAlert", description: "0.0.0.0/0 ingress rule" } },
      { id: "n3", type: "custom", position: { x: 0, y: 0 }, data: { label: "vm-web-server-01", type: "Compute", icon: "Server", description: "Web server instance" } }
    ],
    edges: [
      { id: "e1-2", source: "n1", target: "n2", isAttackPath: true },
      { id: "e2-3", source: "n2", target: "n3", isAttackPath: true }
    ]
  }
};

module.exports = { mockFindings, mockGraphs };
