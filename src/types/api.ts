export type SourceKind = 'text' | 'url' | 'file'

export type SourceStatus = 'inited' | 'uploading' | 'preparing' | 'ready' | 'failed'

export interface SourceParsedContent {
  url?: string
}

export interface ApiResult<T> {
  code: number
  msg: string
  data: T
}

export type AuthLoginProvider = 'github'

export type AuthLoginFrom = 'web'

export interface AuthProvider {
  name: string
}

export interface AuthProvidersResponse {
  providers: AuthProvider[]
  /**
   * 后端是否启用「邮箱 + 密码」登录（users_v2 改造新增）。
   * 字段缺失（旧后端）时前端不渲染密码表单，保持只走三方登录。
   */
  password_enabled?: boolean
}

/** 登录 / 验证成功后后端返回的账号标识（`data.user_id`）。 */
export interface AuthSessionResponse {
  user_id: string
}

/** GET /api/v1/auth/identities —— 当前账号已绑定的三方身份。 */
export interface AuthIdentity {
  /** 绑定记录 id（后端较新构建才有）；后续解绑/审计会用到。 */
  bind_id?: string
  provider: string
  /** provider 侧邮箱快照（仅审计，不参与判定）。 */
  provider_email: string
  provider_email_verified: boolean
  /** 绑定时间（unix ms）。 */
  bound_at: number
  /** 最近一次通过该身份登录的时间（unix ms），0 = 还没用过。 */
  last_login_at: number
}

export interface AuthIdentitiesResponse {
  identities: AuthIdentity[]
}

/** GET /api/v1/auth/supported-identities —— 代码支持绑定的 provider 列表。 */
export interface AuthSupportedIdentity {
  provider: string
}

export interface AuthSupportedIdentitiesResponse {
  identities: AuthSupportedIdentity[]
}

export interface MeResponse {
  user_id: string
  nickname: string
  /**
   * 账号邮箱（users_v2 里是账号的唯一权威标识）。
   * 后端较新的构建才返回；旧构建缺失时相关只读行整体不渲染。
   */
  email?: string
  /** 头像公开地址；用户未设置头像时后端返回空串。 */
  avatar_url: string
  /**
   * 本次登录方式：`password`（邮箱密码）、`email`（邮箱验证建号）或 provider 名。
   * 旧会话缺该字段时后端会退回最早绑定的身份。
   */
  login_source?: string
  /**
   * 账号是否已有密码（users_v2 改造新增，P0）。
   * 字段缺失（旧后端）时按「未知」处理：不做设置密码的引导。
   */
  has_password?: boolean
}

/** POST /api/v1/auth/login —— 邮箱密码登录（与 GET 同路径不同方法）。 */
export interface PasswordLoginRequest {
  email: string
  password: string
  /** 与 GET 的 login_from 同义；web 端固定 web。 */
  login_from?: AuthLoginFrom
}

/** POST /api/v1/auth/email/register —— 需要验证时只写 pending；免验证时直接建号并签发会话。 */
export interface EmailRegisterRequest {
  email: string
  password: string
}

/**
 * GET /api/v1/auth/prefetch 的响应：注册页、设置/修改密码、找回密码共用的服务端元数据。
 * require_complex_password=true 时，密码除长度下限外还必须同时含大写字母、小写字母与数字。
 *
 * 后端 2026-10-14 把原来注册页 / 重置页两个 prefetch 接口合并成这一个（Go 侧
 * `AuthPrefetchResponse`），字段不变。
 */
export interface AuthPrefetchResponse {
  require_complex_password: boolean
}

/**
 * POST /api/v1/auth/email/register 的响应。
 * email_verified=true：后端免验证模式（auth.emailVerificationRequired=false），账号已建好并签发会话；
 * false：账号要等验证信里的链接/验证码通过后才建立。
 */
export interface EmailRegisterResponse {
  email_verified: boolean
  user_id?: string
}

/** POST /api/v1/auth/email/verify/code —— 用 6 位验证码验证，语义同链接验证。 */
export interface EmailVerifyCodeRequest {
  email: string
  code: string
}

/** POST /api/v1/auth/email/resend —— 只重置两条验证凭证，不动密码与注册票据。 */
export interface EmailResendRequest {
  email: string
}

/** PUT /api/v1/auth/password —— 已认证会话设置/修改密码。 */
export interface SetPasswordRequest {
  /** 账号已有密码时必填；无密码（三方首登建的号）时省略。 */
  old_password?: string
  new_password: string
}

