import { stackServerApp } from "@/lib/stack/server";
import GeoCopyCoach from "@/components/geo-copy-coach";

export default async function AuditPage() {
    const user = await stackServerApp.getUser({ or: "redirect" });

    return <GeoCopyCoach />;
}
