import { Suspense } from "react";
import { MembersView } from "@/components/members/MembersView";

export default function MembersPage() {
  return (
    <Suspense>
      <MembersView />
    </Suspense>
  );
}
