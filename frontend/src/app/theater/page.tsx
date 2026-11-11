import { Suspense } from "react";
import { TheaterView } from "@/components/theater/TheaterView";

export default function TheaterPage() {
  return (
    <Suspense>
      <TheaterView />
    </Suspense>
  );
}
