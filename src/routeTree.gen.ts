/* eslint-disable */
// @ts-nocheck
// noinspection JSUnusedGlobalSymbols
// Extended for NepARENA — includes settings, become-organizer, messages, feed.

import { Route as rootRouteImport } from './routes/__root'
import { Route as IndexRouteImport } from './routes/index'
import { Route as AboutRouteImport } from './routes/about'
import { Route as DashboardRouteImport } from './routes/dashboard'
import { Route as GalleryRouteImport } from './routes/gallery'
import { Route as HallOfFameRouteImport } from './routes/hall-of-fame'
import { Route as HistoryRouteImport } from './routes/history'
import { Route as MembersRouteImport } from './routes/members'
import { Route as ProfileRouteImport } from './routes/profile'
import { Route as ResetPasswordRouteImport } from './routes/reset-password'
import { Route as TournamentsRouteImport } from './routes/tournaments'
import { Route as PlatformRouteImport } from './routes/platform'
import { Route as AuthIndexRouteImport } from './routes/auth/index'
import { Route as AuthVerifyRouteImport } from './routes/auth/verify'
import { Route as MembersIdRouteImport } from './routes/members.$id'
import { Route as TournamentsIdRouteImport } from './routes/tournaments.$id'
import { Route as AdminTournamentsIdRouteImport } from './routes/admin.tournaments.$id'
import { Route as OSlugRouteImport } from './routes/o.$slug'
import { Route as InviteTokenRouteImport } from './routes/invite.$token'
import { Route as GamesRouteImport } from './routes/games'
import { Route as GamesIndexRouteImport } from './routes/games.index'
import { Route as FollowingRouteImport } from './routes/following'
import { Route as OrganizersRouteImport } from './routes/organizers'
import { Route as OwnershipRouteImport } from './routes/ownership'
import { Route as UsersRouteImport } from './routes/users'
import { Route as GamesBlindRankingRouteImport } from './routes/games.blind-ranking'
import { Route as GamesPenaltyRouteImport } from './routes/games.penalty'
import { Route as GamesHigherLowerRouteImport } from './routes/games.higher-lower'
import { Route as VoteGoatRouteImport } from './routes/vote.goat'
import { Route as MusicRouteImport } from './routes/music'
import { Route as SettingsRouteImport } from './routes/settings'
import { Route as BecomeOrganizerRouteImport } from './routes/become-organizer'
import { Route as MessagesRouteImport } from './routes/messages'
import { Route as FeedRouteImport } from './routes/feed'

