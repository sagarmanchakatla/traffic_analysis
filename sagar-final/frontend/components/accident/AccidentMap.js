
"use client";

import dynamic from "next/dynamic";

const AccidentMapInner = dynamic(
  () => import("./AccidentMapInner"),
  { ssr: false }
);

export default function AccidentMap(props) {
  return <AccidentMapInner {...props} />;
}
