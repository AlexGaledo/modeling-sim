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
  pickupQueueSlotPosition,
  queueSlotPosition,
  stationPosition,
} from "./QueueLane";

const COLORS: Record<Customer["orderType"], THREE.Color> = {
  walkin: new THREE.Color("#ff6b6b"),
  pickup: new THREE.Color("#ffd93d"),
  delivery: new THREE.Color("#6bcbff"),
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
  const torsoRef = useRef<THREE.InstancedMesh>(null);
  const headRef = useRef<THREE.InstancedMesh>(null);
  const leftArmRef = useRef<THREE.InstancedMesh>(null);
  const rightArmRef = useRef<THREE.InstancedMesh>(null);
  const leftLegRef = useRef<THREE.InstancedMesh>(null);
  const rightLegRef = useRef<THREE.InstancedMesh>(null);

  const colorAttrTorso = useRef<THREE.InstancedBufferAttribute | null>(null);
  const colorAttrHead = useRef<THREE.InstancedBufferAttribute | null>(null);
  const colorAttrLeftArm = useRef<THREE.InstancedBufferAttribute | null>(null);
  const colorAttrRightArm = useRef<THREE.InstancedBufferAttribute | null>(null);
  const colorAttrLeftLeg = useRef<THREE.InstancedBufferAttribute | null>(null);
  const colorAttrRightLeg = useRef<THREE.InstancedBufferAttribute | null>(null);

  const stations = useMemo(() => {
    console.log(`[CUSTOMER] assignStations: ${customers.length} customers, c=${c}`);
    return assignStations(customers, c);
  }, [customers, c]);

  const torsoColors = useMemo(() => new Float32Array(MAX_VISIBLE * 3), []);
  const headColors = useMemo(() => new Float32Array(MAX_VISIBLE * 3), []);
  const leftArmColors = useMemo(() => new Float32Array(MAX_VISIBLE * 3), []);
  const rightArmColors = useMemo(() => new Float32Array(MAX_VISIBLE * 3), []);
  const leftLegColors = useMemo(() => new Float32Array(MAX_VISIBLE * 3), []);
  const rightLegColors = useMemo(() => new Float32Array(MAX_VISIBLE * 3), []);

  useFrame((_, delta) => {
    advance(delta);
    const now = clockRef.current;
    const torso = torsoRef.current;
    const head = headRef.current;
    const leftArm = leftArmRef.current;
    const rightArm = rightArmRef.current;
    const leftLeg = leftLegRef.current;
    const rightLeg = rightLegRef.current;
    if (!torso || !head || !leftArm || !rightArm || !leftLeg || !rightLeg) return;

    let slot = 0;
    let walkinQueueIdx = 0;
    let pickupQueueIdx = 0;
    let deliveryQueueIdx = 0;

    for (let i = 0; i < customers.length && slot < MAX_VISIBLE; i++) {
      const cust = customers[i]!;
      if (cust.arrivalTime > now) break;
      const departure = cust.departureTime ?? Infinity;
      if (now > departure + 2) continue;

      let queueIdx: number;
      if (cust.orderType === "delivery") {
        queueIdx = deliveryQueueIdx;
      } else if (cust.orderType === "pickup") {
        queueIdx = pickupQueueIdx;
      } else {
        queueIdx = walkinQueueIdx;
      }

      const pos = positionFor(cust, now, stations[i] ?? -1, c, queueIdx);

      if (stations[i] === -1 || (cust.serviceStartTime ?? Infinity) > now) {
        if (cust.orderType === "delivery") deliveryQueueIdx++;
        else if (cust.orderType === "pickup") pickupQueueIdx++;
        else walkinQueueIdx++;
      }

      const x = pos[0];
      const z = pos[2];

      dummy.position.set(x - 0.09, 0.17, z);
      dummy.updateMatrix();
      leftLeg.setMatrixAt(slot, dummy.matrix);

      dummy.position.set(x + 0.09, 0.17, z);
      dummy.updateMatrix();
      rightLeg.setMatrixAt(slot, dummy.matrix);

      dummy.position.set(x, 0.56, z);
      dummy.updateMatrix();
      torso.setMatrixAt(slot, dummy.matrix);

      dummy.position.set(x - 0.24, 0.55, z);
      dummy.updateMatrix();
      leftArm.setMatrixAt(slot, dummy.matrix);

      dummy.position.set(x + 0.24, 0.55, z);
      dummy.updateMatrix();
      rightArm.setMatrixAt(slot, dummy.matrix);

      dummy.position.set(x, 0.93, z);
      dummy.updateMatrix();
      head.setMatrixAt(slot, dummy.matrix);

      const color = COLORS[cust.orderType];
      const r = color.r;
      const g = color.g;
      const b = color.b;
      torsoColors[slot * 3 + 0] = r;
      torsoColors[slot * 3 + 1] = g;
      torsoColors[slot * 3 + 2] = b;
      headColors[slot * 3 + 0] = r;
      headColors[slot * 3 + 1] = g;
      headColors[slot * 3 + 2] = b;
      leftArmColors[slot * 3 + 0] = r;
      leftArmColors[slot * 3 + 1] = g;
      leftArmColors[slot * 3 + 2] = b;
      rightArmColors[slot * 3 + 0] = r;
      rightArmColors[slot * 3 + 1] = g;
      rightArmColors[slot * 3 + 2] = b;
      leftLegColors[slot * 3 + 0] = r;
      leftLegColors[slot * 3 + 1] = g;
      leftLegColors[slot * 3 + 2] = b;
      rightLegColors[slot * 3 + 0] = r;
      rightLegColors[slot * 3 + 1] = g;
      rightLegColors[slot * 3 + 2] = b;
      slot++;
    }

    for (let i = slot; i < MAX_VISIBLE; i++) {
      dummy.position.copy(HIDDEN);
      dummy.updateMatrix();
      torso.setMatrixAt(i, dummy.matrix);
      head.setMatrixAt(i, dummy.matrix);
      leftArm.setMatrixAt(i, dummy.matrix);
      rightArm.setMatrixAt(i, dummy.matrix);
      leftLeg.setMatrixAt(i, dummy.matrix);
      rightLeg.setMatrixAt(i, dummy.matrix);
    }

    torso.instanceMatrix.needsUpdate = true;
    head.instanceMatrix.needsUpdate = true;
    leftArm.instanceMatrix.needsUpdate = true;
    rightArm.instanceMatrix.needsUpdate = true;
    leftLeg.instanceMatrix.needsUpdate = true;
    rightLeg.instanceMatrix.needsUpdate = true;
    if (colorAttrTorso.current) colorAttrTorso.current.needsUpdate = true;
    if (colorAttrHead.current) colorAttrHead.current.needsUpdate = true;
    if (colorAttrLeftArm.current) colorAttrLeftArm.current.needsUpdate = true;
    if (colorAttrRightArm.current) colorAttrRightArm.current.needsUpdate = true;
    if (colorAttrLeftLeg.current) colorAttrLeftLeg.current.needsUpdate = true;
    if (colorAttrRightLeg.current) colorAttrRightLeg.current.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={torsoRef} args={[undefined, undefined, MAX_VISIBLE]}>
        <boxGeometry args={[0.32, 0.38, 0.18]} />
        <meshStandardMaterial vertexColors roughness={0.35} metalness={0.05} />
        <instancedBufferAttribute
          ref={(attr) => { colorAttrTorso.current = attr; }}
          attach="instanceColor"
          args={[torsoColors, 3]}
        />
      </instancedMesh>
      <instancedMesh ref={headRef} args={[undefined, undefined, MAX_VISIBLE]}>
        <sphereGeometry args={[0.16, 12, 12]} />
        <meshStandardMaterial vertexColors roughness={0.25} metalness={0.05} emissive={new THREE.Color(0x333333)} emissiveIntensity={0.2} />
        <instancedBufferAttribute
          ref={(attr) => { colorAttrHead.current = attr; }}
          attach="instanceColor"
          args={[headColors, 3]}
        />
      </instancedMesh>
      <instancedMesh ref={leftArmRef} args={[undefined, undefined, MAX_VISIBLE]}>
        <cylinderGeometry args={[0.05, 0.05, 0.34, 6]} />
        <meshStandardMaterial vertexColors roughness={0.35} metalness={0.05} />
        <instancedBufferAttribute
          ref={(attr) => { colorAttrLeftArm.current = attr; }}
          attach="instanceColor"
          args={[leftArmColors, 3]}
        />
      </instancedMesh>
      <instancedMesh ref={rightArmRef} args={[undefined, undefined, MAX_VISIBLE]}>
        <cylinderGeometry args={[0.05, 0.05, 0.34, 6]} />
        <meshStandardMaterial vertexColors roughness={0.35} metalness={0.05} />
        <instancedBufferAttribute
          ref={(attr) => { colorAttrRightArm.current = attr; }}
          attach="instanceColor"
          args={[rightArmColors, 3]}
        />
      </instancedMesh>
      <instancedMesh ref={leftLegRef} args={[undefined, undefined, MAX_VISIBLE]}>
        <cylinderGeometry args={[0.06, 0.06, 0.34, 6]} />
        <meshStandardMaterial vertexColors roughness={0.35} metalness={0.05} />
        <instancedBufferAttribute
          ref={(attr) => { colorAttrLeftLeg.current = attr; }}
          attach="instanceColor"
          args={[leftLegColors, 3]}
        />
      </instancedMesh>
      <instancedMesh ref={rightLegRef} args={[undefined, undefined, MAX_VISIBLE]}>
        <cylinderGeometry args={[0.06, 0.06, 0.34, 6]} />
        <meshStandardMaterial vertexColors roughness={0.35} metalness={0.05} />
        <instancedBufferAttribute
          ref={(attr) => { colorAttrRightLeg.current = attr; }}
          attach="instanceColor"
          args={[rightLegColors, 3]}
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
    if (cust.orderType === "pickup") {
      return pickupQueueSlotPosition(queueIdx);
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
