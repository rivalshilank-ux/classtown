import { StudentEntryForm } from "./StudentEntryForm";
import { SiteStatusBanner } from "../_components/SiteStatusBanner";

export const dynamic = "force-dynamic";

export default function StudentEntryPage() {
  return (
    <>
      <SiteStatusBanner />
      <StudentEntryForm />
    </>
  );
}