const IndexRoute = IndexRouteImport.update({ id: '/', path: '/', getParentRoute: () => rootRouteImport } as any)
const AboutRoute = AboutRouteImport.update({ id: '/about', path: '/about', getParentRoute: () => rootRouteImport } as any)
const DashboardRoute = DashboardRouteImport.update({ id: '/dashboard', path: '/dashboard', getParentRoute: () => rootRouteImport } as any)
const GalleryRoute = GalleryRouteImport.update({ id: '/gallery', path: '/gallery', getParentRoute: () => rootRouteImport } as any)
const HallOfFameRoute = HallOfFameRouteImport.update({ id: '/hall-of-fame', path: '/hall-of-fame', getParentRoute: () => rootRouteImport } as any)
const HistoryRoute = HistoryRouteImport.update({ id: '/history', path: '/history', getParentRoute: () => rootRouteImport } as any)
const MembersRoute = MembersRouteImport.update({ id: '/members', path: '/members', getParentRoute: () => rootRouteImport } as any)
const ProfileRoute = ProfileRouteImport.update({ id: '/profile', path: '/profile', getParentRoute: () => rootRouteImport } as any)
const ResetPasswordRoute = ResetPasswordRouteImport.update({ id: '/reset-password', path: '/reset-password', getParentRoute: () => rootRouteImport } as any)
const TournamentsRoute = TournamentsRouteImport.update({ id: '/tournaments', path: '/tournaments', getParentRoute: () => rootRouteImport } as any)
const PlatformRoute = PlatformRouteImport.update({ id: '/platform', path: '/platform', getParentRoute: () => rootRouteImport } as any)
const AuthIndexRoute = AuthIndexRouteImport.update({ id: '/auth/', path: '/auth/', getParentRoute: () => rootRouteImport } as any)
const AuthVerifyRoute = AuthVerifyRouteImport.update({ id: '/auth/verify', path: '/auth/verify', getParentRoute: () => rootRouteImport } as any)
const MembersIdRoute = MembersIdRouteImport.update({ id: '/$id', path: '/$id', getParentRoute: () => MembersRoute } as any)
const TournamentsIdRoute = TournamentsIdRouteImport.update({ id: '/$id', path: '/$id', getParentRoute: () => TournamentsRoute } as any)
const AdminTournamentsIdRoute = AdminTournamentsIdRouteImport.update({ id: '/admin/tournaments/$id', path: '/admin/tournaments/$id', getParentRoute: () => rootRouteImport } as any)
const OSlugRoute = OSlugRouteImport.update({ id: '/o/$slug', path: '/o/$slug', getParentRoute: () => rootRouteImport } as any)
const InviteTokenRoute = InviteTokenRouteImport.update({ id: '/invite/$token', path: '/invite/$token', getParentRoute: () => rootRouteImport } as any)
const GamesRoute = GamesRouteImport.update({ id: '/games', path: '/games', getParentRoute: () => rootRouteImport } as any)
const GamesIndexRoute = GamesIndexRouteImport.update({ id: '/', path: '/', getParentRoute: () => GamesRoute } as any)
const GamesBlindRankingRoute = GamesBlindRankingRouteImport.update({ id: '/blind-ranking', path: '/blind-ranking', getParentRoute: () => GamesRoute } as any)
const GamesPenaltyRoute = GamesPenaltyRouteImport.update({ id: '/penalty', path: '/penalty', getParentRoute: () => GamesRoute } as any)
const GamesHigherLowerRoute = GamesHigherLowerRouteImport.update({ id: '/higher-lower', path: '/higher-lower', getParentRoute: () => GamesRoute } as any)
const FollowingRoute = FollowingRouteImport.update({ id: '/following', path: '/following', getParentRoute: () => rootRouteImport } as any)
const OrganizersRoute = OrganizersRouteImport.update({ id: '/organizers', path: '/organizers', getParentRoute: () => rootRouteImport } as any)
const OwnershipRoute = OwnershipRouteImport.update({ id: '/ownership', path: '/ownership', getParentRoute: () => rootRouteImport } as any)
const UsersRoute = UsersRouteImport.update({ id: '/users', path: '/users', getParentRoute: () => rootRouteImport } as any)
const VoteGoatRoute = VoteGoatRouteImport.update({ id: '/vote/goat', path: '/vote/goat', getParentRoute: () => rootRouteImport } as any)
const MusicRoute = MusicRouteImport.update({ id: '/music', path: '/music', getParentRoute: () => rootRouteImport } as any)
const SettingsRoute = SettingsRouteImport.update({ id: '/settings', path: '/settings', getParentRoute: () => rootRouteImport } as any)
const BecomeOrganizerRoute = BecomeOrganizerRouteImport.update({ id: '/become-organizer', path: '/become-organizer', getParentRoute: () => rootRouteImport } as any)
const MessagesRoute = MessagesRouteImport.update({ id: '/messages', path: '/messages', getParentRoute: () => rootRouteImport } as any)
const FeedRoute = FeedRouteImport.update({ id: '/feed', path: '/feed', getParentRoute: () => rootRouteImport } as any)

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/about': typeof AboutRoute
  '/dashboard': typeof DashboardRoute
  '/gallery': typeof GalleryRoute
  '/hall-of-fame': typeof HallOfFameRoute
  '/history': typeof HistoryRoute
  '/members': typeof MembersRouteWithChildren
  '/profile': typeof ProfileRoute
  '/reset-password': typeof ResetPasswordRoute
  '/tournaments': typeof TournamentsRouteWithChildren
  '/platform': typeof PlatformRoute
  '/auth/verify': typeof AuthVerifyRoute
  '/members/$id': typeof MembersIdRoute
  '/tournaments/$id': typeof TournamentsIdRoute
  '/auth/': typeof AuthIndexRoute
  '/admin/tournaments/$id': typeof AdminTournamentsIdRoute
  '/o/$slug': typeof OSlugRoute
  '/invite/$token': typeof InviteTokenRoute
  '/games': typeof GamesRouteWithChildren
  '/games/': typeof GamesIndexRoute
  '/following': typeof FollowingRoute
  '/organizers': typeof OrganizersRoute
  '/ownership': typeof OwnershipRoute
  '/users': typeof UsersRoute
  '/games/blind-ranking': typeof GamesBlindRankingRoute
  '/games/penalty': typeof GamesPenaltyRoute
  '/games/higher-lower': typeof GamesHigherLowerRoute
  '/vote/goat': typeof VoteGoatRoute
  '/music': typeof MusicRoute
  '/settings': typeof SettingsRoute
  '/become-organizer': typeof BecomeOrganizerRoute
  '/messages': typeof MessagesRoute
  '/feed': typeof FeedRoute
}
export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/about': typeof AboutRoute
  '/dashboard': typeof DashboardRoute
  '/gallery': typeof GalleryRoute
  '/hall-of-fame': typeof HallOfFameRoute
  '/history': typeof HistoryRoute
  '/members': typeof MembersRouteWithChildren
  '/profile': typeof ProfileRoute
  '/reset-password': typeof ResetPasswordRoute
  '/tournaments': typeof TournamentsRouteWithChildren
  '/platform': typeof PlatformRoute
  '/auth/verify': typeof AuthVerifyRoute
  '/members/$id': typeof MembersIdRoute
  '/tournaments/$id': typeof TournamentsIdRoute
  '/auth': typeof AuthIndexRoute
  '/admin/tournaments/$id': typeof AdminTournamentsIdRoute
  '/o/$slug': typeof OSlugRoute
  '/invite/$token': typeof InviteTokenRoute
  '/games': typeof GamesIndexRoute
  '/following': typeof FollowingRoute
  '/organizers': typeof OrganizersRoute
  '/ownership': typeof OwnershipRoute
  '/users': typeof UsersRoute
  '/games/blind-ranking': typeof GamesBlindRankingRoute
  '/games/penalty': typeof GamesPenaltyRoute
  '/games/higher-lower': typeof GamesHigherLowerRoute
  '/vote/goat': typeof VoteGoatRoute
  '/music': typeof MusicRoute
  '/settings': typeof SettingsRoute
  '/become-organizer': typeof BecomeOrganizerRoute
  '/messages': typeof MessagesRoute
  '/feed': typeof FeedRoute
}
export interface FileRoutesById {
  __root__: typeof rootRouteImport
  '/': typeof IndexRoute
  '/about': typeof AboutRoute
  '/dashboard': typeof DashboardRoute
  '/gallery': typeof GalleryRoute
  '/hall-of-fame': typeof HallOfFameRoute
  '/history': typeof HistoryRoute
  '/members': typeof MembersRouteWithChildren
  '/profile': typeof ProfileRoute
  '/reset-password': typeof ResetPasswordRoute
  '/tournaments': typeof TournamentsRouteWithChildren
  '/platform': typeof PlatformRoute
  '/auth/verify': typeof AuthVerifyRoute
  '/members/$id': typeof MembersIdRoute
  '/tournaments/$id': typeof TournamentsIdRoute
  '/auth/': typeof AuthIndexRoute
  '/admin/tournaments/$id': typeof AdminTournamentsIdRoute
  '/o/$slug': typeof OSlugRoute
  '/invite/$token': typeof InviteTokenRoute
  '/games': typeof GamesRouteWithChildren
  '/games/': typeof GamesIndexRoute
  '/following': typeof FollowingRoute
  '/organizers': typeof OrganizersRoute
  '/ownership': typeof OwnershipRoute
  '/users': typeof UsersRoute
  '/games/blind-ranking': typeof GamesBlindRankingRoute
  '/games/penalty': typeof GamesPenaltyRoute
  '/games/higher-lower': typeof GamesHigherLowerRoute
  '/vote/goat': typeof VoteGoatRoute
  '/music': typeof MusicRoute
  '/settings': typeof SettingsRoute
  '/become-organizer': typeof BecomeOrganizerRoute
  '/messages': typeof MessagesRoute
  '/feed': typeof FeedRoute
}
export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths: '/' | '/about' | '/dashboard' | '/gallery' | '/hall-of-fame' | '/history' | '/members' | '/profile' | '/reset-password' | '/tournaments' | '/platform' | '/auth/verify' | '/members/$id' | '/tournaments/$id' | '/auth/' | '/admin/tournaments/$id' | '/o/$slug' | '/invite/$token' | '/games' | '/games/' | '/following' | '/organizers' | '/ownership' | '/users' | '/games/blind-ranking' | '/games/penalty' | '/games/higher-lower' | '/vote/goat' | '/music' | '/settings' | '/become-organizer' | '/messages' | '/feed'
  fileRoutesByTo: FileRoutesByTo
  to: '/' | '/about' | '/dashboard' | '/gallery' | '/hall-of-fame' | '/history' | '/members' | '/profile' | '/reset-password' | '/tournaments' | '/platform' | '/auth/verify' | '/members/$id' | '/tournaments/$id' | '/auth' | '/admin/tournaments/$id' | '/o/$slug' | '/invite/$token' | '/games' | '/following' | '/organizers' | '/ownership' | '/users' | '/games/blind-ranking' | '/games/penalty' | '/games/higher-lower' | '/vote/goat' | '/music' | '/settings' | '/become-organizer' | '/messages' | '/feed'
  id: '__root__' | '/' | '/about' | '/dashboard' | '/gallery' | '/hall-of-fame' | '/history' | '/members' | '/profile' | '/reset-password' | '/tournaments' | '/platform' | '/auth/verify' | '/members/$id' | '/tournaments/$id' | '/auth/' | '/admin/tournaments/$id' | '/o/$slug' | '/invite/$token' | '/games' | '/games/' | '/following' | '/organizers' | '/ownership' | '/users' | '/games/blind-ranking' | '/games/penalty' | '/games/higher-lower' | '/vote/goat' | '/music' | '/settings' | '/become-organizer' | '/messages' | '/feed'
  fileRoutesById: FileRoutesById
}
export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  AboutRoute: typeof AboutRoute
  DashboardRoute: typeof DashboardRoute
  GalleryRoute: typeof GalleryRoute
  HallOfFameRoute: typeof HallOfFameRoute
  HistoryRoute: typeof HistoryRoute
  MembersRoute: typeof MembersRouteWithChildren
  ProfileRoute: typeof ProfileRoute
  ResetPasswordRoute: typeof ResetPasswordRoute
  TournamentsRoute: typeof TournamentsRouteWithChildren
  PlatformRoute: typeof PlatformRoute
  AuthVerifyRoute: typeof AuthVerifyRoute
  AuthIndexRoute: typeof AuthIndexRoute
  AdminTournamentsIdRoute: typeof AdminTournamentsIdRoute
  OSlugRoute: typeof OSlugRoute
  InviteTokenRoute: typeof InviteTokenRoute
  GamesRoute: typeof GamesRouteWithChildren
  FollowingRoute: typeof FollowingRoute
  OrganizersRoute: typeof OrganizersRoute
  OwnershipRoute: typeof OwnershipRoute
  UsersRoute: typeof UsersRoute
  VoteGoatRoute: typeof VoteGoatRoute
  MusicRoute: typeof MusicRoute
  SettingsRoute: typeof SettingsRoute
  BecomeOrganizerRoute: typeof BecomeOrganizerRoute
  MessagesRoute: typeof MessagesRoute
  FeedRoute: typeof FeedRoute
}

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': { id: '/'; path: '/'; fullPath: '/'; preLoaderRoute: typeof IndexRouteImport; parentRoute: typeof rootRouteImport }
    '/about': { id: '/about'; path: '/about'; fullPath: '/about'; preLoaderRoute: typeof AboutRouteImport; parentRoute: typeof rootRouteImport }
    '/dashboard': { id: '/dashboard'; path: '/dashboard'; fullPath: '/dashboard'; preLoaderRoute: typeof DashboardRouteImport; parentRoute: typeof rootRouteImport }
    '/gallery': { id: '/gallery'; path: '/gallery'; fullPath: '/gallery'; preLoaderRoute: typeof GalleryRouteImport; parentRoute: typeof rootRouteImport }
    '/hall-of-fame': { id: '/hall-of-fame'; path: '/hall-of-fame'; fullPath: '/hall-of-fame'; preLoaderRoute: typeof HallOfFameRouteImport; parentRoute: typeof rootRouteImport }
    '/history': { id: '/history'; path: '/history'; fullPath: '/history'; preLoaderRoute: typeof HistoryRouteImport; parentRoute: typeof rootRouteImport }
    '/members': { id: '/members'; path: '/members'; fullPath: '/members'; preLoaderRoute: typeof MembersRouteImport; parentRoute: typeof rootRouteImport }
    '/profile': { id: '/profile'; path: '/profile'; fullPath: '/profile'; preLoaderRoute: typeof ProfileRouteImport; parentRoute: typeof rootRouteImport }
    '/reset-password': { id: '/reset-password'; path: '/reset-password'; fullPath: '/reset-password'; preLoaderRoute: typeof ResetPasswordRouteImport; parentRoute: typeof rootRouteImport }
    '/tournaments': { id: '/tournaments'; path: '/tournaments'; fullPath: '/tournaments'; preLoaderRoute: typeof TournamentsRouteImport; parentRoute: typeof rootRouteImport }
    '/platform': { id: '/platform'; path: '/platform'; fullPath: '/platform'; preLoaderRoute: typeof PlatformRouteImport; parentRoute: typeof rootRouteImport }
    '/auth/': { id: '/auth/'; path: '/auth'; fullPath: '/auth/'; preLoaderRoute: typeof AuthIndexRouteImport; parentRoute: typeof rootRouteImport }
    '/auth/verify': { id: '/auth/verify'; path: '/auth/verify'; fullPath: '/auth/verify'; preLoaderRoute: typeof AuthVerifyRouteImport; parentRoute: typeof rootRouteImport }
    '/members/$id': { id: '/members/$id'; path: '/$id'; fullPath: '/members/$id'; preLoaderRoute: typeof MembersIdRouteImport; parentRoute: typeof MembersRoute }
    '/tournaments/$id': { id: '/tournaments/$id'; path: '/$id'; fullPath: '/tournaments/$id'; preLoaderRoute: typeof TournamentsIdRouteImport; parentRoute: typeof TournamentsRoute }
    '/admin/tournaments/$id': { id: '/admin/tournaments/$id'; path: '/admin/tournaments/$id'; fullPath: '/admin/tournaments/$id'; preLoaderRoute: typeof AdminTournamentsIdRouteImport; parentRoute: typeof rootRouteImport }
    '/o/$slug': { id: '/o/$slug'; path: '/o/$slug'; fullPath: '/o/$slug'; preLoaderRoute: typeof OSlugRouteImport; parentRoute: typeof rootRouteImport }
    '/invite/$token': { id: '/invite/$token'; path: '/invite/$token'; fullPath: '/invite/$token'; preLoaderRoute: typeof InviteTokenRouteImport; parentRoute: typeof rootRouteImport }
    '/games': { id: '/games'; path: '/games'; fullPath: '/games'; preLoaderRoute: typeof GamesRouteImport; parentRoute: typeof rootRouteImport }
    '/games/': { id: '/games/'; path: '/'; fullPath: '/games/'; preLoaderRoute: typeof GamesIndexRouteImport; parentRoute: typeof GamesRoute }
    '/following': { id: '/following'; path: '/following'; fullPath: '/following'; preLoaderRoute: typeof FollowingRouteImport; parentRoute: typeof rootRouteImport }
    '/organizers': { id: '/organizers'; path: '/organizers'; fullPath: '/organizers'; preLoaderRoute: typeof OrganizersRouteImport; parentRoute: typeof rootRouteImport }
    '/ownership': { id: '/ownership'; path: '/ownership'; fullPath: '/ownership'; preLoaderRoute: typeof OwnershipRouteImport; parentRoute: typeof rootRouteImport }
    '/users': { id: '/users'; path: '/users'; fullPath: '/users'; preLoaderRoute: typeof UsersRouteImport; parentRoute: typeof rootRouteImport }
    '/games/blind-ranking': { id: '/games/blind-ranking'; path: '/blind-ranking'; fullPath: '/games/blind-ranking'; preLoaderRoute: typeof GamesBlindRankingRouteImport; parentRoute: typeof GamesRoute }
    '/games/penalty': { id: '/games/penalty'; path: '/penalty'; fullPath: '/games/penalty'; preLoaderRoute: typeof GamesPenaltyRouteImport; parentRoute: typeof GamesRoute }
    '/games/higher-lower': { id: '/games/higher-lower'; path: '/higher-lower'; fullPath: '/games/higher-lower'; preLoaderRoute: typeof GamesHigherLowerRouteImport; parentRoute: typeof GamesRoute }
    '/vote/goat': { id: '/vote/goat'; path: '/vote/goat'; fullPath: '/vote/goat'; preLoaderRoute: typeof VoteGoatRouteImport; parentRoute: typeof rootRouteImport }
    '/music': { id: '/music'; path: '/music'; fullPath: '/music'; preLoaderRoute: typeof MusicRouteImport; parentRoute: typeof rootRouteImport }
    '/settings': { id: '/settings'; path: '/settings'; fullPath: '/settings'; preLoaderRoute: typeof SettingsRouteImport; parentRoute: typeof rootRouteImport }
    '/become-organizer': { id: '/become-organizer'; path: '/become-organizer'; fullPath: '/become-organizer'; preLoaderRoute: typeof BecomeOrganizerRouteImport; parentRoute: typeof rootRouteImport }
    '/messages': { id: '/messages'; path: '/messages'; fullPath: '/messages'; preLoaderRoute: typeof MessagesRouteImport; parentRoute: typeof rootRouteImport }
    '/feed': { id: '/feed'; path: '/feed'; fullPath: '/feed'; preLoaderRoute: typeof FeedRouteImport; parentRoute: typeof rootRouteImport }
  }
}

