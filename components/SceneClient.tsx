"use client";

import dynamic from "next/dynamic";

const Scene = dynamic(() => import("@/components/scene/Scene"), { ssr: false });

export default Scene;
