import { stackServerApp } from "@/lib/stack/server";
import GoogleAIOverview from "@/components/google-ai-overview";

export default async function GoogleAIOverviewPage() {
    const user = await stackServerApp.getUser({ or: "redirect" });

    return <GoogleAIOverview />;
}
