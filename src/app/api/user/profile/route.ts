import { NextRequest, NextResponse } from "next/server";
import { adminDb as db } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email");
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const snapshot = await db.collection("users").where("email", "==", email).get();

    if (snapshot.empty) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.exists ? userDoc.data() : null;

    if (!userData) {
      return NextResponse.json({ error: "User data is empty" }, { status: 404 });
    }

    // Ensure addresses array exists for backward compatibility
    if (userData.profile && !userData.profile.addresses) {
      userData.profile.addresses = [];
    }

    // Fetch unified orders from single source of truth (using userId)
    const ordersSnapshot = await db.collection("orders").where("userId", "==", userDoc.id).get();
    const orders = ordersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : new Date().toISOString(),
      };
    });
    
    // Sort descending by date
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ ...userData, orders, id: userDoc.id });
  } catch (error) {
    console.error("API ERROR [profile-get]:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, phone, address, addAddress, image } = body;

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const snapshot = await db.collection("users").where("email", "==", email).get();

    if (snapshot.empty) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.exists ? userDoc.data() : null;

    if (!userData) {
        return NextResponse.json({ error: "User data is empty" }, { status: 404 });
    }

    let addresses = userData.profile?.addresses || [];

    // If addAddress is provided, push to addresses array
    if (addAddress) {
      // If this is marked as default, remove default from all others
      if (addAddress.isDefault) {
        addresses = addresses.map((addr: any) => ({
          ...addr,
          isDefault: false,
        }));
      }

      addresses = [...addresses, addAddress];
    } else if (address) {
      // Ensure only one default address exists
      let hasDefault = false;
      address.forEach((addr: any) => {
        if (addr.isDefault && !hasDefault) {
          hasDefault = true;
        } else if (addr.isDefault && hasDefault) {
          addr.isDefault = false;
        }
      });

      addresses = address;
    }

    // Prepare update data, only include defined fields
    const updateData: any = {
      "profile.addresses": addresses,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (typeof name !== "undefined") {
      updateData.name = name;
    }
    if (typeof phone !== "undefined") {
      updateData["profile.phone"] = phone;
    }
    if (typeof image !== "undefined") {
      updateData.image = image;
    }

    await userDoc.ref.update(updateData);

    return NextResponse.json({ success: true, addresses });
  } catch (error) {
    console.error("API ERROR [profile-update]:", error);
    return NextResponse.json(
      {
        error: "Failed to update profile",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

