import { Navigate, createBrowserRouter } from 'react-router-dom'
import { AuthGate } from '../components/auth/AuthGate'
import { AUTH_ERROR_PATH, RESET_PASSWORD_PATH } from '../lib/auth'
import { AppRoot } from './AppRoot'
import { RouteErrorBoundary } from './RouteErrorBoundary'
import { AuthErrorPage } from '../pages/AuthErrorPage'
import { FavouriteDetailPage } from '../pages/FavouriteDetailPage'
import { FavouritesPage } from '../pages/FavouritesPage'
import { HomePage } from '../pages/HomePage'
import { LoginPage } from '../pages/LoginPage'
import { NotebookWorkspacePage } from '../pages/NotebookWorkspacePage'
import { ResetPasswordPage } from '../pages/ResetPasswordPage'
import { SetPasswordPage } from '../pages/SetPasswordPage'
import { SignupPage } from '../pages/SignupPage'
import { VerifyEmailPage } from '../pages/VerifyEmailPage'

export const router = createBrowserRouter([
  {
    // 无 path 的布局路由：所有页面共用一层，用来挂全局功能（当前是回调失败 toast）。
    element: <AppRoot />,
    // 根路由兜底：任何页面抛错都给可恢复界面，而不是白屏。
    errorElement: <RouteErrorBoundary />,
    children: [
    {
      path: '/login',
      element: <LoginPage />,
    },
    {
      path: '/signup',
      element: <SignupPage />,
    },
    // 验证页公开：链接可能在未登录的浏览器里打开，验证成功那一刻服务端才建号并签发会话。
    {
      path: '/verify-email',
      element: <VerifyEmailPage />,
    },
    // 找回密码页公开：用户正是因为登不进来才走这条路，邮件链接可能落在任何浏览器。
    {
      path: RESET_PASSWORD_PATH,
      element: <ResetPasswordPage />,
    },
    // 第三方回调失败的落地页（后端 302 过来）。公开：可能来自未登录的浏览器。
    {
      path: AUTH_ERROR_PATH,
      element: <AuthErrorPage />,
    },
    // 设置密码需要已认证会话（注册票据不匹配时的补救路径）。
    {
      path: '/set-password',
      element: (
        <AuthGate>
          <SetPasswordPage />
        </AuthGate>
      ),
    },
    {
      path: '/',
      element: (
        <AuthGate>
          <HomePage />
        </AuthGate>
      ),
    },
    {
      path: '/favourites',
      element: (
        <AuthGate>
          <FavouritesPage />
        </AuthGate>
      ),
    },
    {
      path: '/favourites/:favouriteId',
      element: (
        <AuthGate>
          <FavouriteDetailPage />
        </AuthGate>
      ),
    },
    {
      path: '/notebook/:id',
      element: (
        <AuthGate>
          <NotebookWorkspacePage />
        </AuthGate>
      ),
    },
    {
      path: '*',
      element: <Navigate to="/" replace />,
    },
    ],
  },
])