interface MembersRouteChildren { MembersIdRoute: typeof MembersIdRoute }
const MembersRouteChildren: MembersRouteChildren = { MembersIdRoute: MembersIdRoute }
const MembersRouteWithChildren = MembersRoute._addFileChildren(MembersRouteChildren)

interface TournamentsRouteChildren { TournamentsIdRoute: typeof TournamentsIdRoute }
const TournamentsRouteChildren: TournamentsRouteChildren = { TournamentsIdRoute: TournamentsIdRoute }
const TournamentsRouteWithChildren = TournamentsRoute._addFileChildren(TournamentsRouteChildren)

interface GamesRouteChildren {
  GamesIndexRoute: typeof GamesIndexRoute
  GamesBlindRankingRoute: typeof GamesBlindRankingRoute
  GamesPenaltyRoute: typeof GamesPenaltyRoute
  GamesHigherLowerRoute: typeof GamesHigherLowerRoute
}
const GamesRouteChildren: GamesRouteChildren = {
  GamesIndexRoute: GamesIndexRoute,
  GamesBlindRankingRoute: GamesBlindRankingRoute,
  GamesPenaltyRoute: GamesPenaltyRoute,
  GamesHigherLowerRoute: GamesHigherLowerRoute,
}
const GamesRouteWithChildren = GamesRoute._addFileChildren(GamesRouteChildren)

const rootRouteChildren: RootRouteChildren = {
  IndexRoute,
  AboutRoute,
  DashboardRoute,
  GalleryRoute,
  HallOfFameRoute,
  HistoryRoute,
  MembersRoute: MembersRouteWithChildren,
  ProfileRoute,
  ResetPasswordRoute,
  TournamentsRoute: TournamentsRouteWithChildren,
  PlatformRoute,
  AuthVerifyRoute,
  AuthIndexRoute,
  AdminTournamentsIdRoute,
  OSlugRoute,
  InviteTokenRoute,
  GamesRoute: GamesRouteWithChildren,
  FollowingRoute,
  OrganizersRoute,
  OwnershipRoute,
  UsersRoute,
  VoteGoatRoute,
  MusicRoute,
  SettingsRoute,
  BecomeOrganizerRoute,
  MessagesRoute,
  FeedRoute,
}
export const routeTree = rootRouteImport
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()