/**
 * PUT /api/v1/auth/password 的响应（200，不再是 204）。
 *
 * 后端保存密码后会作废该账号全部会话（含当前这一个）并清掉会话 cookie，
 * 前端据此把用户送回登录页，而不是留在一个已经失效的界面上。
 */
export interface SetPasswordResponse {
  relogin_required: boolean
}

/**
 * POST /api/v1/auth/password/reset —— 发起找回密码。
 *
 * 防账号枚举：邮箱没注册时后端**同样**返回 204、不发信、不写 pending，
 * 所以前端无法（也不该）据此判断邮箱是否存在，成功态文案必须保持中性。
 */
export interface PasswordResetRequest {
  email: string
}

/** POST /api/v1/auth/password/reset/verify —— 用邮件链接的 token 重置密码。 */
export interface PasswordResetConfirmLinkRequest {
  token: string
  new_password: string
}

/**
 * 上面两个确认接口的响应：后端 `PasswordResetConfirmResult` 恒返回
 * `relogin_required: true`（重置成功即作废该账号全部会话，含当前）。
 */
export interface PasswordResetConfirmResponse {
  relogin_required: boolean
}

/**
 * POST /api/v1/auth/identities/bind 请求体（authed + CSRF）。
 *
 * provider 走 body 而不是路径（后端 `BindProviderRequest`），取值必须落在
 * `entity.CheckProviderType` 的白名单里，否则 4xx 参数错误。
 */
export interface BindIdentityRequest {
  provider: string
  /** 授权完成后回到哪里；不传则后端落到站点根。 */
  return_to?: string
}

/**
 * POST /api/v1/auth/identities/unbind 请求体（authed + CSRF）。
 *
 * `bind_id` 取自 `/auth/identities` 的对应记录；`provider` 是交叉校验，必须与之一致。
 */
export interface UnbindIdentityRequest {
  bind_id: string
  provider: string
}

/** PATCH /api/v1/user/me 请求体；当前后端仅接受昵称。 */
export interface UpdateMeRequest {
  nickname: string
}

/** POST /api/v1/user/me/avatar 响应；返回转存后的头像直链。 */
export interface UpdateAvatarResponse {
  avatar_url: string
}

/** notebook 位标记；与 Get/List 的 flags 对象对齐。 */
export interface NotebookFlags {
  customize_description: boolean
}

/**
 * Get / List 共用的 notebook 视图。
 * `desc` 仅表示自定义摘要；未自定义时为空串（AI 摘要不落库）。
 */
export interface Notebook {
  id: string
  name: string
  desc: string
  flags: NotebookFlags
  source_count: number
  visibility?: string
  updated_at: number
  created_at?: number
  /** Get/List 均可附带；shared 列表用它展示分享者。 */
  owner?: NotebookOwnerSummary
  /**
   * 生效封面直链；pending key 永不外显，confirm 前返回旧封面直链。
   * 旧后端缺字段时为 undefined（视为无封面）。
   */
  cover_url?: string
}

/** @deprecated 与 Notebook 同形；保留别名避免调用处大面积改名。 */
export type NotebookSummary = Notebook

export type ListNotebooksSortBy = 'last_active' | 'create_time'

/** 首页列表范围：owned 与 shared 互斥（后端一次只返回一边）。 */
export type ListNotebooksScope = 'owned' | 'shared'

/** 列表项附带的 owner 概要；旧后端缺字段时为 undefined。 */
export interface NotebookOwnerSummary {
  user_id: string
  nickname: string
  avatar_url: string
}

/** 笔记本可见性：仅受邀成员 / 任何拿到链接的人。 */
export type NotebookVisibility = 'restricted' | 'public'

/** 成员表只允许这两种角色；owner 不在成员表里。 */
export type NotebookMemberRole = 'collaborator' | 'viewer'

/** GET /api/v1/notebooks/:id/access —— 当前账号对该笔记本的能力集合。 */
export interface NotebookAccess {
  role: string
  can_view: boolean
  can_manage_content: boolean
  can_manage_notebook: boolean
  can_manage_sharing: boolean
}

export interface NotebookSharingMember {
  user_id: string
  email: string
  nickname: string
  avatar_url: string
  role: NotebookMemberRole
}

/** GET /api/v1/notebooks/:id/sharing */
export interface GetNotebookSharingResponse {
  visibility: NotebookVisibility
  members: NotebookSharingMember[]
}

/** PATCH /api/v1/notebooks/:id/visibility */
export interface UpdateNotebookVisibilityRequest {
  visibility: NotebookVisibility
}

