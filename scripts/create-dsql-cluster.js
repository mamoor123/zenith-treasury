const fs = require("fs");
const path = require("path");
const { DSQLClient, CreateClusterCommand, GetClusterCommand } = require("@aws-sdk/client-dsql");

// Parse AWS credentials from desktop
const csvPath = "C:/Users/Lenovo/Desktop/rootkey.cvs";

async function run() {
  console.log("Reading AWS credentials from desktop...");
  if (!fs.existsSync(csvPath)) {
    console.error("Credentials file rootkey.cvs not found on Desktop.");
    process.exit(1);
  }

  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.split("\n").map(l => l.trim()).filter(Boolean);

  if (lines.length < 2) {
    console.error("Invalid credentials file format.");
    process.exit(1);
  }

  const [accessKeyId, secretAccessKey] = lines[1].split(",");

  if (!accessKeyId || !secretAccessKey) {
    console.error("Failed to parse Access Key ID or Secret Access Key.");
    process.exit(1);
  }

  console.log(`Authenticated as: ${accessKeyId.substring(0, 8)}...`);

  // Initialize DSQL Client in us-east-1 (Aurora DSQL launch region)
  const client = new DSQLClient({
    region: "us-east-1",
    credentials: {
      accessKeyId: accessKeyId.trim(),
      secretAccessKey: secretAccessKey.trim(),
    }
  });

  try {
    console.log("\nInitiating AWS Aurora DSQL Cluster creation (us-east-1)...");
    const createCommand = new CreateClusterCommand({
      // We can add custom tags here
      tags: {
        Project: "Zenith-Treasury",
        Hackathon: "H0-Hackathon"
      }
    });

    const createResponse = await client.send(createCommand);
    const clusterId = createResponse.identifier;
    console.log(`Cluster creation requested successfully!`);
    console.log(`Cluster ID: ${clusterId}`);
    console.log(`ARN: ${createResponse.arn}`);
    console.log("Waiting for cluster to become ACTIVE. This typically takes 30-90 seconds...");

    // Poll status until ACTIVE
    let isActive = false;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max

    while (!isActive && attempts < maxAttempts) {
      attempts++;
      await new Promise(r => setTimeout(r, 5000)); // wait 5 seconds

      try {
        const getCommand = new GetClusterCommand({ identifier: clusterId });
        const getResponse = await client.send(getCommand);
        const status = getResponse.status;
        console.log(`[Attempt ${attempts}] Status: ${status}`);

        if (status === "ACTIVE") {
          isActive = true;
          console.log("\n🎉 SUCCESS! Aurora DSQL DB Cluster is now ACTIVE.");
          console.log(`Endpoint Hostname: ${getResponse.endpoint}`);
          console.log("\n------------------------------------------------------------");
          console.log("To connect this cluster to your Zenith Treasury project, add it to your environment:");
          console.log(`DATABASE_URL="postgresql://dsql_admin@${getResponse.endpoint}/postgres?sslmode=require"`);
          console.log("------------------------------------------------------------");
          break;
        } else if (status === "FAILED") {
          console.error("Cluster creation failed on AWS side.");
          process.exit(1);
        }
      } catch (err) {
        console.warn(`[Attempt ${attempts}] Failed to fetch cluster status, retrying...`, err.message);
      }
    }

    if (!isActive) {
      console.error("Timeout: Cluster is still creating. Check your AWS Console later.");
    }
  } catch (err) {
    console.error("Error provisioning DSQL cluster:", err);
  }
}

run();
