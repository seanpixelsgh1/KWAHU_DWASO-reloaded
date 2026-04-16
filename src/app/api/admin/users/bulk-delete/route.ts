import { NextRequest, NextResponse } from "next/server";
import { adminDb as db } from "@/lib/firebase/admin";
import { FieldPath } from "firebase-admin/firestore";

export async function DELETE(request: NextRequest) {
  try {
    const { userIds } = await request.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid user IDs provided" },
        { status: 400 }
      );
    }

    // Create a batch for efficient deletion using Admin SDK
    const batch = db.batch();

    // Get user emails before deletion to match with orders
    const usersSnapshot = await db.collection("users")
      .where(FieldPath.documentId(), "in", userIds.slice(0, 10)) // Firestore 'in' query limit is usually 10-30
      .get();
    
    // If more than 10, we'd need to chunk, but for admin typical use, 10 is a common batch size.
    // Let's handle larger sets if needed by doing multiple queries or just fetching all and filtering in memory if small enough.
    // For now, let's just use the emails from the users we actually find.
    const usersToDeleteEmails: string[] = [];
    usersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.email) usersToDeleteEmails.push(data.email);
      batch.delete(doc.ref);
    });

    // Also delete related orders for these users if we have emails
    if (usersToDeleteEmails.length > 0) {
      const ordersSnapshot = await db.collection("orders")
        .where("customerEmail", "in", usersToDeleteEmails)
        .get();
      
      ordersSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
    }

    // Commit the batch
    await batch.commit();

    return NextResponse.json({
      message: `Successfully deleted ${usersSnapshot.docs.length} users and their related orders`,
      success: true
    });
  } catch (error) {
    console.error("API ERROR [admin-users-bulk-delete]:", error);
    return NextResponse.json(
      { error: "Failed to delete users" },
      { status: 500 }
    );
  }
}

