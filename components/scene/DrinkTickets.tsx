"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Customer } from "@/lib/sim/types";
import type { Mode } from "@/lib/store";
import { STATION_SPACING_Z } from "./QueueLane";

const TICKET_COLORS: Record<string, THREE.Color> = {
  walkin: new THREE.Color("#ff6b6b"),
  pickup: new THREE.Color("#ffd93d"),
  delivery: new THREE.Color("#6bcbff"),
};

interface Props {
  customers: readonly Customer[];
  mode: Mode;
  clockRef: React.MutableRefObject<number>;
}

const MAX_TICKETS = 100;
const RAIL_X = 5;
const RAIL_Y = 0.7;

export default function DrinkTickets({ customers, mode, clockRef }: Props) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colors = useMemo(() => new Float32Array(MAX_TICKETS * 3), []);

  useFrame(() => {
    const now = clockRef.current;
    const mesh = ref.current;
    if (!mesh) return;

    // Customers currently being served (ticket is in the order queue)
    const inService = customers.filter(
      (c) =>
        c.serviceStartTime !== undefined &&
        c.serviceStartTime <= now &&
        (c.departureTime === undefined || c.departureTime > now),
    );

    let slot = 0;

    if (mode === "multi") {
      // Separate zones per type on the rail
      const zones: { type: string; zCenter: number }[] = [
        { type: "walkin", zCenter: 2.5 },
        { type: "pickup", zCenter: 0 },
        { type: "delivery", zCenter: -2.5 },
      ];

      for (const zone of zones) {
        const typed = inService
          .filter((c) => c.orderType === zone.type)
          .sort((a, b) => (a.serviceStartTime ?? 0) - (b.serviceStartTime ?? 0));

        for (let j = 0; j < typed.length && slot < MAX_TICKETS; j++) {
          const z = zone.zCenter + j * 0.08;
          dummy.position.set(RAIL_X, RAIL_Y, z);
          dummy.updateMatrix();
          mesh.setMatrixAt(slot, dummy.matrix);

          const color = TICKET_COLORS[zone.type]!;
          colors[slot * 3] = color.r;
          colors[slot * 3 + 1] = color.g;
          colors[slot * 3 + 2] = color.b;
          slot++;
        }
      }
    } else {
      // Single mode: one FIFO line, front (positive z) = next to be made
      const sorted = [...inService].sort(
        (a, b) => (a.serviceStartTime ?? 0) - (b.serviceStartTime ?? 0),
      );

      for (const cust of sorted) {
        if (slot >= MAX_TICKETS) break;
        const z = 4 - slot * 0.08;
        dummy.position.set(RAIL_X, RAIL_Y, z);
        dummy.updateMatrix();
        mesh.setMatrixAt(slot, dummy.matrix);

        const color = TICKET_COLORS[cust.orderType] ?? new THREE.Color("#fff");
        colors[slot * 3] = color.r;
        colors[slot * 3 + 1] = color.g;
        colors[slot * 3 + 2] = color.b;
        slot++;
      }
    }

    // Hide remaining slots
    for (let i = slot; i < MAX_TICKETS; i++) {
      dummy.position.set(RAIL_X, -10, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, MAX_TICKETS]}>
      <planeGeometry args={[0.12, 0.08]} />
      <meshStandardMaterial vertexColors roughness={0.3} metalness={0.4} />
    </instancedMesh>
  );
}
