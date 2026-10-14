import { Suspense } from "react";
import Menu from "@/components/Menu";

export default function Home() {
  return (
    <Suspense>
      <Menu />
    </Suspense>
  );
}
