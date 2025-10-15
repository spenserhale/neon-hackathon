import { stackServerApp } from "@/lib/stack/server";
import PerplexityVisibility from "@/components/perplexity-visibility";

export default async function PerplexityVisibilityPage() {
    const user = await stackServerApp.getUser({ or: "redirect" });

    return <PerplexityVisibility />;
}