/** PUT /api/v1/notebooks/:id/sharing/members */
export interface UpsertNotebookMemberRequest {
  email: string
  role: NotebookMemberRole
}

export interface UpsertNotebookMemberResponse {
  user_id: string
  role: NotebookMemberRole
}

export interface NotebookSource {
  id: string
  kind: SourceKind
  status: SourceStatus
  title: string
  text?: {
    text: string
  }
  url?: {
    url: string
  }
  file?: {
    url: string
    filename: string
    format: string
  }
  parsed_content?: SourceParsedContent
}

export interface CreateNotebookRequest {
  name: string
}

export interface CreateNotebookResponse {
  id: string
}

/** POST /api/v1/notebooks/:id/cover/uploads 请求体；POST policy 精确钉 content-type 与长度区间。 */
export interface PresignCoverUploadRequest {
  content_type: string
  size: number
}

/** 封面 presign 响应为扁平结构：store_key + 对象存储直传配置（对齐 source 的上传形态）。 */
export interface PresignCoverUploadResponse {
  store_key: string
  url: string
  method?: string
  /** Go nil map 会序列化为 null，前端消费时必须容错。 */
  forms?: Record<string, string> | null
  /** Go nil map 会序列化为 null，前端消费时必须容错。 */
  headers?: Record<string, string> | null
}

/** POST /api/v1/notebooks/:id/cover/confirm 响应；confirm 成功即返回新封面直链。 */
export interface ConfirmCoverUploadResponse {
  cover_url: string
}

/** PATCH /api/v1/notebooks/:id —— name 与自定义摘要可同次提交。 */
export interface UpdateNotebookRequest {
  name?: string
  customize_description?: boolean
  desc?: string
}

export interface GenerateNotebookDescriptionResponse {
  desc: string
}

export interface ListNotebooksResponse {
  notebooks: NotebookSummary[]
  limit: number
  offset: number
  has_more: boolean
}

export interface GetNotebookChatResponse {
  chat_id: string
}

export interface ListNotebookSourcesResponse {
  sources: NotebookSource[]
  limit: number
  offset: number
  has_more: boolean
}

export interface CreateSourceRequest {
  kind: SourceKind
  text?: string
  url?: string
}

export interface CreateSourceResponse {
  id: string
}

export interface UploadFileSourceRequest {
  mime_type: string
  filename: string
  size: number
  md5: string
}

export interface UploadFileSourceResponse {
  url: string
  method: string
  forms?: Record<string, string>
  headers?: Record<string, string>
}

export interface PollSourceStatusResponse {
  status: SourceStatus
}

export interface SourceDocPosition {
  start?: number
  end?: number
  bytes_start?: number
  bytes_end?: number
}

export interface GetSourceDocResponse {
  source_id: string
  doc_id: string
  source_title: string
  content: string
  position?: SourceDocPosition
}

export type GetSourceResponse = NotebookSource

export interface GetSourceParsedContentResponse {
  url?: string
}

export type StudioArtifactKind =
  | 'mindmap'
  | 'report'
  | 'info_graphic'
  | 'audio_overview'
  | 'video_overview'
  | 'flashcard'
  | 'quiz'
  | 'data_table'
  | 'note'
  | 'slides'

export type StudioArtifactFlashcardCount = 'few' | 'default' | 'many'
export type StudioArtifactFlashcardDifficulty = 'easy' | 'medium' | 'hard'
export type StudioArtifactQuizCount = 'few' | 'default' | 'many'
export type StudioArtifactQuizDifficulty = 'easy' | 'medium' | 'hard'

export type StudioArtifactTaskStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'expired'

export type StudioArtifactContentKind = 'inline' | 'storage'

export type StudioArtifactInfoGraphicOrientation = 'portrait' | 'landscape' | 'square'
export type StudioArtifactInfoGraphicDetailLevel = 'concise' | 'standard' | 'detailed'
/**
 * Info graphic visual styles are backend-driven
 * (`GET /artifacts/style-previews?kind=info_graphic`). Known values keep
 * autocomplete; the open `(string & {})` member lets the backend add a style
 * without a frontend type change.
 */
export type StudioArtifactInfoGraphicVisualStyle =
  | 'default'
  | 'hand-drawn'
  | 'anime'
  | 'cute'
  | 'educational'
  | 'minimal-2.5d'
  | (string & {})
export type StudioArtifactAudioOverviewStyle =
  | 'deep-research'
  | 'abstract'
  | 'discussion'
  | 'debate'

export type StudioArtifactReportStyle =
  | 'default'
  | 'brief'
  | 'study-guide'
  | 'detailed'

