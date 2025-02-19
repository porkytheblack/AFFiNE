import {
  AddPageButton,
  AppSidebar,
  appSidebarOpenAtom,
  AppUpdaterButton,
  CategoryDivider,
  MenuItem,
  MenuLinkItem,
  QuickSearchInput,
  SidebarContainer,
  SidebarScrollableContainer,
} from '@affine/component/app-sidebar';
import { useCollectionManager } from '@affine/component/page-list';
import { useAFFiNEI18N } from '@affine/i18n/hooks';
import {
  DeleteTemporarilyIcon,
  FolderIcon,
  SettingsIcon,
} from '@blocksuite/icons';
import type { Page } from '@blocksuite/store';
import { useDroppable } from '@dnd-kit/core';
import { Popover } from '@toeverything/components/popover';
import { useAtom } from 'jotai';
import type { HTMLAttributes, ReactElement } from 'react';
import {
  forwardRef,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useHistoryAtom } from '../../atoms/history';
import { useAppSetting } from '../../atoms/settings';
import type { AllWorkspace } from '../../shared';
import { currentCollectionsAtom } from '../../utils/user-setting';
import { CollectionsList } from '../pure/workspace-slider-bar/collections';
import { AddCollectionButton } from '../pure/workspace-slider-bar/collections/add-collection-button';
import { AddFavouriteButton } from '../pure/workspace-slider-bar/favorite/add-favourite-button';
import FavoriteList from '../pure/workspace-slider-bar/favorite/favorite-list';
import { UserWithWorkspaceList } from '../pure/workspace-slider-bar/user-with-workspace-list';
import { WorkspaceCard } from '../pure/workspace-slider-bar/workspace-card';
import ImportPage from './import-page';

export type RootAppSidebarProps = {
  isPublicWorkspace: boolean;
  onOpenQuickSearchModal: () => void;
  onOpenSettingModal: () => void;
  currentWorkspace: AllWorkspace;
  openPage: (pageId: string) => void;
  createPage: () => Page;
  currentPath: string;
  paths: {
    all: (workspaceId: string) => string;
    trash: (workspaceId: string) => string;
    shared: (workspaceId: string) => string;
  };
};

const RouteMenuLinkItem = forwardRef<
  HTMLDivElement,
  {
    currentPath: string; // todo: pass through useRouter?
    path: string;
    icon: ReactElement;
    children?: ReactElement;
    isDraggedOver?: boolean;
  } & HTMLAttributes<HTMLDivElement>
>(({ currentPath, path, icon, children, isDraggedOver, ...props }, ref) => {
  // Force active style when a page is dragged over
  const active = isDraggedOver || currentPath === path;
  return (
    <MenuLinkItem
      ref={ref}
      {...props}
      active={active}
      to={path ?? ''}
      icon={icon}
    >
      {children}
    </MenuLinkItem>
  );
});
RouteMenuLinkItem.displayName = 'RouteMenuLinkItem';

// Unique droppable IDs
export const DROPPABLE_SIDEBAR_TRASH = 'trash-folder';

/**
 * This is for the whole affine app sidebar.
 * This component wraps the app sidebar in `@affine/component` with logic and data.
 *
 * @todo(himself65): rewrite all styled component into @vanilla-extract/css
 */
