export type FamilyGuidanceSection<TList extends "actions" | "guidance", TAction extends string> = {
  code: string;
} & Record<TList, readonly TAction[]>;

function guidanceSignature(action: string): string {
  return action
    .normalize("NFKC")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Removes only complete guidance items repeated verbatim across report domains.
 * Different actions or warnings remain intact, even when they discuss the same topic.
 */
export function removeRepeatedFamilyGuidance<
  TList extends "actions" | "guidance",
  TAction extends string,
  TSection extends FamilyGuidanceSection<TList, TAction>,
>(sections: readonly TSection[], listKey: TList): TSection[] {
  const ownerByAction = new Map<string, string>();
  return sections.map((section) => {
    const actions = section[listKey].filter((action) => {
      const signature = guidanceSignature(action);
      if (!signature) return true;
      const owner = ownerByAction.get(signature);
      if (owner !== undefined && owner !== section.code) return false;
      ownerByAction.set(signature, section.code);
      return true;
    });
    return { ...section, [listKey]: actions };
  });
}