/**
 * Slides visual styles are backend-driven (`GET /artifacts/style-previews`).
 * Known values keep autocomplete; the open `(string & {})` member lets the
 * backend add a style without a frontend type change.
 */
export type StudioArtifactSlidesVisualStyle =
  | 'default'
  | 'educational'
  | 'cute'
  | (string & {})
/**
 * Video overview visual styles are backend-driven
 * (`GET /artifacts/style-previews?kind=video_overview`). Known values keep
 * autocomplete; the open `(string & {})` member lets the backend add a style
 * without a frontend type change.
 */
export type StudioArtifactVideoOverviewVisualStyle =
  | 'default'
  | 'educational'
  | 'cute'
  | (string & {})

export interface GenerateMindmapParameters {
  tip?: string
}

export interface GenerateReportParameters {
  style?: StudioArtifactReportStyle
  language?: string
  tip?: string
}

export interface GenerateInfoGraphicParameters {
  orientation?: StudioArtifactInfoGraphicOrientation
  text_language?: string
  extra_prompt?: string
  detail_level?: StudioArtifactInfoGraphicDetailLevel
  visual_style?: StudioArtifactInfoGraphicVisualStyle
}

export interface GenerateAudioOverviewParameters {
  tip?: string
  language: string
  style?: StudioArtifactAudioOverviewStyle
}

export interface GenerateFlashcardParameters {
  count?: StudioArtifactFlashcardCount
  difficulty?: StudioArtifactFlashcardDifficulty
  tip?: string
}

export interface GenerateQuizParameters {
  count?: StudioArtifactQuizCount
  difficulty?: StudioArtifactQuizDifficulty
  tip?: string
}

export interface GenerateDataTableParameters {
  tip?: string
}

export interface GenerateSlidesParameters {
  tip?: string
  language?: string
  visual_style?: StudioArtifactSlidesVisualStyle
}

export interface GenerateVideoOverviewParameters {
  tip?: string
  language?: string
  visual_style?: StudioArtifactVideoOverviewVisualStyle
}

export interface MindmapArtifactExtras {
  tip?: string
}

export interface ReportArtifactExtras {
  style?: string
  language?: string
  tip?: string
}

export interface AudioOverviewArtifactExtras {
  tip?: string
  language?: string
  style?: string
  format?: string
  channels?: number
  sample_rate?: number
  duration_ms?: number
}

export interface InfoGraphicArtifactExtras {
  prompt?: string
  text_language?: string
  orientation?: StudioArtifactInfoGraphicOrientation
  detail_level?: StudioArtifactInfoGraphicDetailLevel
  visual_style?: StudioArtifactInfoGraphicVisualStyle
}

export interface FlashcardArtifactExtras {
  count?: string
  difficulty?: string
  tip?: string
}

export interface QuizArtifactExtras {
  count?: string
  difficulty?: string
  tip?: string
}

export interface DataTableArtifactExtras {
  tip?: string
}

export interface SlidesArtifactExtras {
  tip?: string
  language?: string
  visual_style?: StudioArtifactSlidesVisualStyle
}

export interface VideoOverviewArtifactExtras {
  tip?: string
  language?: string
  visual_style?: StudioArtifactVideoOverviewVisualStyle
}

export interface NoteArtifactExtras {
  chat_id?: string
  msg_id?: string
}

export interface GenerateNoteParameters {
  chat_id: string
  msg_id: string
}

export interface StudioArtifactImageInfo {
  width: number
  height: number
}

export interface GenerateStudioArtifactRequest {
  kind: StudioArtifactKind
  source_ids?: string[]
  mindmap?: GenerateMindmapParameters
  report?: GenerateReportParameters
  info_graphic?: GenerateInfoGraphicParameters
  audio_overview?: GenerateAudioOverviewParameters
  flashcard?: GenerateFlashcardParameters
  quiz?: GenerateQuizParameters
  data_table?: GenerateDataTableParameters
  slides?: GenerateSlidesParameters
  video_overview?: GenerateVideoOverviewParameters
  note?: GenerateNoteParameters
}

export interface GenerateStudioArtifactResponse {
  task_id: string
}

export type UpdateStudioArtifactTarget = 'title'

export interface UpdateStudioArtifactRequest {
  target: UpdateStudioArtifactTarget
  title: string
}

export interface GetStudioArtifactStatusResponse {
  task_id: string
  status: StudioArtifactTaskStatus
  timestamp?: number
}

