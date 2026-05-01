import { adminDb as db } from "@/lib/firebase/admin";
import { withTimeout } from "@/lib/utils/withTimeout";

export async function GET() {
  try {
    await withTimeout(db.collection("test").limit(1).get(), 5000);
    return Response.json({ status: "ok" });
  } catch (err) {
    console.error("Health check failed:", err);
    return Response.json({ status: "error" }, { status: 500 });
  }
}
