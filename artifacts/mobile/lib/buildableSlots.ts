import {
  BUILDING_GRID_ORDER,
  getBuildBlockReason,
  type SlotLike,
} from "@workspace/building-progression";
import { canAffordCost, normalizeResources } from "@/lib/resourceMeta";
import { getBuildingCost, type ResourceAmounts } from "@/lib/buildingMeta";

export type SlotBuildState = {
  slotType: string;
  built: boolean;
  locked: boolean;
  ready: boolean;
  canAfford: boolean;
  /** Unlocked, empty, and player can pay level-1 cost. */
  actionable: boolean;
};

export function slotBuildStates(
  slots: SlotLike[],
  resources: ResourceAmounts | { gold?: number; food?: number; wood?: number; stone?: number },
): SlotBuildState[] {
  const owned = normalizeResources({
    gold: resources.gold ?? 0,
    food: resources.food ?? 0,
    wood: resources.wood ?? 0,
    stone: resources.stone ?? 0,
  });
  const slotMap = new Map<string, SlotLike>();
  for (const slot of slots) {
    const prev = slotMap.get(slot.slotType);
    if (!prev || (slot.level ?? 0) > (prev.level ?? 0)) {
      slotMap.set(slot.slotType, slot);
    }
  }
  const slotsForRules = [...slotMap.values()];

  return BUILDING_GRID_ORDER.map((slotType) => {
    const level = slotMap.get(slotType)?.level ?? 0;
    const built = level > 0;
    const lockReason = !built ? getBuildBlockReason(slotType, slotsForRules) : null;
    const locked = lockReason !== null;
    const ready = !built && !locked;
    const canAfford = ready && canAffordCost(getBuildingCost(slotType, 1), owned);
    return {
      slotType,
      built,
      locked,
      ready,
      canAfford,
      actionable: ready && canAfford,
    };
  });
}

export function countActionableBuilds(
  slots: SlotLike[],
  resources: ResourceAmounts | { gold?: number; food?: number; wood?: number; stone?: number },
): number {
  return slotBuildStates(slots, resources).filter((s) => s.actionable).length;
}

export function actionableBuildSlotTypes(
  slots: SlotLike[],
  resources: ResourceAmounts | { gold?: number; food?: number; wood?: number; stone?: number },
): string[] {
  return slotBuildStates(slots, resources)
    .filter((s) => s.actionable)
    .map((s) => s.slotType);
}
