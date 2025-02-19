import type { AffineOfficialWorkspace } from '@affine/env/workspace';
import { rootWorkspacesMetadataAtom } from '@affine/workspace/atom';
import { assertExists } from '@blocksuite/global/utils';
import type { Workspace } from '@blocksuite/store';
import { useStaticBlockSuiteWorkspace } from '@toeverything/infra/__internal__/react';
import type { Atom } from 'jotai';
import { atom, useAtomValue } from 'jotai';

const workspaceWeakMap = new WeakMap<
  Workspace,
  Atom<Promise<AffineOfficialWorkspace>>
>();

export function useWorkspace(workspaceId: string): AffineOfficialWorkspace {
  const blockSuiteWorkspace = useStaticBlockSuiteWorkspace(workspaceId);
  if (!workspaceWeakMap.has(blockSuiteWorkspace)) {
    const baseAtom = atom(async get => {
      const metadata = await get(rootWorkspacesMetadataAtom);
      const flavour = metadata.find(({ id }) => id === workspaceId)?.flavour;
      assertExists(flavour, 'workspace flavour not found');
      return {
        id: workspaceId,
        flavour,
        blockSuiteWorkspace,
      };
    });
    workspaceWeakMap.set(blockSuiteWorkspace, baseAtom);
  }

  return useAtomValue(
    workspaceWeakMap.get(blockSuiteWorkspace) as Atom<
      Promise<AffineOfficialWorkspace>
    >
  );
}
