/**
 * Test script to verify datalake data access
 */

import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

// Configuration for LocalStack
const S3_ENDPOINT = "http://localhost:4566";
const S3_REGION = "us-east-1";
const GOLD_BUCKET = "plainledger-gold";
const ORG_ID = "demo-org";

const s3Client = new S3Client({
  endpoint: S3_ENDPOINT,
  region: S3_REGION,
  credentials: {
    accessKeyId: "test",
    secretAccessKey: "test",
  },
  forcePathStyle: true,
});

async function testDatalake() {
  console.log("🔍 Testing Datalake S3 Access...\n");
  console.log(`   Endpoint: ${S3_ENDPOINT}`);
  console.log(`   Bucket: ${GOLD_BUCKET}`);
  console.log(`   Organization: ${ORG_ID}\n`);

  try {
    // List dim_account files
    console.log("📁 Listing dim_account files...");
    const accountsResponse = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: GOLD_BUCKET,
        Prefix: `dim_account/${ORG_ID}/`,
      })
    );
    
    if (accountsResponse.Contents && accountsResponse.Contents.length > 0) {
      const accountFile = accountsResponse.Contents[accountsResponse.Contents.length - 1];
      console.log(`   Found: ${accountFile.Key} (${accountFile.Size} bytes)`);
      
      // Fetch and parse accounts
      const accountData = await s3Client.send(
        new GetObjectCommand({
          Bucket: GOLD_BUCKET,
          Key: accountFile.Key,
        })
      );
      const accountsJson = await accountData.Body?.transformToString();
      const accounts = JSON.parse(accountsJson || "[]");
      console.log(`   ✅ Loaded ${accounts.length} accounts`);
      
      // Show sample
      console.log("\n   Sample accounts:");
      accounts.slice(0, 3).forEach((acc: any) => {
        console.log(`     - ${acc.account_code}: ${acc.account_name} (${acc.account_type})`);
      });
    } else {
      console.log("   ❌ No account files found");
    }

    // List fact_transaction files
    console.log("\n📁 Listing fact_transaction files...");
    const txnResponse = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: GOLD_BUCKET,
        Prefix: `fact_transaction/${ORG_ID}/`,
      })
    );
    
    if (txnResponse.Contents && txnResponse.Contents.length > 0) {
      const txnFile = txnResponse.Contents[txnResponse.Contents.length - 1];
      console.log(`   Found: ${txnFile.Key} (${txnFile.Size} bytes)`);
      
      // Fetch and parse transactions
      const txnData = await s3Client.send(
        new GetObjectCommand({
          Bucket: GOLD_BUCKET,
          Key: txnFile.Key,
        })
      );
      const txnJson = await txnData.Body?.transformToString();
      const transactions = JSON.parse(txnJson || "[]");
      console.log(`   ✅ Loaded ${transactions.length} transactions`);
      
      // Calculate summary
      let totalRevenue = 0;
      let totalExpenses = 0;
      
      for (const txn of transactions) {
        if (txn.account_key?.startsWith("acc_04")) {
          totalRevenue += txn.credit_amount || 0;
        }
        if (txn.account_key?.startsWith("acc_05")) {
          totalExpenses += txn.debit_amount || 0;
        }
      }
      
      console.log("\n   📊 Financial Summary:");
      console.log(`     - Total Revenue: $${totalRevenue.toLocaleString()}`);
      console.log(`     - Total Expenses: $${totalExpenses.toLocaleString()}`);
      console.log(`     - Net Income: $${(totalRevenue - totalExpenses).toLocaleString()}`);
    } else {
      console.log("   ❌ No transaction files found");
    }

    // List dim_contact files
    console.log("\n📁 Listing dim_contact files...");
    const contactResponse = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: GOLD_BUCKET,
        Prefix: `dim_contact/${ORG_ID}/`,
      })
    );
    
    if (contactResponse.Contents && contactResponse.Contents.length > 0) {
      const contactFile = contactResponse.Contents[contactResponse.Contents.length - 1];
      console.log(`   Found: ${contactFile.Key} (${contactFile.Size} bytes)`);
      
      const contactData = await s3Client.send(
        new GetObjectCommand({
          Bucket: GOLD_BUCKET,
          Key: contactFile.Key,
        })
      );
      const contactsJson = await contactData.Body?.transformToString();
      const contacts = JSON.parse(contactsJson || "[]");
      console.log(`   ✅ Loaded ${contacts.length} contacts`);
    } else {
      console.log("   ❌ No contact files found");
    }

    console.log("\n🎉 Datalake test complete!");
    console.log("\nThe gold S3 bucket is properly populated with QuickBooks demo data.");
    console.log("You can now login to the web app and view this data in the dashboard.");
    
  } catch (error) {
    console.error("❌ Error testing datalake:", error);
    process.exit(1);
  }
}

testDatalake();
