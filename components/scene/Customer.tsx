"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Customer } from "@/lib/sim/types";
import {
  DELIVERY_WINDOW_X,
  DELIVERY_WINDOW_Z,
  EXIT_X,
  EXIT_Z,
  LANE_X_HEAD,
  deliveryQueueSlotPosition,
  queueSlotPosition,
  stationPosition,
} from "./QueueLane";

const COLORS: Record<Customer["orderType"], THREE.Color> = {
  walkin: new THREE.Color("#ff6b6b"),
  pickup: new THREE.Color("#ffd93d"),
  delivery: new THREE.Color("#6bcbff"),
};

const GLOW: Record<Customer["orderType"], number> = {
  walkin: 0xff6b6b,
  pickup: 0xffd93d,
  delivery: 0x6bcbff,
};

function assignStations(customers: readonly Customer[], c: number): Int16Array {
  const stations = new Int16Array(customers.length).fill(-1);
  const occupied: { customerId: number; freeAt: number }[] = Array.from({ length: c }, () => ({
    customerId: -1,
    freeAt: 0,
  }));
  const order = customers
    .map((c, i) => ({ i, start: c.serviceStartTime ?? Infinity }))
    .filter((o) => o.start !== Infinity)
    .sort((a, b) => a.start - b.start);
  for (const { i } of order) {
    const cust = customers[i]!;
    let pick = 0;
    for (let s = 1; s < c; s++) {
      if (occupied[s]!.freeAt < occupied[pick]!.freeAt) pick = s;
    }
    stations[i] = pick;
    occupied[pick] = { customerId: i, freeAt: cust.departureTime ?? Infinity };
  }
  return stations;
}

interface Props {
  customers: readonly Customer[];
  c: number;
  clockRef: React.MutableRefObject<number>;
  advance: (delta: number) => void;
}

const MAX_VISIBLE = 400;
const HIDDEN = new THREE.Vector3(0, -10, 0);
const dummy = new THREE.Object3D();

export default function Customers({ customers, c, clockRef, advance }: Props) {
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const headRef = useRef<THREE.InstancedMesh>(null);
  const colorAttrBody = useRef<THREE.InstancedBufferAttribute | null>(null);
  const colorAttrHead = useRef<THREE.InstancedBufferAttribute | null>(null);
  const stations = useMemo(() => {
    console.log(`[CUSTOMER] assignStations: ${customers.length} customers, c=${c}`);
    return assignStations(customers, c);
  }, [customers, c]);

  const bodyColors = useMemo(() => new Float32Array(MAX_VISIBLE * 3), []);
  const headColors = useMemo(() => new Float32Array(MAX_VISIBLE * 3), []);

  useFrame((_, delta) => {
    advance(delta);
    const now = clockRef.current;
    const body = bodyRef.current;
    const head = headRef.current;
    if (!body || !head) return;

    let slot = 0;
    let walkinQueueIdx = 0;
    let deliveryQueueIdx = 0;

    for (let i = 0; i < customers.length && slot < MAX_VISIBLE; i++) {
      const cust = customers[i]!;
      if (cust.arrivalTime > now) break;
      const departure = cust.departureTime ?? Infinity;
      if (now > departure + 2) continue;

      const isDelivery = cust.orderType === "delivery";
      const queueIdx = isDelivery ? deliveryQueueIdx : walkinQueueIdx;

      const pos = positionFor(cust, now, stations[i] ?? -1, c, queueIdx);

      if (stations[i] === -1 || (cust.serviceStartTime ?? Infinity) > now) {
        if (isDelivery) deliveryQueueIdx++;
        else walkinQueueIdx++;
      }

      dummy.position.set(pos[0], 0.35, pos[2]);
      dummy.updateMatrix();
      body.setMatrixAt(slot, dummy.matrix);

      dummy.position.set(pos[0], 0.85, pos[2]);
      dummy.updateMatrix();
      head.setMatrixAt(slot, dummy.matrix);

      const color = COLORS[cust.orderType];
      bodyColors[slot * 3 + 0] = color.r;
      bodyColors[slot * 3 + 1] = color.g;
      bodyColors[slot * 3 + 2] = color.b;
      headColors[slot * 3 + 0] = color.r;
      headColors[slot * 3 + 1] = color.g;
      headColors[slot * 3 + 2] = color.b;
      slot++;
    }

    for (let i = slot; i < MAX_VISIBLE; i++) {
      dummy.position.copy(HIDDEN);
      dummy.updateMatrix();
      body.setMatrixAt(i, dummy.matrix);
      head.setMatrixAt(i, dummy.matrix);
    }

    body.instanceMatrix.needsUpdate = true;
    head.instanceMatrix.needsUpdate = true;
    if (colorAttrBody.current) colorAttrBody.current.needsUpdate = true;
    if (colorAttrHead.current) colorAttrHead.current.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={bodyRef} args={[undefined, undefined, MAX_VISIBLE]}>
        <capsuleGeometry args={[0.24, 0.55, 6, 14]} />
        <meshStandardMaterial vertexColors roughness={0.35} metalness={0.05} />
        <instancedBufferAttribute
          ref={(attr) => { colorAttrBody.current = attr; }}
          attach="instanceColor"
          args={[bodyColors, 3]}
        />
      </instancedMesh>
      <instancedMesh ref={headRef} args={[undefined, undefined, MAX_VISIBLE]}>
        <sphereGeometry args={[0.19, 14, 14]} />
        <meshStandardMaterial vertexColors roughness={0.25} metalness={0.05} emissive={new THREE.Color(0x333333)} emissiveIntensity={0.2} />
        <instancedBufferAttribute
          ref={(attr) => { colorAttrHead.current = attr; }}
          attach="instanceColor"
          args={[headColors, 3]}
        />
      </instancedMesh>
    </group>
  );
}

function positionFor(
  cust: Customer,
  now: number,
  stationId: number,
  c: number,
  queueIdx: number,
): [number, number, number] {
  const start = cust.serviceStartTime ?? Infinity;
  const end = cust.departureTime ?? Infinity;

  if (now < start) {
    if (cust.orderType === "delivery") {
      return deliveryQueueSlotPosition(queueIdx);
    }
    return queueSlotPosition(queueIdx);
  }

  if (now <= end && stationId >= 0) {
    if (cust.orderType === "delivery") {
      return [DELIVERY_WINDOW_X, 0, DELIVERY_WINDOW_Z];
    }
    return stationPosition(stationId, c);
  }

  const t = Math.min(1, Math.max(0, (now - end) / 2));
  if (cust.orderType === "delivery") {
    const exitX = DELIVERY_WINDOW_X + (EXIT_X - DELIVERY_WINDOW_X) * t;
    const exitZ = DELIVERY_WINDOW_Z + (EXIT_Z - DELIVERY_WINDOW_Z) * t;
    return [exitX, 0, exitZ];
  }
  const [sx, , sz] = stationId >= 0 ? stationPosition(stationId, c) : [LANE_X_HEAD, 0, 0];
  const exitX = sx + (EXIT_X - sx) * t;
  const exitZ = sz + (EXIT_Z - sz) * t;
  return [exitX, 0, exitZ];
}
