import { adminDb } from "../lib/firebase/admin";
import { formatDisplayName } from "../lib/utils/user";

async function fixUserNames() {
  console.log("Starting user name cleanup...");
  
  try {
    const usersRef = adminDb.collection("users");
    const snapshot = await usersRef.get();
    
    console.log(`Found ${snapshot.size} users. Checking for invalid names...`);
    
    let updatedCount = 0;
    const ADMIN_EMAIL = "seanpixelsgh1@gmail.com";
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const currentName = data.name;
      const currentRole = data.role;
      const email = data.email?.toLowerCase();
      
      console.log(`Checking user: email=${email}, role=${currentRole}, name=${currentName}`);
      
      let needsUpdate = false;
      const updatePayload: any = {};

      // 1. Fix Name
      const isInvalidName = !currentName || 
                            currentName.toLowerCase() === "undefined undefined" || 
                            currentName.toLowerCase() === "null null";
      
      if (isInvalidName) {
        let newName = "";
        
        if (data.profile?.firstName && data.profile?.lastName) {
          newName = `${data.profile.firstName} ${data.profile.lastName}`.trim();
        }
        
        if (!newName || newName.toLowerCase() === "undefined undefined" || newName.toLowerCase() === "null null") {
          newName = data.email?.split("@")[0] || "User";
        }
        
        const finalName = formatDisplayName(newName, "User");
        updatePayload.name = finalName;
        needsUpdate = true;
        console.log(`  -> Fixing name: "${currentName}" -> "${finalName}"`);
      }

      // 2. Elevate Admin Role
      if (email === ADMIN_EMAIL && currentRole !== "admin") {
        updatePayload.role = "admin";
        needsUpdate = true;
        console.log(`  -> Elevating role: "${currentRole}" -> "admin"`);
      }
      
      if (needsUpdate) {
        updatePayload.updatedAt = new Date().toISOString();
        await doc.ref.update(updatePayload);
        updatedCount++;
      }
    }
    
    console.log(`\nCleanup complete. Updated ${updatedCount} users.`);
  } catch (error) {
    console.error("Error during cleanup:", error);
  }
}

fixUserNames();