export interface StudioArtifactResult {
  notebook_id: string
  task_id: string
  kind: StudioArtifactKind
  status: StudioArtifactTaskStatus
  title?: string
  source_ids?: string[]
  timestamp?: number
  content?: string
  content_url?: string
  content_kind: StudioArtifactContentKind
  mime_type?: string
  image_info?: StudioArtifactImageInfo
  extras?:
    | MindmapArtifactExtras
    | ReportArtifactExtras
    | InfoGraphicArtifactExtras
    | AudioOverviewArtifactExtras
    | FlashcardArtifactExtras
    | QuizArtifactExtras
    | DataTableArtifactExtras
    | SlidesArtifactExtras
    | NoteArtifactExtras
}

export interface ListNotebookStudioArtifactsResponse {
  artifacts: StudioArtifactResult[]
  limit: number
  offset: number
  has_more: boolean
}

/** One previewable style of an artifact kind. `preview_url` is empty when the
 * backend has no seeded preview image for the style. */
export interface StudioStylePreviewItem {
  visual_style: string
  preview_url: string
}

export interface ListStudioStylePreviewsResponse {
  kind: StudioArtifactKind
  /** Visual style the backend uses when the request omits `visual_style`. */
  default_visual_style: string
  previews: StudioStylePreviewItem[]
}

export interface ConvertNoteToSourceResponse {
  source_id: string
}

export type ChatMessageRole = 'user' | 'assistant'

export type FragmentType = 'REQUEST' | 'THINK' | 'PHASE' | 'RESPONSE'
export type FragmentStatus = 'RUNNING' | 'FINISHED'

export interface FragmentContentText {
  content: string
}

export interface FragmentContentUnion {
  type: 'text'
  text?: FragmentContentText
}

export interface FragmentRequest {
  content?: FragmentContentUnion
}

export interface FragmentThink {
  status: FragmentStatus
  content?: FragmentContentText
}

export interface FragmentPhase {
  status: FragmentStatus
  summary: string
  thought: string
}

export interface FragmentResponse {
  status: FragmentStatus
  content?: FragmentContentUnion
}

export interface MessageFragment {
  id: number
  type: FragmentType
  request?: FragmentRequest
  think?: FragmentThink
  phase?: FragmentPhase
  response?: FragmentResponse
}

export interface MessageCitation {
  doc_id: string
  source_id: string
}

export interface ChatMessage {
  id: string
  create_time: number
  update_time: number
  chat_id: string
  user_id: string
  role: ChatMessageRole
  fragments?: MessageFragment[]
  seq_no: number
  citations?: MessageCitation[]
}

export interface ChatCreateMessageRequest {
  id: string
  prompt: string
  source_ids?: string[]
  enable_thinking?: boolean
  style?: ChatStyle
  answer_length?: ChatAnswerLength
}

export interface ChatCreateMessageResponse {
  msg_id: string
  task_id: string
}

export interface ChatAbortStreamRequest {
  id: string
  task_id: string
}

export interface ChatListMessagesResponse {
  messages: ChatMessage[]
  limit: number
  has_more: boolean
  next_cursor: number
}

export interface ChatGetSuggestionsResponse {
  type: string
  questions: string[]
}

export interface ChatGetRunningTaskResponse {
  task_id: string
}

export type ChatStyle = 'default' | 'analyst' | 'guide'
export type ChatAnswerLength = 'default' | 'longer' | 'shorter'

export type EventAction = 'INIT' | 'APPEND' | 'SET' | 'NEW'

export type StreamEventTargetPath =
  | 'm'
  | 'm.citations'
  | 'm.f.tk'
  | 'm.f.tk.v'
  | 'm.f.tk.st'
  | 'm.f.rsp'
  | 'm.f.rsp.v'
  | 'm.f.rsp.st'
  | 'm.f.phase'

export interface StreamTaskEventThink {
  st?: FragmentStatus
  v?: string
}

export interface StreamTaskEventResponse {
  st?: FragmentStatus
  v?: FragmentContentUnion
}

export interface StreamTaskEventPhase {
  phase?: FragmentPhase
}

export interface StreamTaskEventError {
  message?: string
}

export interface StreamTaskEvent {
  id: string
  ct?: number
  op?: EventAction
  p?: StreamEventTargetPath
  idx?: number
  message?: ChatMessage
  citations?: MessageCitation[]
  tk?: StreamTaskEventThink
  rsp?: StreamTaskEventResponse
  phase?: StreamTaskEventPhase
  error?: StreamTaskEventError
  /** 流结束标记，与 error 二选一作为最后一个事件 */
  done?: boolean
}

export interface StreamHeartbeatEvent {
  heartbeat: string
}