export const RootAppSidebar = ({
  currentWorkspace,
  openPage,
  createPage,
  currentPath,
  paths,
  onOpenQuickSearchModal,
  onOpenSettingModal,
}: RootAppSidebarProps): ReactElement => {
  const currentWorkspaceId = currentWorkspace.id;
  const [appSettings] = useAppSetting();
  const { backToAll } = useCollectionManager(currentCollectionsAtom);
  const blockSuiteWorkspace = currentWorkspace.blockSuiteWorkspace;
  const t = useAFFiNEI18N();
  const [openUserWorkspaceList, setOpenUserWorkspaceList] = useState(false);
  const onClickNewPage = useCallback(async () => {
    const page = createPage();
    await page.waitForLoaded();
    openPage(page.id);
  }, [createPage, openPage]);

  // Listen to the "New Page" action from the menu
  useEffect(() => {
    if (environment.isDesktop) {
      return window.events?.applicationMenu.onNewPageAction(onClickNewPage);
    }
    return;
  }, [onClickNewPage]);

  const [sidebarOpen, setSidebarOpen] = useAtom(appSidebarOpenAtom);
  useEffect(() => {
    if (environment.isDesktop) {
      window.apis?.ui.handleSidebarVisibilityChange(sidebarOpen).catch(err => {
        console.error(err);
      });
    }
  }, [sidebarOpen]);

  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      if ((e.key === '/' && e.metaKey) || (e.key === '/' && e.ctrlKey)) {
        setSidebarOpen(!sidebarOpen);
      }
    };
    document.addEventListener('keydown', keydown, { capture: true });
    return () =>
      document.removeEventListener('keydown', keydown, { capture: true });
  }, [sidebarOpen, setSidebarOpen]);

  const [history, setHistory] = useHistoryAtom();
  const router = useMemo(() => {
    return {
      forward: () => {
        setHistory(true);
      },
      back: () => {
        setHistory(false);
      },
      history,
    };
  }, [history, setHistory]);

  const trashDroppable = useDroppable({
    id: DROPPABLE_SIDEBAR_TRASH,
  });
  const closeUserWorkspaceList = useCallback(() => {
    setOpenUserWorkspaceList(false);
  }, []);

  return (
    <>
      <AppSidebar
        router={router}
        hasBackground={
          !(
            appSettings.enableBlurBackground &&
            environment.isDesktop &&
            environment.isMacOs
          )
        }
      >
        <SidebarContainer>
          <Popover
            open={openUserWorkspaceList}
            content={
              <Suspense>
                <UserWithWorkspaceList onEventEnd={closeUserWorkspaceList} />
              </Suspense>
            }
            contentOptions={{
              // hide trigger
              sideOffset: -58,
              onInteractOutside: closeUserWorkspaceList,
              onEscapeKeyDown: closeUserWorkspaceList,
            }}
          >
            <WorkspaceCard
              currentWorkspace={currentWorkspace}
              onClick={useCallback(() => {
                setOpenUserWorkspaceList(true);
              }, [])}
            />
          </Popover>
          <QuickSearchInput
            data-testid="slider-bar-quick-search-button"
            onClick={onOpenQuickSearchModal}
          />
          <RouteMenuLinkItem
            icon={<FolderIcon />}
            currentPath={currentPath}
            path={paths.all(currentWorkspaceId)}
            onClick={backToAll}
          >
            <span data-testid="all-pages">
              {t['com.affine.workspaceSubPath.all']()}
            </span>
          </RouteMenuLinkItem>
          {runtimeConfig.enableNewSettingModal ? (
            <MenuItem
              data-testid="slider-bar-workspace-setting-button"
              icon={<SettingsIcon />}
              onClick={onOpenSettingModal}
            >
              <span data-testid="settings-modal-trigger">
                {t['com.affine.settingSidebar.title']()}
              </span>
            </MenuItem>
          ) : null}
        </SidebarContainer>

        <SidebarScrollableContainer>
          <CategoryDivider label={t['com.affine.rootAppSidebar.favorites']()}>
            <AddFavouriteButton workspace={blockSuiteWorkspace} />
          </CategoryDivider>
          <FavoriteList workspace={blockSuiteWorkspace} />
          <CategoryDivider label={t['com.affine.rootAppSidebar.collections']()}>
            <AddCollectionButton workspace={blockSuiteWorkspace} />
          </CategoryDivider>
          <CollectionsList workspace={blockSuiteWorkspace} />
          <CategoryDivider label={t['com.affine.rootAppSidebar.others']()} />
          {/* fixme: remove the following spacer */}
          <div style={{ height: '4px' }} />
          <RouteMenuLinkItem
            ref={trashDroppable.setNodeRef}
            isDraggedOver={trashDroppable.isOver}
            icon={<DeleteTemporarilyIcon />}
            currentPath={currentPath}
            path={paths.trash(currentWorkspaceId)}
          >
            <span data-testid="trash-page">
              {t['com.affine.workspaceSubPath.trash']()}
            </span>
          </RouteMenuLinkItem>
          {blockSuiteWorkspace && (
            <ImportPage blocksuiteWorkspace={blockSuiteWorkspace} />
          )}
        </SidebarScrollableContainer>
        <SidebarContainer>
          {environment.isDesktop && <AppUpdaterButton />}
          <div style={{ height: '4px' }} />
          <AddPageButton onClick={onClickNewPage} />
        </SidebarContainer>
      </AppSidebar>
    </>
  );
};
